# Fichiers publics sans rôle — sortis de `public/`, jamais supprimés

Archivés le 31/08/2026 (T-018). Ils étaient servis à qui connaissait l'URL, sous notre nom de
domaine. Aucun code ne les référençait. Ils reviennent par un `git mv` inverse.

| Fichier | Venait de | Ce que c'est |
|---|---|---|
| `preview-anxiete.html` | `public/preview-anxiete.html` | preview HTML d'une section archivée |
| `hero.css` | `public/hero.css` | sa feuille de style, hors du pipeline de build |
| `c92a0e44-8808-4b6e-af83-8cd186025fdd.html` | `public/c92a0e44-…html` | ⚠️ voir ci-dessous |
| `bellajour-atelier-maquette-v2.html` | racine du dépôt (gitignoré, il le reste ici) | maquette v2 de l'atelier, 28 Ko |

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
