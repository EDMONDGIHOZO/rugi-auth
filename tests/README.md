# Testing Guide

This directory contains comprehensive tests for Rugi Auth, designed to build trust and ensure security.

## Test Structure

```
tests/
├── setup.ts                 # Test environment setup
├── test-utils/              # Reusable test utilities
│   ├── db.ts               # Database helpers
│   ├── auth.ts             # Authentication helpers
│   └── index.ts            # Exports
├── unit/                    # Unit tests (fast, isolated)
│   └── services/           # Service layer tests
├── integration/             # Integration tests (API endpoints)
└── security/                # Security-focused tests
    ├── timing-attacks.test.ts
    └── rate-limiting.test.ts
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:security

# Open test UI
npm run test:ui
```

## Test Coverage Goals

- **Overall Coverage**: 80%+
- **Critical Services**: 90%+ (auth, password, token)
- **Security Tests**: 100% of known vulnerabilities

## Test Categories

### Unit Tests
Fast, isolated tests for individual functions and services:
- Password hashing/verification
- Token generation/validation
- Service logic

### Integration Tests
End-to-end API tests using Supertest:
- Authentication flows
- Token refresh
- User management
- Role management

### Security Tests
Tests specifically for security vulnerabilities:
- Timing attack protection
- Rate limiting effectiveness
- Input validation
- SQL injection prevention
- XSS prevention

## Test Database

Tests use a separate test database (`rugi_auth_test`) to avoid affecting development data.

**Environment Variables:**
- `TEST_DATABASE_URL` - Test database connection string
- `TEST_REDIS_HOST` - Test Redis host (default: localhost)
- `TEST_REDIS_PORT` - Test Redis port (default: 6381)

## Writing Tests

### Example: Unit Test

```typescript
import { describe, it, expect } from 'vitest';
import { hashPassword } from '../../src/services/password.service';

describe('Password Service', () => {
  it('should hash a password', async () => {
    const hash = await hashPassword('password123');
    expect(hash).toContain('$argon2id$');
  });
});
```

### Example: Integration Test

```typescript
import request from 'supertest';
import app from '../../src/app';

describe('Auth API', () => {
  it('should register a user', async () => {
    const response = await request(app)
      .post('/register')
      .send({ email: 'test@example.com', password: 'pass123' });
    
    expect(response.status).toBe(201);
  });
});
```

### Example: Security Test

```typescript
describe('Timing Attack Protection', () => {
  it('should have constant-time execution', async () => {
    // Test timing attack mitigation
  });
});
```

## CI Integration

Tests run automatically on:
- Every push to main
- Every pull request
- Multiple Node.js versions (18, 20, 22)

Coverage reports are generated and can be viewed in CI artifacts.

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use `beforeEach` to clean test data
3. **Realistic Data**: Use realistic test data
4. **Security First**: Always test security-critical paths
5. **Coverage**: Aim for high coverage on critical code

## Troubleshooting

**Tests failing with database errors:**
- Ensure test database exists
- Check `TEST_DATABASE_URL` is set correctly
- Run migrations: `npx prisma migrate deploy`

**Redis connection errors:**
- Ensure Redis is running on test port (6381)
- Or set `TEST_REDIS_HOST` and `TEST_REDIS_PORT`

**Slow tests:**
- Use `test.only()` to run specific tests during development
- Check for unnecessary database operations

