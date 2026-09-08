---
id: T-102
titre: Trente-sept images sont déployées à chaque build sans que rien ne les demande
domaine: front
gravite: confort
autonomie: libre
ouvert: 2026-09-07
---

## Ce que j'ai vérifié (07/09/2026)

Sur les fichiers de `public/images/` **suivis par git** — donc réellement déployés —
**37 ne sont référencés nulle part** dans `src/` ni `scripts/` : **4,2 Mo** partent à chaque
build pour rien. L'essentiel vient de `lancement/galerie/` et `lancement/avis/`, dont les
consommateurs (`archive/lancement/components/Avis.tsx`, `archive/lancement/galerie-covers.ts`)
sont archivés depuis le retrait de `/lancement` (D13).

Deux images de mail traînent aussi : `decor-album-email.png` (1,7 Mo à elle seule) et son
jumeau `.jpg`.

⚠️ À ne pas confondre avec les 90 Mo de `public/images/prevente/` et
`public/images/Préventes-Section-2/` : ceux-là ne sont **pas suivis par git**, donc jamais
déployés. Ils ne pèsent que sur le disque de Mathias, conformément à D4.

**Coût réel pour une cliente : nul.** Ces fichiers ne sont jamais demandés par une page, donc
jamais téléchargés. Ils ne coûtent que du temps de déploiement et du stockage. C'est pour ça
que ce ticket est en `confort` et pas plus haut.

## Le piège, et c'est lui qui compte

**Une image de mail n'apparaît dans aucune recherche de code.** Les templates référencent des
URL absolues : `scripts/mails-atelier.mjs:269` charge
`https://www.bellajour.fr/logo-mail-cuivre.png`, et rien dans `src/` ne le mentionne. Vérifié
le 07/09 : ce logo répond bien en 200 (38 Ko).

Supprimer une image « non référencée » sans avoir cherché dans les mails **casserait l'image
d'un mail déjà parti chez une cliente**, sans que rien ne le signale. Les `decor-album-email.*`
n'apparaissent pas dans les mails versionnés, mais un template retouché à la main dans Brevo
ne se voit pas d'ici.

## Ce que je propose

Avant tout déplacement : lister les images référencées par les templates Brevo **en
interrogeant Brevo**, pas le dépôt. Puis déplacer (jamais supprimer) vers
`archive/public-orphelins/`, où le ménage de T-003 a déjà envoyé 13 Mo.

Rien ne presse : le gain est un temps de build, pas une page plus rapide.

## État

`nouveau` — constat prouvé, correctif volontairement différé.

## Ce qui a été fait (08/09/2026)

Le piège annoncé s'est refermé sur deux fichiers, et c'était le bon réflexe de le poser.

**D'abord Brevo, ensuite le dépôt.** L'API Brevo a été interrogée (39 templates, contenu HTML
complet) et croisée avec les 37 candidats. Deux d'entre eux sont **vivants** :

- `instagram.png` — dans **18 templates actifs** (W1 à W6, P1 à P3, A1 à A3, F1, S1, ERR,
  changement de format fondateurs) ;
- `decor-album-email.jpg` — dans **3 templates actifs** (W3, et deux « W2 W3_step_#5 »).

Un `grep` sur `src/` et `scripts/` ne voyait ni l'une ni l'autre. Les déplacer aurait cassé
l'image de mails déjà reçus par des clientes.

**Les 35 autres sont archivées** dans `archive/public-orphelins/images/` (`git mv`, jamais
supprimées, retour par le geste inverse) : 27 vignettes de `lancement/galerie/`, 3 portraits de
`lancement/avis/`, les 3 `ui/signature.*`, `ui/bellajour-blanc.webp` et
`decor-album-email.png` (le `.png` seul — son jumeau `.jpg` est celui que Brevo appelle).

**3,9 Mo retirés du déploiement.** Le poids suivi par git dans `public/` passe de 9,0 à 5,1 Mo.
Le gain reste un temps de build : ces fichiers n'étaient jamais téléchargés par personne.

Le détail et l'avertissement sont dans `archive/public-orphelins/README.md`.

### Trouvé en chemin, sorti en ticket

Le template Brevo **13** (« Waitlist - Séquence W2 W3_step_#5 », actif) appelle
`https://www.bellajour.fr/images/Bellajour_bleu.png` qui **répond 404**. Voir **T-103**.

## État

`fermé` — 35 images archivées, 2 conservées avec la preuve de leur usage.
