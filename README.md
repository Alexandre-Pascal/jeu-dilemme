# 🎭 Le Dilemme Parfait

> Un jeu de société en ligne pour 3 à 10 joueurs. Des offres absurdes, des contraintes cinglantes, des votes collectifs — et l'art subtil de diviser un groupe en deux.

**Jouer maintenant → [jeu-dilemme.pages.dev](https://jeu-dilemme.pages.dev)**

---

## C'est quoi ?

Le Dilemme Parfait est un **jeu de soirée multijoueur en temps réel**, pensé pour être joué sur un seul écran partagé (PC, télé) avec les joueurs sur leur téléphone.

Chaque manche, une offre tentante est soumise à tous :

> *« Tu gagnes 100 millions d'euros »*

Chaque joueur écrit en secret un **"mais…"** qui rend l'offre difficile à accepter :

> *« …mais tu dois vivre dans une cabane sans électricité »*

Ensuite, tous les dilemmes sont votés **Oui / Non** par l'ensemble des joueurs — sauf l'auteur. Le but ? Écrire un dilemme qui **divise exactement la salle en deux** (50 % Oui, 50 % Non). Pas trop facile, pas trop dur — parfaitement ambigu.

---

## Comment jouer ?

### Rôles

| Rôle | Appareil | Accès |
|------|----------|-------|
| **Maître du jeu (MJ)** | PC / grand écran | `/host` |
| **Joueurs** | Téléphone | `/play` |

### Déroulé d'une manche

1. **Offre affichée** — le MJ lance la manche, une offre apparaît à l'écran.
2. **Contraintes** — chaque joueur a X secondes pour écrire son « mais… » en secret.
3. **Votes** — les dilemmes de chaque joueur sont soumis un par un au vote collectif. L'auteur ne vote pas sur le sien.
4. **Résultats** — plus le vote est proche du 50/50, mieux c'est. Le récap affiche les scores.
5. **Manche suivante** — jusqu'à la fin de la liste d'offres choisie.

### Système de points

À la fin de chaque manche, les joueurs sont classés du **plus proche au plus loin du 50/50** :

| Rang | Points |
|------|--------|
| 1er  | 3 pts  |
| 2e   | 2 pts  |
| 3e   | 1 pt   |
| Égalité | Même rang partagé |

**Bonus Masterclass +5 pts** : si le vote tombe exactement à égalité (ex. 4 Oui / 4 Non).

---

## Fonctionnalités

- ⚡ **Temps réel** via WebSocket (Socket.io) — tout le monde voit la même chose en direct
- 🎮 **Interface MJ** : création de salle, code de room, gestion des timers, suivi en direct
- 📱 **Interface joueur** : optimisée mobile, rejoindre avec un code à 6 caractères
- 🗂️ **100 dilemmes** inclus en base, tous personnalisables depuis l'interface MJ
- ✏️ **Gestion des dilemmes** : ajout, suppression, sélection de quelles offres utiliser
- 🔢 **Nombre de manches** configurable à la création de la salle
- 📊 **Graphique de vote** horizontal (Oui / Non / Abstention) après chaque vote
- 🏆 **Podium final** avec classement général
- 📖 **Page de règles animée** au lancement de chaque partie

---

## Stack technique

| Couche | Techno |
|--------|--------|
| Frontend | React + Vite + React Router |
| Backend | Fastify + Socket.io |
| Base de données | PostgreSQL via Prisma ORM |
| Types partagés | Zod (`@dilemme/shared`) |
| Monorepo | pnpm workspaces |

---

## Développement local

### Prérequis

- Node.js 22 (LTS)
- [pnpm](https://pnpm.io/) 9
- Docker (pour PostgreSQL local)

### Installation

```bash
git clone https://github.com/Alexandre-Pascal/jeu-dilemme.git
cd jeu-dilemme
pnpm install
cp .env.example .env
```

### Base de données locale

```bash
pnpm db:up        # démarre PostgreSQL via Docker
pnpm db:migrate   # crée les tables
pnpm db:seed      # peuple avec les 100 offres
```

### Lancer en développement

```bash
pnpm dev
```

- Frontend : [http://localhost:5173](http://localhost:5173)
- API + WebSocket : [http://localhost:3001](http://localhost:3001)

**Parcours rapide :**

1. Onglet **MJ** → [/host](http://localhost:5173/host) → « Créer une salle », noter le code
2. Onglet **Joueur** → [/play](http://localhost:5173/play) → entrer le code + pseudo → Rejoindre → Prêt
3. MJ → **Lancer la partie**

---

## Scripts

| Script | Rôle |
|--------|------|
| `pnpm dev` | Vite + serveur en watch |
| `pnpm build` | Build `shared`, `server`, `web` |
| `pnpm test` | Tests Vitest (scoring) |
| `pnpm db:up` | `docker compose up -d` |
| `pnpm db:migrate` | Prisma migrate dev |
| `pnpm db:seed` | Seed des 100 offres |

---

## Déploiement en production

Stack utilisée : **Neon** (Postgres) + **Railway** (API Node.js) + **Cloudflare Pages** (frontend statique).

### 1. Base de données — Neon

Crée un projet sur [neon.tech](https://neon.tech), récupère la `DATABASE_URL` (format `postgresql://…`).

### 2. API — Railway

- Connecte le repo GitHub à Railway
- Variables d'environnement à définir :

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | URL Neon |
| `CORS_ORIGIN` | URL Cloudflare Pages (ex. `https://jeu-dilemme.pages.dev`) |
| `PORT` | Injecté automatiquement par Railway |

- Commande de démarrage : `pnpm --filter @dilemme/server start`
- Puis en une fois : `pnpm db:migrate && pnpm db:seed` (avec la `DATABASE_URL` Neon dans `.env`)

### 3. Frontend — Cloudflare Pages

- Source : repo GitHub, branche `main`
- Commande de build : `pnpm install && pnpm --filter @dilemme/web build`
- Répertoire de sortie : `apps/web/dist`
- Variable d'environnement de build :

| Variable | Valeur |
|----------|--------|
| `VITE_SERVER_URL` | URL publique Railway (ex. `https://xxx.up.railway.app`) |

### CI

Le workflow `.github/workflows/ci.yml` tourne sur chaque push : install, generate, build, test.

---

## Structure du projet

```
jeu-dilemme/
├── apps/
│   ├── web/          → React + Vite (/, /host, /host/offers, /play)
│   └── server/       → Fastify + Socket.io + Prisma
└── packages/
    └── shared/       → Zod schemas, types, SocketEvents, scoring helpers
```

---

*Jeu conçu pour les soirées entre amis. Fonctionne sur téléphone, tablette, et grand écran.*
