import { db } from './src/db/index';
import { subjects } from './src/db/schema';
import { eq } from 'drizzle-orm';

const bcaSubjects = [
    { name: 'Programming in C', code: 'BCA101', semester: 1 },
    { name: 'Web Application and Development (WAD)', code: 'BCA102', semester: 1 },
    { name: 'Computer Fundamentals and Office Management Tools (CFOMT)', code: 'BCA103', semester: 1 },
    { name: 'Operating System (OS)', code: 'BCA201', semester: 2 },
    { name: 'Database Management System (DBMS)', code: 'BCA202', semester: 2 },
    { name: 'Computer Organization and Architecture (COA)', code: 'BCA203', semester: 2 },
];

async function run() {
    for (const sub of bcaSubjects) {
        await db.update(subjects).set({ name: sub.name, semester: sub.semester }).where(eq(subjects.code, sub.code));
    }
    console.log("Updated.");
    process.exit(0);
}
run();
