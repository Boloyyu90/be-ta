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
// - Use context guards to prevent cross-contamination
// - Guards check req.baseUrl.includes('/admin')
// - No hardcoded /admin paths in this file
// =================================================================

// -----------------------------------------------------------------
// CONTEXT GUARDS
// -----------------------------------------------------------------


/**
 * Guard helpers for dual-mount routing
 */
const isAdminContext = (req: any) => req.baseUrl.includes('/admin');
const onlyAdminContext = (req: any, _res: any, next: any) =>
  isAdminContext(req) ? next() : next('route');

const isParticipantContext = (req: any) => !req.baseUrl.includes('/admin');
const onlyParticipantContext = (req: any, _res: any, next: any) =>
  isParticipantContext(req) ? next() : next('route');

// -----------------------------------------------------------------
// PARTICIPANT ROUTES (mounted at /api/v1/exams)
// Only GET operations - view exams and details
// -----------------------------------------------------------------

/**
 * @route   GET /api/v1/exams
 * @desc    Get available exams (with questions)
 * @access  Private (Authenticated users)
 */
examsRouter.get(
  '/',
  onlyParticipantContext,
  validate(examsValidation.getExamsSchema),

  asyncHandler(examsController.getExams)
);

/**
 * @route   GET /api/v1/exams/:id
 * @desc    Get exam details (without answers)
 * @access  Private (Authenticated users)
 */
examsRouter.get(
  '/:id',
  onlyParticipantContext,
  validate(examsValidation.getExamSchema),

  asyncHandler(examsController.getExamById)
);

// -----------------------------------------------------------------
// ADMIN ROUTES (mounted at /api/v1/admin/exams)
// Order: Most specific to least specific
// -----------------------------------------------------------------

/**
 * @route   PATCH /api/v1/admin/exams/:id/questions/reorder
 * @desc    Reorder questions
 * @access  Private (Admin only)
 */
examsRouter.patch(
  '/:id/questions/reorder',
  onlyAdminContext,
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
  onlyAdminContext,
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
  onlyAdminContext,
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
  onlyAdminContext,
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
  onlyAdminContext,
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
  onlyAdminContext,
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
  onlyAdminContext,
  validate(examsValidation.getExamSchema),

  asyncHandler(examsController.getExamById)
);

/**
 * @route   PATCH /api/v1/admin/exams/:id
 * @desc    Update exam
 * @access  Private (Admin only)
 */
examsRouter.patch(
  '/:id',
  onlyAdminContext,
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
  onlyAdminContext,
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
  onlyAdminContext,
  validate(examsValidation.getExamsSchema),
  asyncHandler(examsController.getExams)
);

/**
 * @route   POST /api/v1/admin/exams
 * @desc    Create new exam
 * @access  Private (Admin only)
 */
examsRouter.post(
  '/',
  onlyAdminContext,
  validate(examsValidation.createExamSchema),
  asyncHandler(examsController.createExam)
);