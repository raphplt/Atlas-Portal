# Atlas Portal - Guide de deploiement (Vercel + VPS + Cloudflare)

Ce guide suit ton architecture cible:

- Frontend Next.js sur Vercel
- API NestJS + Postgres sur ton VPS (Docker)
- DNS via Cloudflare
- Sous-domaines de `raphael-plassart.com`

## 0) Architecture recommandee

- Frontend: `https://portal.raphael-plassart.com` (Vercel)
- API: `https://atlas-portal.raphael-plassart.com` (VPS)

Important: l'auth utilise des cookies `SameSite=Strict` en production. Le front et l'API doivent rester sur le meme domaine racine (`raphael-plassart.com`). N'utilise pas `*.vercel.app` pour le domaine principal de prod.

## 1) Prerequis

Sur le VPS:

- Docker + Docker Compose plugin
- Git
- Nginx
- Certbot (`python3-certbot-nginx`)
- Ports 80/443 ouverts

En externe:

- Compte Vercel
- Zone DNS Cloudflare pour `raphael-plassart.com`

## 2) Configuration DNS Cloudflare

Creer ces enregistrements:

1. `portal` (frontend Vercel)
- Type: `CNAME`
- Cible: `cname.vercel-dns.com` (ou la cible fournie par Vercel)
- Proxy status: `DNS only` (recommande au debut)

2. `atlas-portal` (API VPS)
- Type: `A`
- Cible: `<IP_PUBLIQUE_VPS>`
- Proxy status: `DNS only` pendant la mise en place TLS

## 3) Preparation du code sur VPS

```bash
cd /opt
git clone <URL_GIT_DU_REPO> atlas-portal
cd atlas-portal
```

## 4) Variables d'environnement (VPS)

### 4.1 Fichier racine `.env` (utilise par `docker-compose.yml` pour Postgres)

```bash
cat > .env << 'EOF'
POSTGRES_USER=atlas_prod
POSTGRES_PASSWORD=<MOT_DE_PASSE_POSTGRES_FORT>
POSTGRES_DB=atlas_portal
POSTGRES_PORT=5432
EOF
```

### 4.2 Fichier `apps/api/.env` (utilise par l'API)

```bash
cat > apps/api/.env << 'EOF'
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=atlas_prod
DATABASE_PASSWORD=<MOT_DE_PASSE_POSTGRES_FORT>
DATABASE_NAME=atlas_portal
DATABASE_SSL=false

PORT=3001
NODE_ENV=production
WEB_APP_URL=https://portal.raphael-plassart.com
API_BASE_URL=https://atlas-portal.raphael-plassart.com
ALLOWED_ORIGINS=https://portal.raphael-plassart.com

JWT_ACCESS_SECRET=<SECRET_LONG_1_MIN_32+>
JWT_REFRESH_SECRET=<SECRET_LONG_2_MIN_32+>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL_DAYS=7

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_ENDPOINT=
MAX_UPLOAD_SIZE_MB=20

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_SUCCESS_URL=https://portal.raphael-plassart.com/fr/payments/success
STRIPE_CANCEL_URL=https://portal.raphael-plassart.com/fr/payments/cancel

BREVO_API_KEY=
BREVO_API_URL=https://api.brevo.com/v3/smtp/email
BREVO_SANDBOX=false
EMAIL_SENDER=no-reply@raphael-plassart.com
CLIENT_INVITATION_EXPIRY_DAYS=7
EOF
```

Notes:

- Garde `DATABASE_*` aligne avec le `.env` racine.
- Les blocs R2/Stripe/Brevo peuvent rester vides au depart si tu ne les utilises pas encore.
- `NODE_ENV=production` est obligatoire pour les cookies securises.
- Tu peux generer des secrets JWT avec: `openssl rand -hex 32`

## 5) Build et demarrage Docker (API + DB)

Depuis la racine du repo sur le VPS:

