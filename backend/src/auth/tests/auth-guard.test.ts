import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new JwtAuthGuard();
  });

  it('rejects missing JWT', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
  });

  it('rejects invalid JWT', () => {
    const error = new UnauthorizedException();
    expect(() => guard.handleRequest(error, null)).toThrow(UnauthorizedException);
  });
});
