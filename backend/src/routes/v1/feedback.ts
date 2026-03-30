import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { getFindingFeedback, getProjectAnalysis, saveFindingFeedback } from '../../db';
import { validateFindingFeedbackRequest, FindingFeedbackRequest } from '../../middleware/validation';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';

const router = Router();

router.post(
  '/',
  validateFindingFeedbackRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as FindingFeedbackRequest;
    const requestId = req.requestId;

    logger.info('Recording finding feedback', {
      requestId,
      analysisId: body.analysisId,
      findingId: body.findingId,
      status: body.status,
    });

    const analysis = getProjectAnalysis(body.analysisId);
    if (!analysis) {
      throw new NotFoundError('Project analysis not found');
    }

    const findingExists = analysis.findings.some((finding) => finding.findingId === body.findingId);
    if (!findingExists) {
      throw new NotFoundError('Finding not found');
    }

    const existing = getFindingFeedback(body.analysisId, body.findingId);
    const feedbackId = existing?.id || nanoid(10);
    const feedback = saveFindingFeedback(feedbackId, body);

    return res.status(existing ? 200 : 201).json(feedback);
  })
);

export default router;
