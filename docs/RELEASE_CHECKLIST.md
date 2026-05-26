# Release Checklist

Use this checklist before production deploys.

## 1) Pre‑deploy verification
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] Manual sanity test of critical flows (login, group access, graph view)
- [ ] At least one other person performs the same sanity test

## 2) Environment + data
- [ ] `.env` is configured with production values (see `.env.example`)
- [ ] Database migrations applied: `npx prisma migrate deploy`
- [ ] Backup/restore verified (see `docs/RUNBOOK.md`)

## 3) Deploy + validate
- [ ] Deploy steps followed (see `docs/DEPLOYMENT.md`)
- [ ] Service healthy: `sudo systemctl status liggnett`
- [ ] Logs clean: `sudo journalctl -u liggnett --since "10 min ago"`
- [ ] App reachable on production URL

## 4) Post‑deploy
- [ ] Confirm error rate and response time are normal
- [ ] Confirm no new errors in logs after 15–30 minutes
- [ ] Document release notes (if applicable)
