# Fichiers publics sans rôle — sortis de `public/`, jamais supprimés

Archivés le 31/08/2026 (T-018). Ils étaient servis à qui connaissait l'URL, sous notre nom de
domaine. Aucun code ne les référençait. Ils reviennent par un `git mv` inverse.

| Fichier | Venait de | Ce que c'est |
|---|---|---|
| `preview-anxiete.html` | `public/preview-anxiete.html` | preview HTML d'une section archivée |
| `hero.css` | `public/hero.css` | sa feuille de style, hors du pipeline de build |
| `c92a0e44-8808-4b6e-af83-8cd186025fdd.html` | `public/c92a0e44-…html` | ⚠️ voir ci-dessous |
| `bellajour-atelier-maquette-v2.html` | racine du dépôt (gitignoré, il le reste ici) | maquette v2 de l'atelier, 28 Ko |

## Dossiers d'assets de la prévente archivée (T-003, 02/09/2026)

Sortis de `public/` le 02/09/2026. Restes de l'archivage de la prévente (D13) : le code était
déjà parti dans `archive/`, ces assets étaient restés dans `public/` et voyageaient dans chaque
déploiement Vercel sans être servis à personne. **Zéro référence dans `src/`** (grep confirmé,
02/09). Ils reviennent par un `git mv` inverse.

| Dossier | Venait de | Poids | Ce que c'est |
|---|---|---|---|
| `prevente/` | `public/images/prevente/` | ~10 Mo | visuels + **5 vidéos `.mp4`** de la landing de prévente (header, parcours, album-demo, objet, social-proof) |
| `solution/` | `public/images/solution/` | ~2,2 Mo | 15 `.webp` de la section « solution » (casting, upload) de la prévente |

Le ménage a fait passer `public/` de ~22 Mo à ~9 Mo. Les autres orphelins listés par l'audit du
29/08 (`Préventes-Section-2/`, `lancement/avis/Margaux.png`, `Aude.jpg`) avaient **déjà** disparu
avant cette passe : le chiffre « 101 Mo » de la fiche T-003 datait du 29/08 et était périmé.

⚠️ **Non touchés, car VIVANTS** : `public/images/lancement/galerie/` (`Univers.tsx`, `Corps.tsx`),
`public/images/header-bellajour.webp` et `public/images/ui/logo.webp` (`opengraph-image.tsx`).

## ⚠️ Le fichier UUID ressemble à une vérification de domaine

`c92a0e44-8808-4b6e-af83-8cd186025fdd.html` ne contient QUE son propre UUID (36 octets). C'est
la signature typique d'un fichier de **vérification de propriété de domaine** (Brevo, Meta,
TikTok… proposent ce mécanisme « hébergez ce fichier »). Si un service re-vérifie le domaine et
échoue, c'est probablement lui : le remettre dans `public/` avec un `git mv` inverse suffit.
Mathias saura quel service l'a demandé ; personne d'autre ne peut le deviner.

Décision du 31/08 (chef d'orchestre) : `c92a0e44-8808-4b6e-af83-8cd186025fdd.html` a été
REMIS dans `public/` — signature d'un fichier de vérification de propriété de domaine
(Brevo/Meta/TikTok) ; le retirer risquait de casser une re-vérification, et la
délivrabilité est un sujet sensible (T-022). 36 octets inoffensifs : il reste servi tant
qu'on n'a pas identifié le service qui l'a demandé.

## Images jamais demandées par une page (T-102, 08/09/2026)

Trente-cinq images sorties de `public/images/` le 08/09/2026 : **3,9 Mo** qui partaient dans
chaque déploiement sans qu'aucune page ne les demande. Coût pour une cliente : nul, elles
n'étaient jamais téléchargées. Elles reviennent par un `git mv` inverse.

| Dossier | Venait de | Ce que c'est |
|---|---|---|
| `images/lancement/galerie/` | idem | 27 vignettes de destinations de la page `/lancement`, archivée avec elle (D13). Son consommateur `archive/lancement/galerie-covers.ts` est déjà ici |
| `images/lancement/avis/` | idem | 3 portraits d'avis, consommateur `archive/lancement/components/Avis.tsx`, déjà ici |
| `images/ui/signature.{png,svg,webp}` | idem | signature manuscrite, plus appelée nulle part |
| `images/ui/bellajour-blanc.webp` | idem | logo blanc en webp, plus appelé nulle part |
| `images/decor-album-email.png` | idem | 1,7 Mo. Le **`.png`** seulement : voir l'avertissement ci-dessous |

### ⚠️ Deux images de `public/images/` sont RESTÉES, et il ne faut pas les toucher

Elles n'apparaissent dans aucune recherche de code, parce que les templates Brevo les appellent
par URL absolue. Vérifié le 08/09/2026 en interrogeant l'API Brevo, pas le dépôt :

- **`instagram.png`** — citée par **18 templates actifs** (W1 à W6, P1 à P3, A1 à A3, F1, S1,
  ERR, et le changement de format fondateurs) ;
- **`decor-album-email.jpg`** — citée par **3 templates actifs** (W3 et deux W2/W3_step_#5).

Les déplacer casserait l'image de mails déjà partis chez des clientes, sans que rien ne le
signale. Le `.png` du même nom, lui, n'est cité nulle part : c'est celui qui a été archivé.

**La règle qui vaut au-delà de ce ménage : avant de déplacer une image de `public/`, interroger
Brevo, pas seulement `grep`.**
