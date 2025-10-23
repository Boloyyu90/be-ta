import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { SALT_ROUNDS } from '@/config/constants';

export const hash = async (plain: string): Promise<string> => {
  return bcrypt.hash(plain, SALT_ROUNDS);
};

export const compare = async (plain: string, hashed: string): Promise<boolean> => {
  return bcrypt.compare(plain, hashed);
};

export const sha256 = (input: string): string => {
  return crypto.createHash('sha256').update(input).digest('hex');
};