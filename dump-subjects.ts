import { db } from './src/db/index';
import { subjects } from './src/db/schema';
import { sql } from 'drizzle-orm';

async function run() {
    try {
        const result = await db.execute(sql`SELECT * FROM subjects`);
        console.log(result.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
