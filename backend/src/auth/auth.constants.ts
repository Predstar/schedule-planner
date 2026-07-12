if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set');
}

export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_TOKEN_TYPE = 'Bearer';

export const SYSTEM_ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];
