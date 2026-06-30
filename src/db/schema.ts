import { pgTable, serial, text, timestamp, varchar, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 128 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).default('student').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  semester: integer('semester').notNull(),
  examDate: timestamp('exam_date'),
});

export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  subjectId: integer('subject_id').references(() => subjects.id).notNull(),
  fileUrl: text('file_url').notNull(),
  fileData: text('file_data'),
  fileSize: integer('file_size'),
  description: text('description'),
  parsedText: text('parsed_text'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const papers = pgTable('papers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  subjectId: integer('subject_id').references(() => subjects.id).notNull(),
  year: integer('year').notNull(),
  fileUrl: text('file_url').notNull(),
  fileData: text('file_data'),
  fileSize: integer('file_size'),
  description: text('description'),
  parsedText: text('parsed_text'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  noteId: integer('note_id').references(() => notes.id).notNull(),
  score: integer('score').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const studyTasks = pgTable('study_tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  subjectId: integer('subject_id').references(() => subjects.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  dueDate: timestamp('due_date').notNull(),
  completed: integer('completed').default(0).notNull(), // 0 for false, 1 for true
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const assignments = pgTable('assignments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  subjectId: integer('subject_id').references(() => subjects.id).notNull(),
  description: text('description'),
  dueDate: timestamp('due_date'),
  fileUrl: text('file_url').notNull(),
  fileData: text('file_data'),
  fileName: varchar('file_name', { length: 255 }),
  fileSize: integer('file_size'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
