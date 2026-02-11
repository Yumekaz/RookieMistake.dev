import { Router } from 'express';
import analyzeRouter from './analyze';
import snippetsRouter from './snippets';
import metricsRouter from './metrics';

const router = Router();

// Mount v1 routes
router.use('/analyze', analyzeRouter);
router.use('/', snippetsRouter);
router.use('/metrics', metricsRouter);

export default router;
