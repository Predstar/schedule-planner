import { defineConfig } from 'vitest/config';

process.env.JWT_SECRET ??= 'test-jwt-secret';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
