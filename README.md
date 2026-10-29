# JS du Thier à Liège — application web (PWA)

Site du club, installable sur l’écran d’accueil des téléphones et utilisable hors ligne.
HTML, CSS et JavaScript seulement : aucune installation, aucune compilation, aucune dépendance externe.

## Mettre en ligne (Vercel)
1. Envoyer ce dossier dans le dépôt GitHub `js-thier-a-liege` (ou glisser le dossier sur vercel.com/new).
2. Framework : **Other** · pas de commande de build · dossier de sortie : `.` (racine).
3. Les en-têtes de sécurité de `vercel.json` s’appliquent automatiquement.
4. Ajouter le domaine (ex. `jsthier.be`) dans *Settings → Domains*. Le HTTPS est obligatoire pour l’installation.

Netlify ou Cloudflare Pages : même dossier, les en-têtes sont dans `_headers`.

## À faire une fois
- **Icônes PNG** : ouvrir `/tools/icons.html` sur le site en ligne, cliquer sur « Générer », puis placer les 4 fichiers dans `icons/` et republier.
- **security.txt** et **privacy.html** : remplacer `contact@jsthier.be` par la vraie adresse du club.
- **Calendrier Foot24 en direct** : décommenter l’iframe dans `index.html` (section « Le terrain »). La CSP l’autorise déjà.

## Publier une mise à jour
Modifier `VERSION` en haut de `sw.js` (ex. `v2-2026-11-15`). Les visiteurs verront « Nouvelle version disponible — Mettre à jour ».

## Sécurité
- CSP stricte : seuls les scripts et styles du site s’exécutent (`'self'`), rien en ligne, aucun `eval`.
- Trusted Types : toute écriture HTML passe par `safe-html.js` ; les pseudos sont filtrés et échappés.
- En-têtes : HSTS (preload), `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy (caméra, micro, position… bloqués), COOP/CORP.
- Liens externes en `noopener noreferrer`. Aucune donnée personnelle collectée, aucun cookie ni traceur.
- Le service worker n’intercepte que les fichiers du site, jamais Foot24 ni les réseaux sociaux.

## Compatibilité
iPhone avec iOS 15.4 ou plus récent (iPhone 6s et suivants à jour), Android avec Chrome, Samsung Internet ou Firefox récents.

## Fichiers
| Fichier | Rôle |
|---|---|
| `index.html` | page principale |
| `style.css` | mise en page mobile d’abord, thèmes clair/sombre |
| `theme-init.js` | applique le thème avant l’affichage |
| `app.js` | menu, diaporama, équipes, matchs, galerie, chargement des jeux |
| `pwa.js` | installation, mises à jour, état hors ligne |
| `sw.js` | service worker (cache et hors ligne) |
| `safe-html.js` | écriture HTML sécurisée (Trusted Types) |
| `game.js`, `runner.js`, `board.js` | jeux et top 3 |
| `manifest.webmanifest` | nom, icônes, couleurs et raccourcis de l’app |
| `offline.html`, `privacy.html` | page hors ligne, vie privée |
| `vercel.json`, `_headers` | en-têtes de sécurité et de cache |
| `tools/icons.html` | générateur des icônes PNG |
