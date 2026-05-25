# Architecture

## Overview

LiggNett is a Next.js 16 monolith using the App Router with server-side rendering and API routes.

## Directory Structure

```
├── prisma/              # Database schema & migrations
│   └── schema.prisma    # Prisma schema
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── api/         # REST API routes
│   │   └── [locale]/    # i18n page routes
│   ├── components/      # React components
│   │   ├── ui/          # Base UI components (shadcn-style)
│   │   ├── layout/      # Layout components
│   │   └── ...          # Feature components
│   ├── i18n/            # Internationalization
│   │   ├── messages/    # Translation files (nb.json, en.json)
│   │   ├── routing.ts   # Locale routing config
│   │   ├── request.ts   # Server request config
│   │   └── navigation.ts# Navigation helpers
│   └── lib/             # Shared utilities
│       ├── db.ts        # Prisma client singleton
│       ├── auth.ts      # Authentication (Argon2 + JWT)
│       ├── validations.ts # Zod schemas
│       ├── audit.ts     # Audit logging
│       ├── rate-limit.ts# Rate limiting
│       └── utils.ts     # Utility functions
├── tests/               # Test suites
├── docs/                # Documentation
└── .github/workflows/   # CI/CD
```

## Data Flow

1. **Authentication**: Email/password → Argon2 hash → JWT in HTTP-only cookie
2. **Authorization**: Middleware checks session → role-based access per group
3. **Data**: Client → API Route → Zod validation → Prisma → PostgreSQL
4. **Graph**: API fetches nodes/edges → Cytoscape.js renders interactive graph

## Key Design Decisions

- **Monolith**: Single Next.js app for simplicity, with clear module boundaries
- **Alias-first**: Users identified by aliases, not real names (GDPR dataminimering)
- **Group-scoped**: All data is scoped to groups for isolation
- **Soft delete**: Critical data uses soft delete for recovery/audit
- **Server-first**: SSR for auth pages, CSR for interactive features (graph)
