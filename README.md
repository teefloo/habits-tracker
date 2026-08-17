# Habitudes

Suivi d'habitudes personnel et minimal : une grille hebdomadaire (habitudes × 7 jours) où chaque case se coche d'un simple clic, avec comptes utilisateurs et données stockées dans le cloud (Neon/Postgres).

> Démo : [habitudes-tracker.vercel.app](https://habitudes-tracker.vercel.app)

## Pourquoi

Un tracker d'habitudes avec compte (email + mot de passe), sans framework ni build. Les données vivent dans une base Postgres hébergée chez [Neon](https://neon.tech). Le frontend reste du HTML/CSS/JS vanilla servi statiquement ; le backend est composé de Vercel Functions (`api/`).

## Fonctionnalités

- **Comptes** : inscription et connexion par email + mot de passe, session par cookie sécurisé (30 jours)
- **Grille hebdomadaire** lundi → dimanche, avec la semaine courante en évidence
- **Suivi en un clic** : cocher / décocher une habitude, avec compteur `n/7` par habitude
- **Ajout et suppression** d'habitudes (suppression confirmée en deux temps pour éviter les erreurs)
- **Navigation par semaine** (‹ › et retour à « Aujourd'hui »)
- **Thème clair / sombre** automatique, respect de `prefers-reduced-motion`
- **Responsive** : grille pleine largeur sur desktop, colonne des habitudes épinglée et défilement horizontal sur mobile
- **PWA installable** : fonctionne hors ligne (interface), icône d'accueil — « Ajouter à l'écran d'accueil » sur iPhone (Safari → Partager → Sur l'écran d'accueil)
- **Accessible** : contrastes AA, focus visibles, attributs ARIA

## Connexion à Neon (à faire une seule fois)

Le backend a besoin d'une base Postgres. Sans `DATABASE_URL`, l'application affiche un écran « Service indisponible ».

1. Créez un projet sur [neon.tech](https://neon.tech) (plan gratuit suffisant), avec une base nommée par exemple `habitudes`.
2. Copiez la **connection string** du projet (onglet *Connection Details* → « Node.js »). Elle ressemble à :
   `postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/habitudes?sslmode=require`
3. Ajoutez-la comme variable d'environnement sur Vercel :
   ```sh
   vercel env add DATABASE_URL
   ```
   (répondez `production` — et `development` si vous voulez tester en local)
4. Redéployez : `git push` ou `vercel --prod`.

Le schéma des tables est créé automatiquement au premier appel d'API. Il est aussi documenté dans `schema.sql`.

### En local

```sh
vercel dev          # sert le frontend + les fonctions, avec DATABASE_URL de l'env de dev
node scripts/smoke-test.mjs   # test complet de l'API (register → login → coche → logout)
```

## Développement

```sh
vercel dev          # backend + frontend ensemble
node --check app.js auth.js api/*.js
```

## Déploiement

Poussé sur `main`, Vercel déploie automatiquement (frontend statique + fonctions).

## Structure

```
index.html              Coquille de la page (connexion, grille, écrans maintenance/hors ligne)
styles.css              Tout le style : tokens, thèmes, grille, formulaires
app.js                  Logique de l'application : état, rendu, appels API
auth.js                 Session : login, inscription, déconnexion, écrans de blocage
manifest.json           Métadonnées PWA (nom, icônes, standalone)
sw.js                   Service worker : cache offline de l'application
schema.sql              Schéma Postgres (documentation, copie de l'auto-init)
api/                    Backend — Vercel Functions (voir api/_lib)
  register.js           POST /api/register
  login.js              POST /api/login
  logout.js             POST /api/logout
  me.js                 GET  /api/me
  state.js              GET  /api/state
  habits.js             POST /api/habits
  habits/[id].js        DELETE /api/habits/:id
  completions/…         PUT/DELETE /api/completions/:habitId/:date
scripts/smoke-test.mjs  Test bout-en-bout de l'API
icon-512.png            Icône PWA 512 px
icon-192.png            Icône PWA 192 px
apple-touch-icon.png    Icône iOS (écran d'accueil)
```

## Confidentialité

- Les mots de passe sont hachés avec `scrypt` (sel individuel) ; jamais stockés en clair.
- Les sessions sont des tokens aléatoires stockés hashés (sha256), en cookie `HttpOnly`/`Secure`.
- Les données (habitudes, cases cochées) appartiennent à chaque compte et ne sont jamais partagées.
- Aucun tracker, aucune analytics, aucun service tiers autre que Neon (base) et Vercel (hébergement).

## Licence

Usage personnel.