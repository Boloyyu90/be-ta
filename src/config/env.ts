import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),

  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().default('*'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRATION_MINUTES: z.string().transform(Number).default('30'),
  JWT_REFRESH_EXPIRATION_DAYS: z.string().transform(Number).default('30'),

  // ==================== ML CONFIGURATION ====================
  // ✅ NEW: ML/YOLO settings (optional, defaults to mock)
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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;