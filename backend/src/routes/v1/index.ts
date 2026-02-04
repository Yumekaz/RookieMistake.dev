import { Router } from 'express';
import analyzeRouter from './analyze';
import snippetsRouter from './snippets';

const router = Router();

// Mount v1 routes
router.use('/analyze', analyzeRouter);
router.use('/', snippetsRouter);

export default router;
