# Security

## Authentication

- Passwords hashed with **Argon2id** (memory: 64MB, iterations: 3, parallelism: 4)
- Sessions use **JWT** stored in HTTP-only, SameSite=Lax, Secure cookies
- Session expiry: 7 days
- Rate limiting on login (10/min) and registration (5/min)

## Authorization

- Role-based access control: owner > admin > member
- Group membership verified on every API call
- Invite codes expire after 7 days by default

## Data Protection

- Server-side validation with **Zod** on all inputs
- CSRF protection via SameSite cookies
- XSS protection via React's default escaping + HTTP-only cookies
- No sensitive data logged in plaintext
- Audit log for security-critical events

## GDPR Compliance

See [PRIVACY.md](PRIVACY.md) for full GDPR approach.

## Reporting Vulnerabilities

Contact the repository owner directly for security issues.
