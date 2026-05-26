# Runbook

## Daily Operations

### Check service status
```bash
sudo systemctl status liggnett
sudo journalctl -u liggnett --since "1 hour ago"
```

### View logs
```bash
sudo journalctl -u liggnett -f           # Follow live
sudo journalctl -u liggnett --since today # Today's logs
```

## Backup

### Database backup
```bash
sudo -u postgres pg_dump liggnett > /backup/liggnett-$(date +%Y%m%d).sql
```

### Restore database
```bash
sudo -u postgres psql liggnett < /backup/liggnett-20240101.sql
```

## Secret Rotation

### Rotate JWT secret
1. Update JWT_SECRET in .env
2. Restart service: `sudo systemctl restart liggnett`
3. All existing sessions will be invalidated (users must re-login)

### Rotate database password
1. Change password in PostgreSQL: `ALTER USER liggnett WITH PASSWORD 'new-password';`
2. Update DATABASE_URL in .env
3. Restart service: `sudo systemctl restart liggnett`

## Troubleshooting

### App won't start
```bash
sudo journalctl -u liggnett --no-pager -n 50
cd /home/liggnett/app && node -e "console.log('Node OK')"
npx prisma migrate status
```

### ExecStartPre permission error (standalone/public)
If systemd reports `rm: cannot remove .../.next/standalone/public: Permission denied`:
```bash
sudo chown -R liggnett:liggnett /home/liggnett/app/.next/standalone
sudo systemctl restart liggnett
```

### Database connection failed
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT 1"
```

### High memory usage
```bash
sudo systemctl restart liggnett
```

## Hard Delete Procedure (GDPR)

For users who have been soft-deleted for 30+ days:
```bash
cd /home/liggnett/app
npx prisma db execute --stdin <<SQL
DELETE FROM consent_records WHERE user_id IN (SELECT id FROM users WHERE deleted_at < NOW() - INTERVAL '30 days');
DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE deleted_at < NOW() - INTERVAL '30 days');
DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE deleted_at < NOW() - INTERVAL '30 days');
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE deleted_at < NOW() - INTERVAL '30 days');
DELETE FROM users WHERE deleted_at < NOW() - INTERVAL '30 days';
SQL
```
