export const APP_NAME = 'be-ta';
export const API_VERSION = 'v1';
export const SALT_ROUNDS = 10;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_MESSAGES = {
  // Auth errors
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_EXISTS: 'Email already exists',
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
  REFRESH_TOKEN_EXPIRED: 'Refresh token expired',
  TOKEN_NOT_FOUND: 'Token not found',
  EMAIL_VERIFICATION_REQUIRED: 'Please verify your email before logging in',

  // User errors
  USER_NOT_FOUND: 'User not found',

  // General errors
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  VALIDATION_ERROR: 'Validation error',

  // Forbidden (403) – ownership/policy

  FORBIDDEN_EXAM_SESSION_VIEW: 'You are not allowed to view this exam session',
  FORBIDDEN_EXAM_SESSION_SUBMIT: 'You are not allowed to submit answers for this exam session',
  FORBIDDEN_EXAM_SESSION_SUBMIT_EXAM: 'You are not allowed to submit this exam',
  FORBIDDEN_EXAM_SESSION_QUESTIONS: 'You are not allowed to access questions for this exam session',
  FORBIDDEN_EXAM_SESSION_REVIEW: 'You are not allowed to review this exam session',

  // Exam errors
  EXAM_NOT_FOUND: 'Exam not found',
  EXAM_ALREADY_STARTED: 'You have already started this exam',
  EXAM_NOT_STARTED: 'Exam has not started yet',
  EXAM_ENDED: 'Exam has already ended',
  EXAM_TIMEOUT: 'Exam time limit exceeded',
  EXAM_HAS_ACTIVE_SESSIONS: 'Cannot modify exam with active sessions',
  EXAM_HAS_ATTEMPTS: 'Cannot delete exam with participant attempts',
  EXAM_HAS_NO_QUESTIONS: 'This exam has no questions yet',
  EXAM_HAS_NO_DURATION_SET: 'This exam has no duration set',

  // Exam Sessions errors
  FAILED_TO_CREATE_OR_RETRIEVE_EXAM_SESSION: 'Failed to create or retrieve exam session',
  EXAM_SESSION_NOT_FOUND: 'Exam session not found',
  UNAUTHORIZED_EXAM_SESSION: 'Unauthorized to submit answer for this exam session',
  UNAUTHORIZED_VIEW_EXAM_SESSION: 'Unauthorized to view this exam session',
  UNABLE_SUBMIT_ANSWER_EXAM_FINISHED: 'Cannot submit answer - exam already finished',
  EXAM_ALREADY_SUBMITTED: 'Exam already submitted',
  INVALID_EXAM_QUESTION_FOR_EXAM: 'Invalid exam question ID for this exam',
  REVIEW_NOT_AVAILABLE_BEFORE_SUBMIT: 'Cannot review answers before submitting exam',

  // Question errors
  QUESTION_NOT_FOUND: 'Question not found',
  QUESTIONS_NOT_FOUND: 'Some questions not found',
  QUESTION_ALREADY_IN_EXAM: 'Question already in exam',

  // Proctoring errors
  INVALID_PROCTORING_EVENT: 'Invalid proctoring event',


} as const;

export const SUCCESS_MESSAGES = {
  // Auth
  REGISTRATION_SUCCESS: 'Registration successful',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logged out successfully',
  TOKEN_REFRESHED: 'Token refreshed successfully',

  // User
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  USERS_RETRIEVED: 'Users retrieved successfully',
  USER_RETRIEVED: 'User retrieved successfully',

  // Exam
  EXAM_CREATED: 'Exam created successfully',
  EXAM_UPDATED: 'Exam updated successfully',
  EXAM_DELETED: 'Exam deleted successfully',
  EXAM_STARTED: 'Exam started successfully',
  EXAM_FINISHED: 'Exam finished successfully',
  EXAMS_RETRIEVED: 'Exams retrieved successfully',
  EXAM_RETRIEVED: 'Exam retrieved successfully',
  EXAM_SUBMITTED: 'Exam submitted successfully',

  // Question
  QUESTION_CREATED: 'Question created successfully',
  QUESTION_UPDATED: 'Question updated successfully',
  QUESTION_DELETED: 'Question deleted successfully',
  QUESTIONS_ATTACHED: 'Questions attached to exam successfully',
  QUESTIONS_DETACHED: 'Questions detached from exam successfully',

  // Answer
  ANSWER_SUBMITTED: 'Answer submitted successfully',
  ANSWER_SAVED: 'Answer saved successfully',

  // Proctoring
  PROCTORING_EVENT_RECORDED: 'Proctoring event recorded successfully',
} as const;