```bash
cd /opt/atlas-portal

# Build image API
docker build -t atlas-portal-api:latest -f apps/api/Dockerfile .

# Start DB d'abord
docker compose -p atlas-portal \
  -f infra/docker/docker-compose.prod.yml \
  -f docker-compose.yml \
  up -d postgres

# Puis API
docker compose -p atlas-portal \
  -f infra/docker/docker-compose.prod.yml \
  -f docker-compose.yml \
  up -d api

# Verifications
docker compose -p atlas-portal \
  -f infra/docker/docker-compose.prod.yml \
  -f docker-compose.yml \
  ps

curl -i http://127.0.0.1:3001/health
```

## 6) Nginx reverse proxy + HTTPS (API)

Creer une conf Nginx pour l'API:

```nginx
server {
  listen 80;
  server_name atlas-portal.raphael-plassart.com;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-Id $request_id;

    # WebSocket (messages temps reel)
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 60s;
  }
}
```

Installation:

```bash
sudo tee /etc/nginx/sites-available/atlas-portal.conf >/dev/null << 'EOF'
server {
  listen 80;
  server_name atlas-portal.raphael-plassart.com;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-Id $request_id;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 60s;
  }
}
EOF

sudo ln -sf /etc/nginx/sites-available/atlas-portal.conf /etc/nginx/sites-enabled/atlas-portal.conf
sudo nginx -t
sudo systemctl reload nginx
```

Certificat TLS:

```bash
sudo certbot --nginx -d atlas-portal.raphael-plassart.com
```

Test final API:

```bash
curl -i https://atlas-portal.raphael-plassart.com/health
```

## 7) Deploiement Front sur Vercel

Dans Vercel:

1. Import du repo Git
2. Root Directory: `apps/web`
3. Build command: `pnpm build` (par defaut)
4. Install command: `pnpm install --frozen-lockfile`
5. Variable d'env (Production):
- `NEXT_PUBLIC_API_BASE_URL=https://atlas-portal.raphael-plassart.com`
6. Ajouter le domaine custom:
- `portal.raphael-plassart.com`

Ensuite, verifier que `https://portal.raphael-plassart.com` repond.

## 8) Initialisation applicative (1ere mise en ligne)

Creer le premier admin:

```bash
curl -X POST https://atlas-portal.raphael-plassart.com/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceName": "Atlas Portal",
    "adminEmail": "admin@raphael-plassart.com",
    "password": "<MOT_DE_PASSE_FORT>",
    "firstName": "Raphael",
    "lastName": "Plassart",
    "locale": "fr"
  }'
```

Puis connexion via:

- `https://portal.raphael-plassart.com/fr/login`

## 9) Stripe webhook (si active)

Dans Stripe, configurer le webhook:

- Endpoint: `https://atlas-portal.raphael-plassart.com/payments/webhooks/stripe`
- Evenement minimum: `checkout.session.completed`
- Reporter la cle signee dans `STRIPE_WEBHOOK_SECRET`

Puis redeployer l'API.

## 10) Routine de mise a jour

Sur VPS:

```bash
cd /opt/atlas-portal
git pull
docker build -t atlas-portal-api:latest -f apps/api/Dockerfile .
docker compose -p atlas-portal \
  -f infra/docker/docker-compose.prod.yml \
  -f docker-compose.yml \
  up -d api
```

Controle rapide:

```bash
curl -i https://atlas-portal.raphael-plassart.com/health
```

## 11) Checklist de validation finale

- `https://atlas-portal.raphael-plassart.com/health` retourne 200
- Le login fonctionne sur `https://portal.raphael-plassart.com`
- Les appels API depuis le front passent sans erreur CORS
- Les cookies `atlas.access`/`atlas.refresh` sont poses en HTTPS
- Les migrations SQL s'executent au demarrage API
- Les uploads/paiements/emails fonctionnent si les cles sont configurees
