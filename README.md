# Le Dilemme Parfait

Monorepo **pnpm** : front **React + Vite**, serveur **Fastify + Socket.io**, **Prisma + PostgreSQL** (offres en base), package partagé **@dilemme/shared** (Zod).

## Prérequis

- Node.js 22 (LTS)
- [pnpm](https://pnpm.io/) 9
- Docker (PostgreSQL local)

## Installation

```bash
git clone https://github.com/<ton-compte>/jeu-dilemme.git
cd jeu-dilemme
pnpm install
cp .env.example .env   # obligatoire : Prisma et le serveur lisent DATABASE_URL depuis ce fichier à la racine
```

## Base de données locale

Le fichier **`.env` à la racine** du repo (copié depuis `.env.example`) est chargé automatiquement par `pnpm db:*` et par le serveur en `pnpm dev` (`dotenv-cli`). Sans lui, Prisma affiche **P1012** (`Environment variable not found: DATABASE_URL`).

```bash
pnpm db:up
pnpm db:migrate   # crée les tables (Prisma migrate dev)
pnpm db:seed      # 20 offres
```

`DATABASE_URL` par défaut dans `.env.example` correspond au `docker-compose.yml`.

## Dépannage (console navigateur)

- **`evmAsk.js` / `ethereum` / extension `chrome-extension://…`** : vient d’une **extension** (souvent portefeuille crypto), pas de l’app. Tu peux l’ignorer ou désactiver l’extension sur `localhost`.
- **`WebSocket … failed` sur le port 3001** : le **serveur** ne tourne pas, a crashé ou le port est bloqué. Vérifie la sortie du terminal `pnpm dev` (process `server`). Avec un **`.env` à la racine** contenant `DATABASE_URL`, le serveur charge la base au **démarrage de partie** ; sans ça, Prisma plante.

## Développement

Deux processus (front + API) :

```bash
pnpm dev
```

- Front : [http://localhost:5173](http://localhost:5173)  
- API + WebSocket : [http://localhost:3001](http://localhost:3001)  

Copie `apps/web/.env.example` vers `apps/web/.env` si besoin : `VITE_SERVER_URL=http://localhost:3001`

### Parcours rapide

1. Onglet **MJ** : [http://localhost:5173/host](http://localhost:5173/host) → « Créer une salle », noter le **code**.
2. Onglet **Joueur** : [http://localhost:5173/play](http://localhost:5173/play) → code + pseudo → Rejoindre → **Prêt**.
3. MJ : **Lancer la partie** (tous prêts + au moins un joueur).

## Scripts utiles

| Script        | Rôle                                      |
|---------------|-------------------------------------------|
| `pnpm dev`    | Vite + serveur en watch                   |
| `pnpm build`  | Build `shared`, `server`, `web`           |
| `pnpm test`   | Vitest (scoring)                          |
| `pnpm db:up`  | `docker compose up -d`                    |
| `pnpm db:migrate` | Prisma migrate dev (apps/server)     |
| `pnpm db:seed`    | Seed des 20 offres                   |

## Déploiement gratuit (0 €)

Stack de référence : **Neon** (Postgres) + **Render** (Web Service Docker / Node, WebSocket) + **Cloudflare Pages** (build statique du front).

1. **Neon** : crée un projet, récupère `DATABASE_URL`, colle-la dans les variables d’environnement du service Render.
2. **Render** : Web Service à partir de ce repo, **Dockerfile** à la racine ; variables : `DATABASE_URL`, `CORS_ORIGIN` (URL du front Pages, ex. `https://xxx.pages.dev`), `PORT` (souvent injecté par Render, sinon `3001`).
3. **Cloudflare Pages** : build `pnpm install && pnpm --filter @dilemme/web build`, répertoire de sortie `apps/web/dist`, variable **`VITE_SERVER_URL`** = URL HTTPS publique du backend Render.

**Cold start Render (gratuit)** : le service peut se mettre en veille après inactivité (~1 minute pour « réveiller »). Le MJ peut ouvrir l’URL du backend avant que les joueurs se connectent.

**Alternative sans veille** : tout faire tourner sur une **VM Oracle Cloud Always Free** (Docker) — plus de configuration, toujours joignable.

## CI GitHub

Le workflow `.github/workflows/ci.yml` exécute `pnpm install`, `prisma generate`, `pnpm build` et `pnpm test` sur chaque push / PR vers `main`.

## Structure

```
apps/web     → Vite + React (/host, /play)
apps/server  → Fastify + Socket.io + Prisma
packages/shared → Zod + événements + scoring helpers
```

## Dépôt Git

```bash
git remote add origin https://github.com/<ton-compte>/jeu-dilemme.git
git push -u origin main
```
