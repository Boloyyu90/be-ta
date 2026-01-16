/**
 * CPNS Configuration Constants
 *
 * Single source of truth untuk passing grades dan konfigurasi CPNS.
 * Digunakan oleh backend untuk scoring dan exposed ke frontend via API.
 *
 * @module config/cpns.constants
 */

import { QuestionType } from '@prisma/client';

/**
 * Passing grade untuk setiap tipe soal CPNS
 */
export const CPNS_PASSING_GRADES: Record<QuestionType, number> = {
  TWK: 65,
  TIU: 80,
  TKP: 166,
} as const;

/**
 * Total passing score minimum untuk lulus CPNS
 */
export const CPNS_TOTAL_PASSING_SCORE = 311;

/**
 * Kategori CPNS dengan informasi lengkap
 */
export const CPNS_CATEGORIES = [
  { type: 'TWK' as const, name: 'Tes Wawasan Kebangsaan', passingGrade: 65 },
  { type: 'TIU' as const, name: 'Tes Intelegensi Umum', passingGrade: 80 },
  { type: 'TKP' as const, name: 'Tes Karakteristik Pribadi', passingGrade: 166 },
] as const;

/**
 * Get passing grade untuk tipe soal tertentu
 *
 * @param type - QuestionType (TWK, TIU, TKP)
 * @returns Passing grade untuk tipe tersebut
 */
export function getPassingGrade(type: QuestionType): number {
  return CPNS_PASSING_GRADES[type] ?? 0;
}

/**
 * Check apakah score kategori memenuhi passing grade
 *
 * @param type - QuestionType (TWK, TIU, TKP)
 * @param score - Score yang didapat
 * @returns true jika score >= passing grade
 */
export function isCategoryPassing(type: QuestionType, score: number): boolean {
  return score >= getPassingGrade(type);
}
