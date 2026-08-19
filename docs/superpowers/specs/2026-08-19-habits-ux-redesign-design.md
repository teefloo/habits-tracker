# Refonte UX du tableau Habitudes — design

Date : 2026-08-19

## Contexte

Habitudes est un tableau de suivi hebdomadaire en français, construit en
HTML/CSS/JavaScript vanilla et servi comme PWA. La structure de données, les
routes API et le fonctionnement de synchronisation sont déjà en place. Cette
refonte vise uniquement la qualité perçue, l’ergonomie, l’accessibilité et la
robustesse responsive des écrans existants.

Direction validée : minimalisme suisse calme, avec une palette neutre et un
seul accent vert sourd. Le résultat doit rester sobre, rapide et fonctionnel,
sans dépendance externe ni élément décoratif gratuit.

## Objectifs

- Faire ressortir l’action principale : cocher une habitude dans la semaine.
- Rendre chaque contrôle confortable au clavier et au toucher.
- Donner une hiérarchie claire au header, à la semaine courante et à la grille.
- Améliorer les états auth, chargement, vide, erreur et synchronisation.
- Garantir une lecture cohérente en clair, sombre, contraste renforcé et
  réduction de mouvement.
- Préserver les garde-fous existants, notamment la confirmation inline avant
  suppression et le rechargement de l’état après mutation.

## Périmètre

### Écrans et composants

1. `index.html`
   - renforcer la structure sémantique des vues boot, auth, app et blocked ;
   - ajouter les éléments nécessaires aux retours d’état accessibles ;
   - ajouter un contrôle afficher/masquer le mot de passe sans modifier le
     contrat API ;
   - garder tous les textes visibles en français.
2. `styles.css`
   - consolider les tokens de couleur, surface, ombre, rayon et mouvement ;
   - améliorer la hiérarchie typographique sans charger de police externe ;
   - passer les contrôles tactiles critiques à au moins 44 px ;
   - renforcer les états hover, pressed, focus, disabled et busy ;
   - conserver le scroll horizontal limité à la matrice avec première colonne
     sticky ;
   - adapter l’entête, le formulaire et les messages aux petits écrans.
3. `app.js`
   - conserver le flux `GET /api/state` comme source unique de vérité ;
   - exposer les changements de mutation via une région live discrète ;
   - maintenir les libellés accessibles et la confirmation de suppression ;
   - éviter toute mise à jour optimiste ou stockage local des données.
4. `auth.js`
   - conserver les vues et les routes existantes ;
   - synchroniser le contrôle afficher/masquer avec `type` et `aria-pressed` ;
   - conserver les messages d’erreur et les états busy ;
   - restaurer le focus sur le premier champ pertinent lors d’un changement de
     formulaire ou après une erreur.
5. `sw.js` et `manifest.json`
   - incrémenter le cache du service worker si un asset shell change ;
   - aligner les couleurs PWA sur le nouveau fond visuel.

## Direction visuelle

- Fond clair légèrement teinté, surface de carte lisible et séparée par une
  bordure fine plutôt qu’un effet de verre omniprésent.
- Fond sombre charbon, jamais noir pur, avec variantes d’accent plus claires et
  désaturées pour conserver le contraste.
- Une échelle d’espacement 4/8 px et des rayons différenciés : carte plus
  douce, contrôles plus compacts.
- Titre de page plus présent, libellés secondaires moins bruyants et nombres
  en chiffres tabulaires.
- Icônes SVG existantes conservées avec une épaisseur homogène ; aucun emoji ni
  nouveau kit d’icônes.
- Mouvement court et utile : retour pressé, apparition de confirmation,
  progression de coche et indicateur busy. Tout est neutralisé ou réduit via
  `prefers-reduced-motion`.

## Interactions et accessibilité

- Tous les contrôles restent des éléments natifs `button` ou `input`.
- Les boutons iconographiques gardent un nom accessible explicite.
- Les toggles conservent `aria-pressed`, `aria-busy` pendant la synchronisation
  et un libellé incluant l’habitude, la date et l’état.
- Les erreurs de formulaire restent dans une région `role="alert"` proche du
  formulaire, sans bloquer le collage ou les gestionnaires de mots de passe.
- Les cibles de touch sont dimensionnées à au moins 44 × 44 px, avec un écart
  suffisant entre contrôles adjacents.
- La navigation au clavier garde l’ordre visuel ; le focus reste visible et
  n’est pas masqué par le header sticky.
- La grille reste scrollable horizontalement sur mobile, car les sept jours
  doivent rester présents. La première colonne des habitudes reste sticky et
  le scroll n’est utilisé qu’à l’intérieur de cette matrice.
- La suppression reste en deux temps avec retour automatique après quatre
  secondes et restauration en cas d’échec réseau.

## Flux de données et erreurs

Le flux backend ne change pas :

```text
auth.js init()
  → GET /api/me
  → 200 : app.loadState()
  → GET /api/state
  → render()
```

Après un toggle, un ajout ou une suppression, le bouton concerné est désactivé
pendant la requête, puis l’état est rechargé depuis `/api/state`. En cas de
401, la page est rechargée comme aujourd’hui. En cas de 503, de perte réseau ou
d’erreur API, le message existant est conservé et reçoit un chemin de reprise
visible.

## Vérification

- `node --check` sur les fichiers JavaScript frontend et backend.
- Vérification de la présence du nouveau cache shell dans `sw.js`.
- Dump DOM avec et sans backend : écran maintenance, écran connexion et vues
  d’erreur.
- Contrôle manuel ou headless à 375, 768, 1024 et 1440 px, en clair et sombre.
- Vérification de la colonne sticky et du scroll horizontal de la grille.
- Vérification du focus clavier, des libellés ARIA, des états `aria-pressed` et
  `aria-busy`, de l’ajout, de la suppression et de la récupération réseau.
- Vérification avec `prefers-reduced-motion: reduce`.

## Hors périmètre

Pas de nouvelle route, migration de données, bibliothèque UI, police distante,
fonctionnalité métier supplémentaire, stockage local ou changement de schéma.
