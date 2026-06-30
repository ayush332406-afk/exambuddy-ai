import * as dotenv from 'dotenv';
import { db } from './index.ts';
import { subjects } from './schema.ts';

dotenv.config();

const seedSubjects = async () => {
  const bcaSubjects = [
    { name: 'Programming in C', code: 'BCA101', semester: 1 },
    { name: 'Web Application and Development (WAD)', code: 'BCA102', semester: 1 },
    { name: 'Computer Fundamentals and Office Management Tools (CFOMT)', code: 'BCA103', semester: 1 },
    { name: 'Operating System (OS)', code: 'BCA201', semester: 2 },
    { name: 'Database Management System (DBMS)', code: 'BCA202', semester: 2 },
    { name: 'Computer Organization and Architecture (COA)', code: 'BCA203', semester: 2 },
  ];

  console.log('Seeding subjects...');
  for (const sub of bcaSubjects) {
    await db.insert(subjects).values(sub).onConflictDoNothing({ target: subjects.code });
  }
  console.log('Subjects seeded successfully');
};

seedSubjects().catch(console.error).finally(() => process.exit(0));
