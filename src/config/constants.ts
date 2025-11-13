export const APP_NAME = 'be-ta';
export const API_VERSION = 'v1';
export const SALT_ROUNDS = 10;

// ==================== HTTP STATUS CODES ====================

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

// ==================== ERROR MESSAGES ====================

/**
 * Centralized error messages for consistency across the application
 * Organized by module/domain for easy maintenance
 */
export const ERROR_MESSAGES = {
  // ==================== GENERAL ERRORS ====================
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  VALIDATION_ERROR: 'Validation error',

  // ==================== AUTH ERRORS ====================
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_EXISTS: 'Email already exists',
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
  TOKEN_NOT_FOUND: 'Token not found',
  TOKEN_EXPIRED: 'Token has expired',

  // ==================== USER ERRORS ====================
  USER_NOT_FOUND: 'User not found',
  USER_HAS_EXAM_ATTEMPTS: 'Cannot delete user with exam attempts. This is for data preservation.',
  USER_HAS_CREATED_EXAMS: 'Cannot delete user who created exams. Transfer ownership first.',

  // ==================== EXAM ERRORS ====================
  EXAM_NOT_FOUND: 'Exam not found',
  EXAM_HAS_NO_QUESTIONS: 'Exam has no questions',
  EXAM_HAS_NO_DURATION_SET: 'Exam duration not set',
  DUPLICATE_EXAM_TITLE: 'An exam with this title already exists',
  NOT_EXAM_CREATOR: 'Only the exam creator can perform this action',
  CANNOT_DELETE_EXAM_WITH_ATTEMPTS: 'Cannot delete exam with participant attempts',
  CANNOT_UPDATE_ACTIVE_EXAM_DURATION: 'Cannot update duration while exam sessions are active',

  // ==================== EXAM SESSION ERRORS ====================
  EXAM_SESSION_NOT_FOUND: 'Exam session not found',
  EXAM_ALREADY_STARTED: 'You have already started this exam',
  EXAM_TIMEOUT: 'Exam time limit exceeded',
  EXAM_ALREADY_SUBMITTED: 'Exam already submitted',
  UNAUTHORIZED_EXAM_SESSION: 'Unauthorized to access this exam session',
  UNAUTHORIZED_VIEW_EXAM_SESSION: 'Unauthorized to view this exam session',
  UNABLE_SUBMIT_ANSWER_EXAM_FINISHED: 'Cannot submit answer - exam already finished',
  INVALID_EXAM_QUESTION_FOR_EXAM: 'Invalid exam question ID for this exam',
  REVIEW_NOT_AVAILABLE_BEFORE_SUBMIT: 'Cannot review answers before submitting exam',
  FAILED_TO_CREATE_OR_RETRIEVE_EXAM_SESSION: 'Failed to create or retrieve exam session',

  // ==================== QUESTION ERRORS ====================
  QUESTION_NOT_FOUND: 'Question not found',
  QUESTIONS_NOT_FOUND: 'One or more questions not found',
  INVALID_OPTIONS_FORMAT: 'Invalid options format. Must have exactly 5 keys: A, B, C, D, E',
  INVALID_CORRECT_ANSWER: 'Invalid correct answer. Must be one of the option keys: A, B, C, D, E',
  CANNOT_DELETE_QUESTION_IN_USE: 'Cannot delete question that is used in exams',
  QUESTION_IN_USE: 'Question is currently used in one or more exams',

  // ==================== PROCTORING ERRORS ====================
  USER_EXAM_NOT_FOUND: 'User exam session not found',
  UNAUTHORIZED_VIEW_EVENTS: 'Unauthorized to view proctoring events',
  FAILED_TO_ANALYZE_IMAGE: 'Failed to analyze image',
} as const;

// ==================== ERROR CODES ====================

/**
 * Error codes for programmatic error handling on the client
 * Format: [MODULE]_[NUMBER]
 */
