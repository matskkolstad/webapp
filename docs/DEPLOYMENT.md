# Deployment – Debian/systemd (Proxmox LXC)

## Prerequisites

- Debian 12+ (Bookworm) or Ubuntu 22.04+
- Root or sudo access

## 1. Install Node.js LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
node -v  # Should be 20.x
```

## 2. Install PostgreSQL

```bash
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER liggnett WITH PASSWORD 'your-secure-password';
CREATE DATABASE liggnett OWNER liggnett;
GRANT ALL PRIVILEGES ON DATABASE liggnett TO liggnett;
EOF
```

## 3. Deploy Application

```bash
# Create app user
sudo useradd -m -s /bin/bash liggnett
sudo su - liggnett

# Clone and build
git clone https://github.com/matskkolstad/webapp.git /home/liggnett/app
cd /home/liggnett/app
npm ci --production=false
cp .env.example .env
# Edit .env with production values

npx prisma migrate deploy
npm run build
```

## 4. systemd Service

Create `/etc/systemd/system/liggnett.service`:

```ini
[Unit]
Description=LiggNett Web Application
After=network.target postgresql.service

[Service]
Type=simple
User=liggnett
WorkingDirectory=/home/liggnett/app
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/home/liggnett/app/.env
ExecStart=/usr/bin/node /home/liggnett/app/.next/standalone/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=liggnett

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/liggnett/app/.next/cache

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable liggnett
sudo systemctl start liggnett
sudo systemctl status liggnett

# View logs
sudo journalctl -u liggnett -f
```

## 5. Update Procedure

```bash
cd /home/liggnett/app
git pull origin main
npm ci
npx prisma migrate deploy
npm run build
sudo systemctl restart liggnett
```

## 6. Cloudflare Tunnel

To expose on a subdomain of `matskk.com`:

```bash
# Install cloudflared
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-archive-keyring.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install cloudflared

# Authenticate and create tunnel
cloudflared tunnel login
cloudflared tunnel create liggnett
cloudflared tunnel route dns liggnett liggnett.matskk.com

# Create config
cat > /home/liggnett/.cloudflared/config.yml <<EOF
tunnel: <TUNNEL_ID>
credentials-file: /home/liggnett/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: liggnett.matskk.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# Run as service
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

## Docker Compose (Alternative)

```yaml
# docker-compose.yml
version: "3.8"
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: liggnett
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: liggnett
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://liggnett:${DB_PASSWORD}@db:5432/liggnett
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    depends_on:
      - db

volumes:
  pgdata:
```
