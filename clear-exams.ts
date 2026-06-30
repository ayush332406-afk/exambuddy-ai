import { db } from './src/db/index';
import { subjects } from './src/db/schema';
import { isNotNull } from 'drizzle-orm';

async function run() {
    console.log("Checking for scheduled exams...");
    const scheduled = await db.select().from(subjects).where(isNotNull(subjects.examDate));
    console.log("Scheduled exams before:", scheduled.length, scheduled);
    
    await db.update(subjects).set({ examDate: null }).where(isNotNull(subjects.examDate));
    
    const after = await db.select().from(subjects).where(isNotNull(subjects.examDate));
    console.log("Scheduled exams after:", after.length);
    process.exit(0);
}
run();
