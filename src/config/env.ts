/**
 * Environment Variables Validation
 *
 * Validate dan parse environment variables dengan Zod schema.
 * Application exit kalau ada invalid config untuk fail-fast approach.
 *
 * @module config/env
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment variables schema dengan validation dan default values.
 * All variables di-parse dan type-safe untuk digunakan di aplikasi.
 */
const envSchema = z.object({
  // Application Config
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),

  // Database & CORS
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().default('*'),

  // JWT Config
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRATION_MINUTES: z.string().transform(Number).default('30'),
  JWT_REFRESH_EXPIRATION_DAYS: z.string().transform(Number).default('30'),

  // ML/YOLO Config
  YOLO_ENABLED: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),

  YOLO_MODEL_PATH: z
    .string()
    .optional()
    .default('./models/yolov8n-face.pt'),

  ML_ANALYSIS_TIMEOUT_MS: z
    .string()
    .optional()
    .default('5000')
    .transform(Number),

  ML_FALLBACK_TO_MOCK: z
    .string()
    .optional()
    .default('true')
    .transform((val) => val === 'true'),

  ML_WARMUP_ON_STARTUP: z
    .string()
    .optional()
    .default('true')
    .transform((val) => val === 'true'),

  YOLO_SERVICE_URL: z
    .string()
    .optional()
    .default('http://localhost:8000'),
});

// Parse dan validate environment variables
const parsed = envSchema.safeParse(process.env);

// Fail-fast: exit application kalau ada invalid config
if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

/**
 * Validated dan type-safe environment variables.
 * Semua values sudah di-parse ke tipe yang benar (string → number, boolean, etc).
 */
export const env = parsed.data;