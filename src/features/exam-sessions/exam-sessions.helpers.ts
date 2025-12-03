/**
 * Exam Sessions - Helper Functions
 *
 * Utility functions untuk timer, validation, dan calculations.
 * Dipisah dari service untuk:
 * - Memudahkan unit testing
 * - Reusability di berbagai bagian code
 * - Separation of concerns
 *
 * @module exam-sessions.helpers
 */

/**
 * Cek apakah exam masih dalam batas waktu
 *
 * Includes grace period untuk kompensasi network delay.
 * Grace period default: 3 detik
 *
 * @param startedAt - Waktu mulai exam
 * @param durationMinutes - Durasi exam dalam menit
 * @param graceMs - Grace period dalam milliseconds (default 3000ms = 3 detik)
 * @returns true jika masih dalam waktu, false jika sudah timeout
 *
 * @example
 * ```typescript
 * const started = new Date('2025-01-01T10:00:00Z');
 * const isValid = withinTimeLimit(started, 60); // 60 menit
 *
 * if (!isValid) {
 *   // Exam timeout, mark as TIMEOUT
 * }
 * ```
 */
export const withinTimeLimit = (
  startedAt: Date,
  durationMinutes: number,
  graceMs: number = 3000
): boolean => {
  const elapsed = Date.now() - startedAt.getTime();
  const limit = durationMinutes * 60 * 1000 + graceMs;
  return elapsed <= limit;
};

/**
 * Hitung sisa waktu exam dalam milliseconds
 *
 * Digunakan untuk countdown timer di frontend.
 * Return value tidak pernah negatif (minimum 0).
 *
 * @param startedAt - Waktu mulai exam
 * @param durationMinutes - Durasi exam dalam menit
 * @returns Sisa waktu dalam milliseconds (minimum 0)
 *
 * @example
 * ```typescript
 * const remaining = getRemainingTime(startedAt, 60);
 * console.log(`Sisa waktu: ${Math.floor(remaining / 60000)} menit`);
 * ```
 */
export const getRemainingTime = (
  startedAt: Date,
  durationMinutes: number
): number => {
  const elapsed = Date.now() - startedAt.getTime();
  const limit = durationMinutes * 60 * 1000;
  return Math.max(0, limit - elapsed);
};

/**
 * Hitung durasi exam yang sudah berjalan (dalam detik)
 *
 * Digunakan setelah exam submit untuk mencatat
 * berapa lama user mengerjakan exam.
 *
 * @param startedAt - Waktu mulai exam
 * @param submittedAt - Waktu submit exam
 * @returns Durasi dalam detik (integer)
 *
 * @example
 * ```typescript
 * const duration = calculateDuration(startedAt, submittedAt);
 * console.log(`Exam diselesaikan dalam ${duration} detik`);
 * // Output: Exam diselesaikan dalam 3542 detik (59 menit 2 detik)
 * ```
 */
export const calculateDuration = (
  startedAt: Date,
  submittedAt: Date
): number => {
  return Math.floor((submittedAt.getTime() - startedAt.getTime()) / 1000);
};

/**
 * Format durasi detik ke format human-readable
 *
 * Utility function untuk display duration di UI.
 *
 * @param seconds - Durasi dalam detik
 * @returns String format "X menit Y detik"
 *
 * @example
 * ```typescript
 * formatDuration(3542);
 * // Returns: "59 menit 2 detik"
 *
 * formatDuration(45);
 * // Returns: "45 detik"
 * ```
 */
export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds} detik`;
  }

  return `${minutes} menit ${remainingSeconds} detik`;
};

/**
 * Check apakah exam session sudah abandoned (2x duration tanpa aktivitas)
 *
 * Digunakan oleh cleanup job untuk detect session yang:
 * - User close browser tanpa submit
 * - Network disconnect
 * - App crash
 *
 * @param startedAt - Waktu mulai exam
 * @param durationMinutes - Durasi exam dalam menit
 * @returns true jika session sudah abandoned
 *
 * @example
 * ```typescript
 * if (isAbandonedSession(session.startedAt, session.exam.durationMinutes)) {
 *   // Auto-submit dengan score dari jawaban yang ada
 * }
 * ```
 */
export const isAbandonedSession = (
  startedAt: Date,
  durationMinutes: number
): boolean => {
  const elapsed = Date.now() - startedAt.getTime();
  const threshold = durationMinutes * 60 * 1000 * 2; // 2x duration
  return elapsed > threshold;
};

/**
 * Calculate percentage progress exam
 *
 * @param answered - Jumlah soal yang sudah dijawab
 * @param total - Total soal
 * @returns Percentage (0-100, integer)
 */
export const calculateProgress = (answered: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((answered / total) * 100);
};