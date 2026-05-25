# 🔗 LiggNett

> Hvem kjenner hvem? 😏

LiggNett is a webapp for friend groups to log and visualize relationship networks – for social/entertaining network visualization and community-level exposure tracing/alerting.

## Quick Start

### Prerequisites
- Node.js 20+ (LTS)
- PostgreSQL 15+
- npm 10+

### Setup

```bash
# Clone & install
git clone https://github.com/matskkolstad/webapp.git
cd webapp
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials and secrets

# Setup database
npx prisma migrate dev
npx prisma db seed

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| UI | shadcn/ui-style components, Radix UI |
| Backend | Next.js API Routes, Server Actions |
| Database | PostgreSQL + Prisma ORM |
| Auth | Argon2 + JWT (HTTP-only cookies) |
| i18n | next-intl (Norwegian bokmål + English) |
| Graph | Cytoscape.js |
| Testing | Vitest + Playwright |
| CI/CD | GitHub Actions |

## Features

- 🔐 **Authentication** – Email/password with Argon2 hashing, secure sessions
- 👥 **Groups** – Create/join groups, invite codes (7-day expiry), role management
- 🧑‍🤝‍🧑 **Person Aliases** – Privacy-first aliases, optional contact tokens
- 💕 **Relationships** – Log relationships with optional metadata, verification
- 🕸️ **Network Graph** – Interactive Cytoscape.js visualization with filters
- ⚠️ **Exposure Alerts** – Anonymous or identified alerts with network-based notification
- 🔒 **GDPR/Privacy** – Data export, account deletion, audit logging, consent tracking
- 🌐 **i18n** – Full Norwegian (bokmål) and English support
- 🌙 **Dark/Light Mode** – Theme support

## Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) – System architecture
- [SECURITY.md](docs/SECURITY.md) – Security practices
- [PRIVACY.md](docs/PRIVACY.md) – GDPR approach
- [API.md](docs/API.md) – API endpoints
- [TESTING.md](docs/TESTING.md) – Testing strategy
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) – Debian/systemd deployment
- [RUNBOOK.md](docs/RUNBOOK.md) – Operations runbook
- [CONTRIBUTING.md](docs/CONTRIBUTING.md) – Contributing guide

## License

Private – All rights reserved.