export const ERROR_CODES = {
  // ==================== GENERAL ====================
  VALIDATION_ERROR: 'VALIDATION_001',
  UNAUTHORIZED: 'UNAUTHORIZED_001',
  FORBIDDEN: 'FORBIDDEN_001',

  // ==================== AUTH (AUTH_xxx) ====================
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_EMAIL_EXISTS: 'AUTH_002',
  AUTH_INVALID_TOKEN: 'AUTH_003',
  AUTH_TOKEN_EXPIRED: 'AUTH_004',

  // ==================== USER (USER_xxx) ====================
  USER_NOT_FOUND: 'USER_001',
  USER_HAS_EXAM_ATTEMPTS: 'USER_002',
  USER_HAS_CREATED_EXAMS: 'USER_003',

  // ==================== EXAM (EXAM_xxx) ====================
  EXAM_NOT_FOUND: 'EXAM_001',
  EXAM_NO_QUESTIONS: 'EXAM_002',
  EXAM_NO_DURATION: 'EXAM_003',
  EXAM_DUPLICATE_TITLE: 'EXAM_004',
  EXAM_NOT_CREATOR: 'EXAM_005',
  EXAM_CANNOT_DELETE: 'EXAM_006',
  EXAM_CANNOT_UPDATE: 'EXAM_007',

  // ==================== EXAM SESSION (EXAM_SESSION_xxx) ====================
  EXAM_SESSION_NOT_FOUND: 'EXAM_SESSION_001',
  EXAM_SESSION_ALREADY_STARTED: 'EXAM_SESSION_002',
  EXAM_SESSION_TIMEOUT: 'EXAM_SESSION_003',
  EXAM_SESSION_ALREADY_SUBMITTED: 'EXAM_SESSION_004',
  EXAM_SESSION_INVALID_QUESTION: 'EXAM_SESSION_005',
  EXAM_SESSION_UNAUTHORIZED: 'EXAM_SESSION_006',
  EXAM_SESSION_CREATE_FAILED: 'EXAM_SESSION_007',
  EXAM_SESSION_NOT_FOUND_ALT: 'EXAM_SESSION_008',
  EXAM_SESSION_UNAUTHORIZED_ALT: 'EXAM_SESSION_009',

  // ==================== QUESTION (QUESTION_xxx) ====================
  QUESTION_NOT_FOUND: 'QUESTION_001',
  QUESTION_INVALID_OPTIONS: 'QUESTION_002',
  QUESTION_INVALID_ANSWER: 'QUESTION_003',
  QUESTION_IN_USE: 'QUESTION_004',

  // ==================== PROCTORING (PROCTORING_xxx) ====================
  PROCTORING_ANALYSIS_FAILED: 'PROCTORING_001',
  PROCTORING_DETECTION_FAILED: 'PROCTORING_002',
} as const;

// ==================== SUCCESS MESSAGES ====================

/**
 * Centralized success messages for API responses
 * Organized by module/domain
 */
