import { Router } from 'express';
import analyzeRouter from './analyze';
import projectsRouter from './projects';
import feedbackRouter from './feedback';
import snippetsRouter from './snippets';
import metricsRouter from './metrics';

const router = Router();

// Mount v1 routes
router.use('/analyze', analyzeRouter);
router.use('/projects', projectsRouter);
router.use('/feedback', feedbackRouter);
router.use('/', snippetsRouter);
router.use('/metrics', metricsRouter);

export default router;
