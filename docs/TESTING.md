# Testing

## Strategy

- **Unit tests**: Domain logic, validation schemas, utility functions
- **Integration tests**: API routes with database
- **E2E tests**: Critical user flows with Playwright

## Running Tests

```bash
# Unit tests
npm run test

# E2E tests (requires running app + database)
npm run test:e2e

# Coverage
npm run test:coverage
```

## Coverage Goals

- Unit tests: 70%+ on lib/ and validation logic
- Integration tests: All API endpoints
- E2E tests: Critical flows (register, login, create group, add relationship, view graph, create alert)

## Test Structure

```
tests/
├── unit/           # Vitest unit tests
├── integration/    # API integration tests
└── e2e/            # Playwright E2E tests
```
