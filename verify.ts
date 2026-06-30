import { db } from './src/db/index';
import { subjects } from './src/db/schema';
import { isNotNull, sql } from 'drizzle-orm';

async function run() {
    try {
        console.log("1. Show me the exact API response from:");
        const res = await fetch('http://localhost:3000/api/subjects');
        const data = await res.json();
        console.log("* /api/subjects");
        console.log(JSON.stringify(data, null, 2));
        
        console.log("\n2. Query the database and show: SELECT * FROM subjects WHERE examDate IS NOT NULL;");
        const result = await db.execute(sql`SELECT * FROM subjects WHERE exam_date IS NOT NULL`);
        console.log(result.rows);
        
        console.log("\n3. Print the values of:");
        const examDates = result.rows.map(r => r.exam_date);
        console.log("* examDate: ", examDates);
        console.log("* hasScheduledExams: ", examDates.length > 0);
        console.log("* filteredSubjects.length: ", data.filter((s:any) => s.semester === 2).length);
        
        console.log("\n4. Identify which React component is rendering these cards:");
        console.log("* file name: src/pages/Dashboard.tsx");
        console.log("* line number: 148-168");

        console.log("\n7. If examDate values exist in the database, delete them: UPDATE subjects SET examDate = NULL;");
        await db.execute(sql`UPDATE subjects SET exam_date = NULL`);
        console.log("Deleted exam dates from database.");
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
