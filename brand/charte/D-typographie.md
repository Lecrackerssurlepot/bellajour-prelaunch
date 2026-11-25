# D. Typographie

## Les quatre rôles

| Rôle | Police | Réglages | Usage |
|---|---|---|---|
| **Titre** | Fraunces | 560 (720 en « gras »), axes `SOFT 40, WONK 0, opsz 96`, approche -0,018 em, interligne 1,02 | Tous les titres, h1 à h3 |
| **Signature** | Interlope | 400, approche 0, interligne 1,12 | Une phrase **seule** à l'écran, une fois par écran, 40 px au moins. Jamais pour un titre de section, un prix, un bouton ou une étiquette. |
| **Texte** | Inter Tight | 400, et 500 pour les boutons | Paragraphes, boutons, champs, navigation |
| **Étiquette** | Inter Tight | 500, capitales par le CSS, approche 0,12 em, interligne 1,3, 12 px | « AVANT D'OUVRIR », numéros, sur-titres |
| *Magazine* | Instrument Serif | 400, approche -0,02 em, interligne 0,95 | **Le titre imprimé sur le magazine**, et rien d'autre |

Les licences ont été vérifiées : Fraunces, Inter Tight et Instrument Serif sont sur Google Fonts
(OFL). Interlope est en OFL 1.1 (`assets/typo/LICENCES.md`). On peut toutes les servir sur le
web.

## L'échelle

Les tailles sont fluides : de 360 px à 1440 px d'écran, sans saut.

| Jeton | Ordinateur et téléphone (`clamp`) | Téléphone ≤ 700 px |
|---|---|---|
| `taille.etiquette` | 12px | = |
| `taille.petit` | 14px | = |
| `taille.bouton` | 15px | = |
| `taille.base` | clamp(16px, 15px + .25vw, 18px) | = |
| `taille.chapo` | clamp(18px, 16px + .45vw, 22px) | = |
| `taille.h3` | clamp(26px, 20px + 1.2vw, 36px) | = |
| `taille.h2` | clamp(40px, 28px + 3vw, 76px) | = |
| `taille.h1` | clamp(52px, 32px + 5vw, 116px) | 44px |
| `taille.display` | clamp(72px, 40px + 8vw, 168px) | = |
| `taille.champ` | 16px, jamais moins (sinon iOS zoome) | = |

- **Facteur des titres** : `police.titre.facteur` = 0,9, qui multiplie h1, h2 et h3.
- **Exceptions nommées** (tranché le 25/11), les seules tailles hors échelle :
  - `signature-accueil`, `frise-mot`, `frise-tete`, `frise-nom` ;
  - `legende-livre`, `filigrane-pied`, `signature-pied`, `menu-lien`, `bandeau`.
  - Valeurs dans `tokens.json`. Une nouvelle exception s'ajoute là, avec un nom, jamais en dur.
- **Interligne** : texte 1,6 ; chapo 1,5 ; légal 1,7.
- **Longueur de ligne** : 60 ch pour le texte, 44 ch pour le chapo, 72 ch pour le légal.
- **Chiffres** : `font-variant-numeric: tabular-nums` dans les tableaux, les prix alignés et les compteurs.

## Chargement

- **Un seul fichier** charge les polices du site : `src/app/polices.ts`, avec `next/font`. Il sera créé en phase 4.
- `font-display: swap` partout.
- **Sous-ensemble** `latin` et **axes** limités à ceux qu'on utilise : Fraunces `opsz, SOFT, WONK`, graisses de 400 à 720.
- **Polices de secours** : Georgia pour Fraunces et Instrument Serif ; Helvetica Neue puis Arial pour Inter Tight.
- **Mails** : jamais de webfont, uniquement `police.mail.*`.

## Changer de police (marche à suivre)

Les polices sont rangées **par rôle**. Changer une police ne touche aucune page.

1. Dans `brand/tokens.json`, changer `police.<rôle>.famille` (et la graisse ou les axes si besoin).
2. Dans `src/app/polices.ts`, remplacer l'import `next/font/google` de l'ancienne police par la nouvelle. Next exige un import écrit en toutes lettres ; c'est la seule ligne de code.
3. Garder la même `variable` (`--police-<rôle>`) dans l'appel : c'est le relais que lit `tokens.css`.
4. Lancer `node brand/scripts/build-tokens.mjs`, puis regarder `/brand`.

Une police payante ou issue de `assets/typo/` : vérifier d'abord sa licence (servir une police
sur le web, c'est la redistribuer).

## Exemples

- ✅ Un titre Fraunces 560, une phrase Interlope seule au centre de l'écran.
- ❌ Interlope dans un bouton, dans un prix, ou à 24 px.
- ❌ Une taille `font-size: 19px` écrite en dur.
