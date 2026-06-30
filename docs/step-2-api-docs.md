# BCA ExamBuddy - REST API Documentation

## Authentication & Users
*Authentication is handled mostly via Firebase Client SDK, but we sync the user to our database.*

### `POST /api/auth/sync`
- **Description:** Syncs Firebase user to PostgreSQL database.
- **Headers:** `Authorization: Bearer <Firebase_ID_Token>`
- **Response:**
  ```json
  {
    "id": 1,
    "uid": "firebase_uid",
    "email": "user@example.com",
    "name": "User Name"
  }
  ```

## Notes Management

### `GET /api/notes`
- **Description:** Get all notes for the authenticated user.
- **Headers:** `Authorization: Bearer <Firebase_ID_Token>`
- **Query Params:** `subject`, `semester`, `search`

### `POST /api/notes`
- **Description:** Upload a new note (handles file upload via Google Cloud Storage/Firebase Storage, saves metadata to DB).
- **Body (Multipart/Form-data):** `file`, `title`, `subject`, `semester`

### `DELETE /api/notes/:id`
- **Description:** Delete a note.

## Previous Year Papers

### `GET /api/papers`
- **Description:** Get all papers.
- **Query Params:** `subject`, `year`, `search`

### `POST /api/papers`
- **Description:** Upload a new paper.
- **Body (Multipart/Form-data):** `file`, `title`, `subject`, `year`

## AI Features (Gemini Integration)

### `POST /api/ai/summarize`
- **Description:** Generate a short summary from note content.
- **Body:** `{ "noteId": 1 }`

### `POST /api/ai/questions`
- **Description:** Generate important questions from note content.
- **Body:** `{ "noteId": 1 }`

### `POST /api/ai/quiz`
- **Description:** Generate MCQs from note content.
- **Body:** `{ "noteId": 1 }`

## Quizzes

### `GET /api/quizzes`
- **Description:** Get quiz history for the user.

### `POST /api/quizzes`
- **Description:** Save a quiz score.
- **Body:** `{ "noteId": 1, "score": 8, "totalQuestions": 10 }`
