import { initParser } from '../src/parser';
import { initDatabase } from '../src/db';

beforeAll(async () => {
  await initParser();
  await initDatabase();
}, 30000); // 30 second timeout for initialization
