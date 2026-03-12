/**
 * Shared User Types
 *
 * Single source of truth for user-related types used across modules.
 * Prevents duplication between auth and users validation files.
 *
 * @module shared/types/user.types
 */

import { UserRole } from '@prisma/client';

/**
 * Public user data (without password)
 *
 * Used in auth responses (login, register) and user management responses.
 */
export interface UserPublicData {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
