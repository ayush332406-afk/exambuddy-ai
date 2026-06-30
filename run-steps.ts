import { db } from './src/db/index';
import { subjects } from './src/db/schema';
import { isNotNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

async function run() {
    try {
        console.log("Running step 1...");
        const res = await fetch('http://localhost:3000/api/subjects');
        const data = await res.json();
        console.log("API response from /api/subjects:", data);

        console.log("\nRunning step 2...");
        const result = await db.execute(sql`SELECT * FROM subjects WHERE exam_date IS NOT NULL`);
        console.log("Query result:", result.rows);
        
        console.log("\nRunning step 3...");
        const examDates = result.rows.map(r => r.exam_date);
        console.log("examDate values:", examDates);
        console.log("hasScheduledExams:", examDates.length > 0);
        
        console.log("\nRunning step 7...");
        await db.execute(sql`UPDATE subjects SET exam_date = NULL`);
        console.log("Updated subjects.");
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
