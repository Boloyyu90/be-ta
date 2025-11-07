import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as examsController from './exams.controller';
import * as examsValidation from './exams.validation';

export const examsRouter = Router();

// =================================================================
// MOUNTING CONTEXTS:
// 1. /api/v1/exams           → Participant view (auth required)
// 2. /api/v1/admin/exams     → Admin management (admin required)
//
// STRATEGY:
// - Participant routes: GET / and GET /:id (view only)
// - Admin routes: Full CRUD + question management
// =================================================================

// -----------------------------------------------------------------
// CONTEXT HELPERS
// -----------------------------------------------------------------
const isParticipantContext = (req: any) =>
  !req.baseUrl.includes('/admin') && req.baseUrl.includes('/exams');
const isAdminContext = (req: any) =>
  req.baseUrl.includes('/admin');

// -----------------------------------------------------------------
// ROUTES: Participant View (mounted at /exams)
// -----------------------------------------------------------------

/**
 * @route   GET /api/v1/exams
 * @desc    Get available exams (with questions)
 * @access  Private (Authenticated users)
 */
examsRouter.get(
  '/',
  validate(examsValidation.getExamsSchema),
  asyncHandler(async (req, res, next) => {
    if (isParticipantContext(req)) {
      return await examsController.getExams(req, res, next);
    }
    return next(); // Let admin handler take over
  })
);

/**
 * @route   GET /api/v1/exams/:id
 * @desc    Get exam details (without answers)
 * @access  Private (Authenticated users)
 */
examsRouter.get(
  '/:id',
  validate(examsValidation.getExamSchema),
  asyncHandler(async (req, res, next) => {
    if (isParticipantContext(req)) {
      return await examsController.getExamById(req, res, next);
    }
    return next(); // Let admin handler take over
  })
);

// -----------------------------------------------------------------
// ROUTES: Admin Management (mounted at /admin/exams)
// Order: Most specific to least specific
// -----------------------------------------------------------------

/**
 * @route   PATCH /api/v1/admin/exams/:id/questions/reorder
 * @desc    Reorder questions
 * @access  Private (Admin only)
 */
examsRouter.patch(
  '/:id/questions/reorder',
  validate(examsValidation.reorderQuestionsSchema),
  asyncHandler(examsController.reorderQuestions)
);

/**
 * @route   GET /api/v1/admin/exams/:id/questions
 * @desc    Get exam questions with correct answers
 * @access  Private (Admin only)
 */
examsRouter.get(
  '/:id/questions',
  validate(examsValidation.getExamQuestionsSchema),
  asyncHandler(examsController.getExamQuestions)
);

/**
 * @route   POST /api/v1/admin/exams/:id/questions
 * @desc    Attach questions to exam
 * @access  Private (Admin only)
 */
examsRouter.post(
  '/:id/questions',
  validate(examsValidation.attachQuestionsSchema),
  asyncHandler(examsController.attachQuestions)
);

/**
 * @route   DELETE /api/v1/admin/exams/:id/questions
 * @desc    Detach questions from exam
 * @access  Private (Admin only)
 */
examsRouter.delete(
  '/:id/questions',
  validate(examsValidation.detachQuestionsSchema),
  asyncHandler(examsController.detachQuestions)
);

/**
 * @route   GET /api/v1/admin/exams/:id/stats
 * @desc    Get exam statistics
 * @access  Private (Admin only)
 */
examsRouter.get(
  '/:id/stats',
  validate(examsValidation.getExamStatsSchema),
  asyncHandler(examsController.getExamStats)
);

/**
 * @route   POST /api/v1/admin/exams/:id/clone
 * @desc    Clone exam with all questions
 * @access  Private (Admin only)
 */
examsRouter.post(
  '/:id/clone',
  validate(examsValidation.cloneExamSchema),
  asyncHandler(examsController.cloneExam)
);

/**
 * @route   GET /api/v1/admin/exams/:id
 * @desc    Get exam by ID with full details
 * @access  Private (Admin only)
 */
examsRouter.get(
  '/:id',
  validate(examsValidation.getExamSchema),
  asyncHandler(async (req, res, next) => {
    if (isAdminContext(req)) {
      return await examsController.getExamById(req, res, next);
    }
    return next(); // Already handled by participant route
  })
);

/**
 * @route   PATCH /api/v1/admin/exams/:id
 * @desc    Update exam
 * @access  Private (Admin only)
 */
examsRouter.patch(
  '/:id',
  validate(examsValidation.updateExamSchema),
  asyncHandler(examsController.updateExam)
);

/**
 * @route   DELETE /api/v1/admin/exams/:id
 * @desc    Delete exam
 * @access  Private (Admin only)
 */
examsRouter.delete(
  '/:id',
  validate(examsValidation.deleteExamSchema),
  asyncHandler(examsController.deleteExam)
);

/**
 * @route   GET /api/v1/admin/exams
 * @desc    Get all exams (including drafts)
 * @access  Private (Admin only)
 */
examsRouter.get(
  '/',
  validate(examsValidation.getExamsSchema),
  asyncHandler(async (req, res, next) => {
    if (isAdminContext(req)) {
      return await examsController.getExams(req, res, next);
    }
    return next(); // Already handled by participant route
  })
);

/**
 * @route   POST /api/v1/admin/exams
 * @desc    Create new exam
 * @access  Private (Admin only)
 */
examsRouter.post(
  '/',
  validate(examsValidation.createExamSchema),
  asyncHandler(examsController.createExam)
);