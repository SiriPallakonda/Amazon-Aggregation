import 'dotenv/config';
import { connectDB, seedDatabase } from './db.js';
try { await connectDB(); const counts=await seedDatabase(); console.log('Seed complete:',counts); process.exit(0); }
catch(e){console.error(e.message);process.exit(1);}
