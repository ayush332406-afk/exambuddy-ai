import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { requireAuth, requireAdmin, AuthenticatedRequest } from "./src/middleware/auth";
import { adminDb } from "./src/lib/firebase-admin";
import { db } from "./src/db/index";
import { users, subjects, notes, papers, quizzes, studyTasks, assignments } from "./src/db/schema";
import { eq, desc, and, ilike, sql } from "drizzle-orm";

async function triggerFirestoreSync(collection: string) {
  try {
    await adminDb.collection('app_sync').doc('latest').set({
      [collection]: Date.now(),
      lastUpdated: Date.now()
    }, { merge: true });
  } catch (err) {
    console.error("Failed to trigger Firestore sync:", err);
  }
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDFs are allowed'));
    }
  }
});

const uploadMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds the 25MB limit' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

async function processPdfBackground(filePath: string, recordId: number, tableType: 'notes' | 'papers') {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const textData = await parser.getText();
    const parsedText = textData.text;
    const base64Data = dataBuffer.toString('base64');

    if (tableType === 'notes') {
      await db.update(notes).set({ parsedText }).where(eq(notes.id, recordId));
      await db.execute(sql`UPDATE notes SET file_data = ${base64Data} WHERE id = ${recordId}`);
    } else {
      await db.update(papers).set({ parsedText }).where(eq(papers.id, recordId));
      await db.execute(sql`UPDATE papers SET file_data = ${base64Data} WHERE id = ${recordId}`);
    }
    console.log(`Successfully parsed and stored PDF text and data for ${tableType} ${recordId}`);
  } catch (err) {
    console.error(`Failed to parse PDF for ${tableType} ${recordId}:`, err);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Body parsing middleware
  app.use(express.json({ limit: '50mb' }));
  
  // Serve uploaded files statically or from database
  app.get('/uploads/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    const fileUrl = `/uploads/${filename}`;
    
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    
    try {
      // Check database
      const noteRec = await db.execute(sql`SELECT file_data FROM notes WHERE file_url = ${fileUrl} LIMIT 1`);
      if (noteRec.rows && noteRec.rows.length > 0 && noteRec.rows[0].file_data) {
        const base64Data = noteRec.rows[0].file_data as string;
        const buffer = Buffer.from(base64Data, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        return res.send(buffer);
      }
      
      const paperRec = await db.execute(sql`SELECT file_data FROM papers WHERE file_url = ${fileUrl} LIMIT 1`);
      if (paperRec.rows && paperRec.rows.length > 0 && paperRec.rows[0].file_data) {
        const base64Data = paperRec.rows[0].file_data as string;
        const buffer = Buffer.from(base64Data, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        return res.send(buffer);
      }
      
      const assignmentRec = await db.execute(sql`SELECT file_data FROM assignments WHERE file_url = ${fileUrl} LIMIT 1`);
      if (assignmentRec.rows && assignmentRec.rows.length > 0 && assignmentRec.rows[0].file_data) {
        const base64Data = assignmentRec.rows[0].file_data as string;
        const buffer = Buffer.from(base64Data, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        return res.send(buffer);
      }
      
      res.status(404).send('File not found');
    } catch (e) {
      console.error(e);
      res.status(500).send('Internal Server Error');
    }
  });

  // API Routes will go here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get current user profile
  app.get("/api/users/me", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      if (!user.length) return res.status(404).json({ error: "User not found" });
      
      let currentUser = user[0];
      const normalizedEmail = req.user?.email?.trim().toLowerCase();
      const targetRole = normalizedEmail === "ayush332406@gmail.com" ? "admin" : "student";
      
      if (currentUser.role !== targetRole) {
        const updatedUser = await db.update(users).set({ role: targetRole }).where(eq(users.id, currentUser.id)).returning();
        currentUser = updatedUser[0];
      }
      
      console.log("Authenticated email:", req.user?.email);
      console.log("Assigned role:", targetRole);
      console.log("Current user profile:", currentUser);
      
      res.json(currentUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Get subjects (optionally filtered by semester)
  app.get("/api/subjects", async (req: express.Request, res) => {
    try {
      const { semester } = req.query;
      let query = db.select().from(subjects);
      
      const allSubjects = await query;
      res.json(allSubjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  });

  // Users API
  app.get("/api/users", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      await db.delete(users).where(eq(users.id, userId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Subjects API
  app.post("/api/subjects", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, code, semester, examDate } = req.body;
      if (!name || !code || !semester) return res.status(400).json({ error: "Missing fields" });
      
      let newDate = null;
      if (examDate) {
        let dateString = examDate;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
           dateString += 'T12:00:00Z';
        }
        newDate = new Date(dateString);
        if (isNaN(newDate.getTime())) {
          return res.status(400).json({ error: "Invalid date format" });
        }
      }
      
      const newSubject = await db.insert(subjects).values({ name, code, semester: parseInt(semester), examDate: newDate }).returning();
      await triggerFirestoreSync('subjects');
      res.status(201).json(newSubject[0]);
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(500).json({ error: "Failed to create subject" });
    }
  });

  app.put("/api/subjects/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const subjectId = parseInt(req.params.id);
      const { name, code, semester, examDate } = req.body;
      
      console.log(`\n--- BACKEND RECEIVED ---`);
      console.log(`3. Value received by the backend (req.body.examDate):`, examDate);
      
      let updatedDate = null;
      if (examDate) {
        // Ensure consistent date parsing and avoid timezone offset issues
        // If it's a date-only string (YYYY-MM-DD), append T12:00:00Z so it falls on the same calendar day in almost all timezones
        let dateString = examDate;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
           dateString += 'T12:00:00Z';
        }
        updatedDate = new Date(dateString);
        if (isNaN(updatedDate.getTime())) {
          console.error("Invalid date received:", examDate);
          return res.status(400).json({ error: "Invalid date format" });
        }
      }
      
      console.log(`4. Value to save to DB (parsed Date):`, updatedDate);

      const updatedSubject = await db.update(subjects)
        .set({ name, code, semester: parseInt(semester), examDate: updatedDate })
        .where(eq(subjects.id, subjectId))
        .returning();
      
      console.log(`5. Value saved to database (returned from query):`, updatedSubject[0].examDate);
      console.log(`--- END BACKEND ---\n`);
      
      await triggerFirestoreSync('subjects');
      res.json(updatedSubject[0]);
    } catch (error) {
      console.error("Error updating subject:", error);
      res.status(500).json({ error: "Failed to update subject" });
    }
  });

  app.delete("/api/subjects/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const subjectId = parseInt(req.params.id);
      await db.delete(subjects).where(eq(subjects.id, subjectId));
      await triggerFirestoreSync('subjects');
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting subject:", error);
      res.status(500).json({ error: "Failed to delete subject" });
    }
  });

  // Notes API
  app.delete("/api/notes/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const noteId = parseInt(req.params.id);
      await db.delete(notes).where(eq(notes.id, noteId));
      await triggerFirestoreSync('notes');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  app.put("/api/notes/:id", requireAdmin, uploadMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const noteId = parseInt(req.params.id);
      const { title, subjectId, description } = req.body;
      const file = req.file;
      
      const updateData: any = { title, subjectId: parseInt(subjectId), description };
      if (file) {
        updateData.fileUrl = `/uploads/${file.filename}`;
        updateData.fileSize = file.size;
      }
      
      const updatedNote = await db.update(notes).set(updateData).where(eq(notes.id, noteId)).returning();
      await triggerFirestoreSync('notes');
      res.json(updatedNote[0]);
    } catch (error) {
      console.error("Error updating note:", error);
      res.status(500).json({ error: "Failed to update note" });
    }
  });

  app.get("/api/notes", async (req: express.Request, res) => {
    try {
      // For MVP, fetch all notes for the authenticated user, joined with subjects
      const userNotes = await db.select({
        id: notes.id,
        title: notes.title,
        fileUrl: notes.fileUrl,
        fileSize: notes.fileSize,
        description: notes.description,
        createdAt: notes.createdAt,
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          semester: subjects.semester
        }
      })
      .from(notes)
      .innerJoin(subjects, eq(notes.subjectId, subjects.id))
      .orderBy(desc(notes.createdAt));

      res.json(userNotes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  app.post("/api/notes", requireAdmin, uploadMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      const { title, subjectId, description } = req.body;
      if (!title || !subjectId) {
        return res.status(400).json({ error: "Title and subjectId are required" });
      }

      const user = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      if (!user.length) return res.status(404).json({ error: "User not found" });

      const fileUrl = `/uploads/${req.file.filename}`;

      const newNote = await db.insert(notes).values({
        userId: user[0].id,
        title,
        subjectId: parseInt(subjectId),
        fileUrl,
        fileSize: req.file.size,
        description: description || null,
      }).returning();

      // Trigger background parsing
      processPdfBackground(req.file.path, newNote[0].id, 'notes');

      await triggerFirestoreSync('notes');
      res.status(201).json({ note: newNote[0] });
    } catch (error) {
      console.error("Error uploading note:", error);
      res.status(500).json({ error: "Failed to upload note" });
    }
  });

  // Papers API
  app.delete("/api/papers/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const paperId = parseInt(req.params.id);
      await db.delete(papers).where(eq(papers.id, paperId));
      await triggerFirestoreSync('papers');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete paper" });
    }
  });

  app.put("/api/papers/:id", requireAdmin, uploadMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const paperId = parseInt(req.params.id);
      const { title, subjectId, year, description } = req.body;
      const file = req.file;
      
      const updateData: any = { title, subjectId: parseInt(subjectId), year: parseInt(year), description };
      if (file) {
        updateData.fileUrl = `/uploads/${file.filename}`;
        updateData.fileSize = file.size;
      }
      
      const updatedPaper = await db.update(papers).set(updateData).where(eq(papers.id, paperId)).returning();
      await triggerFirestoreSync('papers');
      res.json(updatedPaper[0]);
    } catch (error) {
      console.error("Error updating paper:", error);
      res.status(500).json({ error: "Failed to update paper" });
    }
  });

  app.get("/api/papers", async (req: express.Request, res) => {
    try {
      const userPapers = await db.select({
        id: papers.id,
        title: papers.title,
        year: papers.year,
        fileUrl: papers.fileUrl,
        fileSize: papers.fileSize,
        description: papers.description,
        createdAt: papers.createdAt,
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          semester: subjects.semester
        }
      })
      .from(papers)
      .innerJoin(subjects, eq(papers.subjectId, subjects.id))
      .orderBy(desc(papers.year), desc(papers.createdAt));

      res.json(userPapers);
    } catch (error) {
      console.error("Error fetching papers:", error);
      res.status(500).json({ error: "Failed to fetch papers" });
    }
  });

  app.post("/api/papers", requireAdmin, uploadMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      const { title, subjectId, year, description } = req.body;
      if (!title || !subjectId || !year) {
        return res.status(400).json({ error: "Title, subjectId, and year are required" });
      }

      const user = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      if (!user.length) return res.status(404).json({ error: "User not found" });

      const fileUrl = `/uploads/${req.file.filename}`;

      const newPaper = await db.insert(papers).values({
        userId: user[0].id,
        title,
        subjectId: parseInt(subjectId),
        year: parseInt(year),
        fileUrl,
        fileSize: req.file.size,
        description: description || null,
      }).returning();

      // Trigger background parsing
      processPdfBackground(req.file.path, newPaper[0].id, 'papers');

      await triggerFirestoreSync('papers');
      res.status(201).json({ paper: newPaper[0] });
    } catch (error) {
      console.error("Error uploading paper:", error);
      res.status(500).json({ error: "Failed to upload paper" });
    }
  });

  // Assignments API
  app.delete("/api/assignments/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      await db.delete(assignments).where(eq(assignments.id, assignmentId));
      await triggerFirestoreSync('assignments');
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  app.put("/api/assignments/:id", requireAdmin, uploadMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const { title, subjectId, description, dueDate } = req.body;
      const file = req.file;
      
      const updateData: any = { title, subjectId: parseInt(subjectId), description };
      if (dueDate && dueDate !== 'null' && dueDate !== 'undefined') {
         updateData.dueDate = new Date(dueDate);
      } else {
         updateData.dueDate = null;
      }
      if (file) {
        updateData.fileUrl = `/uploads/${file.filename}`;
        updateData.fileName = file.originalname;
        updateData.fileSize = file.size;
        const dataBuffer = fs.readFileSync(file.path);
        updateData.fileData = dataBuffer.toString('base64');
      }
      
      const updatedAssignment = await db.update(assignments).set(updateData).where(eq(assignments.id, assignmentId)).returning();
      await triggerFirestoreSync('assignments');
      res.json(updatedAssignment[0]);
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });

  app.get("/api/assignments", async (req: express.Request, res) => {
    try {
      const allAssignments = await db.select({
        id: assignments.id,
        title: assignments.title,
        fileUrl: assignments.fileUrl,
        fileName: assignments.fileName,
        fileSize: assignments.fileSize,
        description: assignments.description,
        dueDate: assignments.dueDate,
        createdAt: assignments.createdAt,
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          semester: subjects.semester
        }
      })
      .from(assignments)
      .innerJoin(subjects, eq(assignments.subjectId, subjects.id))
      .orderBy(desc(assignments.createdAt));

      res.json(allAssignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  app.post("/api/assignments", requireAdmin, uploadMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { title, subjectId, description, dueDate } = req.body;
      if (!title || !subjectId) {
        return res.status(400).json({ error: "Title and subjectId are required" });
      }

      const user = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      if (!user.length) return res.status(404).json({ error: "User not found" });

      const fileUrl = `/uploads/${req.file.filename}`;
      const dataBuffer = fs.readFileSync(req.file.path);
      const base64Data = dataBuffer.toString('base64');

      const insertData: any = {
        userId: user[0].id,
        title,
        subjectId: parseInt(subjectId),
        fileUrl,
        fileData: base64Data,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        description: description || null,
      };

      if (dueDate && dueDate !== 'null' && dueDate !== 'undefined') {
         insertData.dueDate = new Date(dueDate);
      }

      const newAssignment = await db.insert(assignments).values(insertData).returning();

      await triggerFirestoreSync('assignments');
      res.status(201).json({ assignment: newAssignment[0] });
    } catch (error) {
      console.error("Error uploading assignment:", error);
      res.status(500).json({ error: "Failed to upload assignment" });
    }
  });

  // User Management API
  app.get("/api/users", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      const updatedUser = await db.update(users).set({ role }).where(eq(users.id, userId)).returning();
      await triggerFirestoreSync('users');
      res.json(updatedUser[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  // AI API
  app.post("/api/notes/:id/ai", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { action } = req.body;
      const noteId = parseInt(req.params.id);

      const userDb = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      if (!userDb.length) return res.status(404).json({ error: "User not found" });

      const noteRecord = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
      if (!noteRecord.length) return res.status(404).json({ error: "Note not found" });

      let textContent = noteRecord[0].parsedText;

      if (!textContent) {
        // Fallback for legacy notes or if background parsing isn't finished/failed
        const filePath = path.join(process.cwd(), noteRecord[0].fileUrl);
        let dataBuffer: Buffer;
        if (fs.existsSync(filePath)) {
          dataBuffer = fs.readFileSync(filePath);
        } else {
          const noteRec = await db.execute(sql`SELECT file_data FROM notes WHERE id = ${noteId} LIMIT 1`);
          if (noteRec.rows && noteRec.rows.length > 0 && noteRec.rows[0].file_data) {
            dataBuffer = Buffer.from(noteRec.rows[0].file_data as string, 'base64');
          } else {
             throw new Error("File not found on disk or database");
          }
        }
        
        const parser = new PDFParse({ data: dataBuffer });
        const textData = await parser.getText();
        textContent = textData.text;
        
        // Save back to db for future use
        await db.update(notes).set({ parsedText: textContent }).where(eq(notes.id, noteId));
      }

      let prompt = "";
      let systemInstruction = "";
      let responseSchema = undefined;
      const MAX_CHARS = 100000;

      if (action === 'summary') {
        systemInstruction = "You are an expert tutor. Summarize the provided academic notes clearly and concisely, focusing on key concepts. Use markdown formatting.";
        prompt = `Summarize the following notes:\n\n${textContent.substring(0, MAX_CHARS)}`;
      } else if (action === 'questions') {
        systemInstruction = "You are an expert tutor. Extract the 5 most important potential exam questions from the provided notes. Use markdown formatting.";
        prompt = `Extract important questions from these notes:\n\n${textContent.substring(0, MAX_CHARS)}`;
      } else if (action === 'quiz') {
        systemInstruction = "You are an expert quiz generator. Generate a 5-question multiple choice quiz based on the provided notes.";
        prompt = `Generate a 5-question MCQ quiz from these notes:\n\n${textContent.substring(0, MAX_CHARS)}`;
        responseSchema = {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.STRING, description: "The exact string from the options array that is correct." },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer", "explanation"]
          }
        };
      } else {
        return res.status(400).json({ error: "Invalid action" });
      }

      const aiOptions: any = {
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          systemInstruction,
        }
      };
      
      if (responseSchema) {
        aiOptions.config.responseMimeType = "application/json";
        aiOptions.config.responseSchema = responseSchema;
      }

      const aiRes = await ai.models.generateContent(aiOptions);
      const resultText = aiRes.text;

      res.json({ result: responseSchema ? JSON.parse(resultText!) : resultText });
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to generate AI insights" });
    }
  });

  // Quiz API
  app.post("/api/quizzes", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { noteId, score, totalQuestions } = req.body;
      
      const userDb = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      if (!userDb.length) return res.status(404).json({ error: "User not found" });

      const newQuiz = await db.insert(quizzes).values({
        userId: userDb[0].id,
        noteId: parseInt(noteId),
        score: parseInt(score),
        totalQuestions: parseInt(totalQuestions)
      }).returning();
      await triggerFirestoreSync('quizzes');
      res.status(201).json({ quiz: newQuiz[0] });
    } catch (error) {
      console.error("Error saving quiz score:", error);
      res.status(500).json({ error: "Failed to save quiz score" });
    }
  });

  app.get("/api/quizzes", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userDb = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      if (!userDb.length) return res.status(404).json({ error: "User not found" });

      const userQuizzes = await db.select({
        id: quizzes.id,
        score: quizzes.score,
        totalQuestions: quizzes.totalQuestions,
        createdAt: quizzes.createdAt,
        noteTitle: notes.title,
        subjectName: subjects.name
      })
      .from(quizzes)
      .innerJoin(notes, eq(quizzes.noteId, notes.id))
      .innerJoin(subjects, eq(notes.subjectId, subjects.id))
      .where(eq(quizzes.userId, userDb[0].id))
      .orderBy(desc(quizzes.createdAt));

      const formattedQuizzes = userQuizzes.map(q => ({
        id: q.id,
        score: q.score,
        totalQuestions: q.totalQuestions,
        createdAt: q.createdAt,
        note: {
          title: q.noteTitle,
          subject: {
            name: q.subjectName
          }
        }
      }));

      res.json(formattedQuizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      res.status(500).json({ error: "Failed to fetch quizzes" });
    }
  });

  // --- Study Tasks ---
  app.get("/api/tasks", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userDb = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      if (!userDb.length) return res.status(404).json({ error: "User not found" });

      const tasks = await db.select({
        id: studyTasks.id,
        title: studyTasks.title,
        dueDate: studyTasks.dueDate,
        completed: studyTasks.completed,
        subjectId: studyTasks.subjectId,
        subject: {
          name: subjects.name
        }
      })
      .from(studyTasks)
      .innerJoin(subjects, eq(studyTasks.subjectId, subjects.id))
      .where(eq(studyTasks.userId, userDb[0].id))
      .orderBy(studyTasks.dueDate);

      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userDb = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      if (!userDb.length) return res.status(404).json({ error: "User not found" });

      const { title, subjectId, dueDate } = req.body;
      if (!title || !subjectId || !dueDate) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const newTask = await db.insert(studyTasks).values({
        userId: userDb[0].id,
        title,
        subjectId: Number(subjectId),
        dueDate: new Date(dueDate),
        completed: 0
      }).returning();
      await triggerFirestoreSync('tasks');
      res.json(newTask[0]);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userDb = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      if (!userDb.length) return res.status(404).json({ error: "User not found" });

      const { completed } = req.body;
      const taskId = Number(req.params.id);

      const updatedTask = await db.update(studyTasks)
        .set({ completed: completed ? 1 : 0 })
        .where(and(eq(studyTasks.id, taskId), eq(studyTasks.userId, userDb[0].id)))
        .returning();
      await triggerFirestoreSync('tasks');
      res.json(updatedTask[0]);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Sync Firebase User to PostgreSQL Database
  app.post("/api/auth/sync", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { uid, email } = req.user!;
      const name = req.body.name || req.user!.name || "Student";
      
      const normalizedEmail = req.user?.email?.trim().toLowerCase();
      const targetRole = normalizedEmail === "ayush332406@gmail.com" ? "admin" : "student";

      // Check if user exists
      const existingUser = await db.select().from(users).where(eq(users.uid, uid)).limit(1);

      let currentUser;
      if (existingUser.length > 0) {
        if (existingUser[0].role !== targetRole) {
          const updatedUser = await db.update(users).set({ role: targetRole }).where(eq(users.id, existingUser[0].id)).returning();
          currentUser = updatedUser[0];
        } else {
          currentUser = existingUser[0];
        }
      } else {
        // Insert new user
        const newUser = await db.insert(users).values({
          uid,
          email,
          name,
          role: targetRole,
        }).returning();
        currentUser = newUser[0];
      }

      console.log("Authenticated email:", req.user?.email);
      console.log("Assigned role:", targetRole);
      console.log("Current user profile:", currentUser);

      res.json({ user: currentUser });
    } catch (error) {
      console.error("Error syncing user:", error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
