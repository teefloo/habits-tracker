# Habitudes

Suivi d'habitudes personnel, minimal et local : une grille hebdomadaire (habitudes × 7 jours) où chaque case se coche d'un simple clic.

> Démo : [habitudes-tracker.vercel.app](https://habitudes-tracker.vercel.app)

## Pourquoi

Un tracker d'habitudes sans compte, sans inscription, sans serveur. Les données vivent dans le `localStorage` du navigateur et n'en sortent jamais. Pas de dépendance, pas de build, pas de framework — trois fichiers, ouvrables tels quels.

## Fonctionnalités

- **Grille hebdomadaire** lundi → dimanche, avec la semaine courante en évidence
- **Suivi en un clic** : cocher / décocher une habitude, avec compteur `n/7` par habitude
- **Ajout et suppression** d'habitudes (suppression confirmée en deux temps pour éviter les erreurs)
- **Navigation par semaine** (‹ › et retour à « Aujourd'hui »)
- **Thème clair / sombre** automatique, respect de `prefers-reduced-motion`
- **Responsive** : grille pleine largeur sur desktop, colonne des habitudes épinglée et défilement horizontal sur mobile
- **PWA installable** : fonctionne hors ligne, icône d'accueil — « Ajouter à l'écran d'accueil » sur iPhone (Safari → Partager → Sur l'écran d'accueil)
- **Accessible** : contrastes AA, focus visibles, attributs ARIA

## Démarrage rapide

Aucune installation. Le site se lance comme un fichier statique :

```sh
open index.html
```

Ou via un serveur local :

```sh
python3 -m http.server 8000
# puis http://localhost:8000
```

## Déploiement

Le site est conçu pour être servi par n'importe quel hébergeur statique (Vercel, Netlify, GitHub Pages…). Aucune configuration de build n'est nécessaire.

```sh
vercel --prod
```

## Structure

```
index.html            Coquille de la page (en-tête, grille, formulaire)
styles.css            Tout le style : tokens, thèmes clair/sombre, grille
app.js                Toute la logique : état, localStorage, rendu, interactions
manifest.json         Métadonnées PWA (nom, icônes, standalone)
sw.js                 Service worker : cache offline de l'application
icon-512.png          Icône PWA 512 px
icon-192.png          Icône PWA 192 px
apple-touch-icon.png  Icône iOS (écran d'accueil)
```

## Confidentialité

Les données (habitudes et cases cochées) sont stockées uniquement dans le navigateur, sous la clé `habits-tracker.v1`. Rien n'est envoyé sur un serveur — le site est utilisable même hors ligne.

## Licence

Usage personnel.