export const SUCCESS_MESSAGES = {
  // ==================== AUTH ====================
  REGISTRATION_SUCCESS: 'Registration successful',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logged out successfully',
  TOKEN_REFRESHED: 'Token refreshed successfully',

  // ==================== USER ====================
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  USER_RETRIEVED: 'User retrieved successfully',
  USERS_RETRIEVED: 'Users retrieved successfully',
  PROFILE_RETRIEVED: 'Profile retrieved successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  USER_STATISTICS_RETRIEVED: 'User statistics retrieved successfully',

  // ==================== EXAM ====================
  EXAM_CREATED: 'Exam created successfully',
  EXAM_UPDATED: 'Exam updated successfully',
  EXAM_DELETED: 'Exam deleted successfully',
  EXAM_RETRIEVED: 'Exam retrieved successfully',
  EXAMS_RETRIEVED: 'Exams retrieved successfully',
  AVAILABLE_EXAMS_RETRIEVED: 'Available exams retrieved successfully',
  EXAM_STATISTICS_RETRIEVED: 'Exam statistics retrieved successfully',

  // ==================== EXAM SESSION ====================
  EXAM_STARTED: 'Exam started successfully',
  EXAM_SUBMITTED: 'Exam submitted successfully',
  EXAM_FINISHED: 'Exam finished successfully',
  EXAM_SESSION_RETRIEVED: 'Exam session retrieved successfully',
  USER_EXAM_RETRIEVED: 'User exam retrieved successfully',
  USER_EXAMS_RETRIEVED: 'User exam sessions retrieved successfully',
  EXAM_QUESTIONS_RETRIEVED: 'Exam questions retrieved successfully',
  EXAM_ANSWERS_RETRIEVED: 'Exam answers retrieved successfully',
  RESULTS_SUMMARY_RETRIEVED: 'Results summary retrieved successfully',
  RESULTS_RETRIEVED: 'Results retrieved successfully',
  ANSWER_SUBMITTED: 'Answer submitted successfully',
  ANSWER_SAVED: 'Answer saved successfully',

  // ==================== QUESTION ====================
  QUESTION_CREATED: 'Question created successfully',
  QUESTION_UPDATED: 'Question updated successfully',
  QUESTION_DELETED: 'Question deleted successfully',
  QUESTION_RETRIEVED: 'Question retrieved successfully',
  QUESTIONS_RETRIEVED: 'Questions retrieved successfully',
  QUESTIONS_ATTACHED: 'Questions attached to exam successfully',
  QUESTIONS_DETACHED: 'Questions detached from exam successfully',

  // ==================== PROCTORING ====================
  PROCTORING_EVENT_LOGGED: 'Proctoring event logged successfully',
  PROCTORING_EVENTS_RETRIEVED: 'Proctoring events retrieved successfully',
  PROCTORING_ANALYSIS_COMPLETED: 'Face analysis completed successfully',

  // ==================== DASHBOARD ====================
  DASHBOARD_RETRIEVED: 'Dashboard data retrieved successfully',
  STATISTICS_RETRIEVED: 'Statistics retrieved successfully',
} as const;


// ==================== ML/PROCTORING CONSTANTS ====================

/**
 * ML model configuration and thresholds
 */
export const ML_CONFIG = {
  // Detection thresholds
  MIN_FACE_CONFIDENCE: 0.5,
  MAX_FACES_ALLOWED: 1,

  // Performance limits
  DEFAULT_TIMEOUT_MS: 5000,
  MAX_RETRY_ATTEMPTS: 2,

  // Warmup settings
  WARMUP_IMAGE_SIZE: 640, // pixels
  WARMUP_RETRIES: 3,
} as const;



/**
 * Proctoring violation severity levels
 */
export const PROCTORING_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export const PROCTORING_CONFIG = {
  // Maximum violations before auto-canceling exam
  MAX_HIGH_VIOLATIONS: 3,      // 3 high-severity violations = exam cancelled
  MAX_MEDIUM_VIOLATIONS: 10,   // 10 medium-severity violations = exam cancelled

  // Severity weights for scoring violations
  SEVERITY_WEIGHTS: {
    HIGH: 1.0,    // Full weight
    MEDIUM: 0.5,  // Half weight
    LOW: 0.0,     // No weight (informational only)
  },
} as const;

// ==================== ML ERROR MESSAGES ====================

export const ML_ERROR_MESSAGES = {
  MODEL_NOT_FOUND: 'ML model file not found',
  MODEL_LOAD_FAILED: 'Failed to load ML model',
  ANALYSIS_TIMEOUT: 'Face analysis timed out',
  ANALYSIS_FAILED: 'Face analysis failed',
  WARMUP_FAILED: 'ML model warmup failed',
  INVALID_IMAGE: 'Invalid or corrupted image data',
} as const;

// ==================== ML ERROR CODES ====================

export const ML_ERROR_CODES = {
  MODEL_NOT_FOUND: 'ML_001',
  MODEL_LOAD_FAILED: 'ML_002',
  ANALYSIS_TIMEOUT: 'ML_003',
  ANALYSIS_FAILED: 'ML_004',
  WARMUP_FAILED: 'ML_005',
  INVALID_IMAGE: 'ML_006',
} as const;
