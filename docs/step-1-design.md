# BCA ExamBuddy - Software Requirements and Design

## 1. Software Requirements Specification (SRS)
### Purpose
BCA ExamBuddy is an AI-powered exam preparation platform designed to help college students prepare for semester exams through notes management, previous year papers, and AI-generated quizzes and summaries.

### Scope
- **Student Authentication:** Secure login using Firebase Authentication (Google Sign-In).
- **Target Audience:** Exclusively for BCA students.
- **Notes Management:** Upload, download, categorize (by Sem 1 & 2 subjects), and search PDF notes.
- **Previous Year Papers:** Centralized repository for subject and year-wise papers for Sem 1 & 2.
- **AI Question Generator:** Use Gemini API to summarize notes, extract important questions, and generate MCQs.
- **Quiz System:** Timed quizzes generated from notes with auto-scoring and score history.
- **Dashboard:** Unified dashboard displaying profile, recent notes, quiz scores, and exam countdowns.

### Architecture Adjustments
- **Database:** PostgreSQL via Cloud SQL (replacing MySQL for compatibility with AI Studio's Cloud SQL skill).
- **Authentication:** Firebase Authentication (replaces custom JWT, adhering to platform security standards).

## 2. System Architecture
- **Frontend:** React.js + Tailwind CSS (Vite SPA)
- **Backend:** Node.js + Express.js (REST API, integrated into Vite dev server setup)
- **Database:** PostgreSQL (Google Cloud SQL)
- **ORM:** Drizzle ORM
- **AI Integration:** Google Gemini API SDK (`@google/genai`)
- **Authentication:** Firebase Client & Admin SDKs

## 3. Database Schema
Tables:
- `users`: `id`, `uid` (Firebase), `email`, `name`, `created_at`
- `subjects`: `id`, `name`, `code`, `semester`
- `notes`: `id`, `user_id`, `title`, `subject_id`, `file_url`, `created_at`
- `papers`: `id`, `user_id`, `title`, `subject_id`, `year`, `file_url`, `created_at`
- `quizzes`: `id`, `user_id`, `note_id`, `score`, `total_questions`, `created_at`

## 4. ER Diagram (Conceptual)
```
[Subjects] 1 ---> M [Notes]
[Subjects] 1 ---> M [Papers]
[Users] 1 ---> M [Notes]
[Users] 1 ---> M [Papers]
[Users] 1 ---> M [Quizzes]
[Notes] 1 ---> M [Quizzes]
```

## 5. Folder Structure
```text
/
├── firebase-applet-config.json
├── package.json
├── server.ts                 # Express Backend Entry
├── src/
│   ├── db/
│   │   ├── index.ts          # DB Connection
│   │   ├── schema.ts         # Drizzle Schema
│   │   └── drizzle.config.ts # Drizzle Kit Config
│   ├── middleware/
│   │   └── auth.ts           # Firebase Auth Middleware
│   ├── lib/
│   │   ├── firebase.ts       # Firebase Client
│   │   ├── firebase-admin.ts # Firebase Admin
│   │   └── gemini.ts         # Gemini AI Client
│   ├── components/           # React Components
│   ├── pages/                # React Pages (Dashboard, Notes, etc.)
│   ├── App.tsx
│   └── main.tsx
└── docs/                     # Documentation (this file)
```
