# Connexion + backend Neon — design

Date : 2026-08-18

## Contexte

Application statique vanilla (HTML/CSS/JS) déployée sur Vercel, données en
`localStorage`, PWA offline (manifest + service worker). Objectif : comptes
utilisateurs et stockage cloud via Neon (PostgreSQL), connexion obligatoire.

## Décisions validées

1. Backend : Vercel Functions (dossier `api/`), déployées avec le git.
2. Données : tout dans Postgres ; `localStorage` abandonné pour les données.
3. Auth : email + mot de passe, sessions en base, cookie httpOnly.
4. Tant que `DATABASE_URL` est absent : écran « maintenance » bloquant.
5. Connexion obligatoire à l'ouverture — pas d'import de données locales.
6. Hors ligne (connecté) : message d'erreur + bouton réessayer, cloud uniquement.
7. API : REST par ressource (approche A).

## Architecture

```
api/
  register.js            POST /api/register                {email, password}    → 201 + cookie
  login.js               POST /api/login                   {email, password}    → 200 + cookie
  logout.js              POST /api/logout                                         → 200
  me.js                  GET  /api/me                       → {user:{id,email}} | 401 | 503
  state.js               GET  /api/state                    → {habits, completions}
  habits.js              POST /api/habits                  {name}               → 201
  habits/[id].js         DELETE /api/habits/:id                                  → 204
  completions/[habitId]/[date].js
                         PUT    /api/completions/:habitId/:date                  → 204 (cocher)
                         DELETE /api/completions/:habitId/:date                  → 204 (décocher)
  _lib/db.js             pool Neon + création du schéma idempotente
  _lib/auth.js           hash/verify scrypt, sessions, cookie, requireUser()
  _lib/http.js           json(), readBody(), erreurs uniformes
```

Règles :

- Chaque mutation renvoie `204` ; le client re-fetch `GET /api/state` puis
  re-render (payload de quelques Ko, pas de mises à jour partielles).
- `date` au format `YYYY-MM-DD`. `completions` renvoyé dans le même format que
  l'ancien localStorage : `{ "2026-08-18|uuid": true }`.
- Erreurs uniformes `{ error: "message fr" }` : 400 / 401 / 404 / 409 / 503.
- `DATABASE_URL` absent : les fonctions renvoient 503 « backend non configuré ».

## Schéma SQL

```sql
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS completions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  day date NOT NULL,
  PRIMARY KEY (user_id, habit_id, day)
);

CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_user ON completions(user_id);
```

- Exécuté de façon idempotente au démarrage de `_lib/db.js` (une fois par
  instance de fonction, via flag module).
- `schema.sql` à la racine, copie fidèle, pour config manuelle/documentation.

## Sécurité

- Mots de passe : `crypto.scrypt` natif (N=16384, r=8, p=1), sel aléatoire
  16 octets, stockage `scrypt$<salt hex>$<hash hex>`, comparaison
  `crypto.timingSafeEqual`.
- Sessions : token 32 octets aléatoires, stocké hashé (sha256) en base,
  expiration 30 jours. Cookie `session` : httpOnly, Secure, SameSite=Lax,
  Path=/, Max-Age 30 jours.
- Login/register : message générique « Email ou mot de passe incorrect. » ;
  rate-limiting minimal en mémoire par IP (limitation assumée, Vercel stateless).
- Email normalisé en minuscules, trim. Aucune vérification d'email (pas de SMTP) ;
  le compte est actif immédiatement.
- Nom d'habitude : trim + max 60 caractères (même règle qu'aujourd'hui).

## Frontend

- `index.html` : deux vues — `#auth-view` (email, mot de passe, bouton
  « Se connecter », lien « Créer un compte ») et `#app-view` (l'existant) ;
  bouton « Déconnexion » dans le header.
- Nouveau `auth.js` : au chargement, `GET /api/me` →
  - 200 : afficher la grille puis charger `/api/state` ;
  - 401 : afficher `#auth-view` ;
  - 503 : écran « maintenance » (Neon non configuré) ;
  - réseau KO : écran « hors ligne » avec bouton réessayer.
- `app.js` : `load()/save()` remplacés par le data-layer fetch ; après chaque
  mutation (toggle / ajout / suppression), re-fetch `/api/state` + `render()` ;
  boutons désactivés pendant l'envoi ; erreur réseau → bandeau avec retry.
- PWA : `CACHE_NAME` passe à `habits-tracker-v2` (index.html et app.js changent).
- `state.completions` garde le même format clé/valeur qu'avant.

## Déploiement

- `package.json` racine, dépendance unique `@neondatabase/serverless`.
  Vercel détecte `api/*.js` automatiquement ; le frontend reste statique.
- Variable d'environnement `DATABASE_URL` à poser dans Vercel (et `.env.local`
  pour `vercel dev`) — l'utilisateur configure Neon lui-même.
- README : section « Connexion Neon » (créer la base, récupérer l'URL,
  `vercel env add DATABASE_URL`, redéployer) + notes de sécurité.
- AGENTS.md : stack mise à jour (api/, auth, Neon, smoke test).

## Tests

- `node --check` sur chaque fichier JS (api + frontend).
- Headless Chrome : écran maintenance (sans `DATABASE_URL`), écran login,
  grille (avec session simulée) — dump-dom.
- `scripts/smoke-test.mjs` : register → login → state → create habit →
  toggle → logout → re-login → vérification persistance. Utilisable en local
  (`vercel dev` + `.env.local`) dès que Neon est configuré.