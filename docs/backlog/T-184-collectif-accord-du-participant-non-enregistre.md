---
id: T-184
titre: L'accord que coche chaque participant avant d'envoyer ses photos n'est enregistré nulle part
etat: en cours
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-19
---
## Ce que Mathias a dit
Rien : trouvé le 19/10 en vérifiant ses retours (la question des mails aux participants).

## Ce que j'ai vérifié (19/10)
- `src/app/depot/[token]/Depot.tsx:33` : la case d'accord est un `useState` local ; elle ne
  fait que débloquer le bouton « Choisir des photos » (`:82`).
- Elle n'est jamais envoyée : le corps de la déclaration (`edition/_composants/depot/moteur.ts`)
  et `api/collectif/depot/presign/route.ts` ne portent aucun champ d'accord. Le serveur accepte
  donc un dépôt sans accord, et rien ne prouve, après coup, qu'un participant a accepté le
  texte choisi par Mathias le 17/10 (PR #245), qui engage sur le droit à l'image des personnes
  photographiées.
- Même défaut connu côté particuliers (mémoire « consentement non écrit », atelier B2C).

## Ce que je propose
1. Le corps de la déclaration porte `accord: true` et la VERSION du texte accepté ; la route
   refuse sans accord (400 qui le dit).
2. L'enregistrer horodaté : une colonne sur `collectif_photos` (`accord_version`,
   `accord_le`) ou une ligne par appareil et par lien. Migration à appliquer par Mathias.
3. Le texte ne change pas (texte légal).
Lié à T-158 (la confidentialité des participants).

## Ce que j'ai choisi (19/10)
- **Deux colonnes sur `collectif_photos`** (`accord_version`, `accord_le`), plutôt qu'une table
  par appareil et par lien : la question qu'on se pose après coup est « cette photo-là, son
  auteur avait-il accepté ? ». La réponse est sur la ligne de la photo, écrite dans la MÊME
  insertion (aucune photo de participant sans son accord, aucun aller-retour de plus, aucune
  jointure sur un cookie d'appareil). Une table aurait enregistré un geste qui peut n'être suivi
  d'aucune photo, et se serait écrite à part de la photo.
- **La version**, c'est le jour du choix de Mathias : `2026-10-17`. Le texte de chaque version
  vit dans `src/lib/collectif/accord.ts` (`TEXTES_ACCORD`) ; le harnais compare le texte affiché
  à celui de la version courante : changer un mot sans nouvelle version le fait échouer.
- **L'heure est celle du SERVEUR** (celle du téléphone ne prouve rien).
- **Le repli d'écriture** : tant que la migration n'est pas appliquée, la route refuse DÉJÀ un
  participant sans accord, mais l'insertion se replie sans les deux colonnes et le serveur écrit
  « accord du participant NON enregistré » dans les journaux à chaque lot. Bloquer tous les
  participants en attendant ne protégerait personne. La PR ne se fusionne de toute façon
  qu'APRÈS la migration.

## Ce qui a été fait (19/10, branche `feat/collectif-accord-participant`, PR #266 NON fusionnée)
- `src/lib/collectif/accord.ts` (pur) : `VERSION_ACCORD`, `TEXTES_ACCORD` (une `Map` : une
  version « constructor » ne trouve rien, leçon de T-161), `lireAccord` (seulement `accord: true`
  le booléen ET une version connue), `accordExige` (le participant seul), `colonnesAccord`,
  `messageAccord` (vous / tu).
- `Depot.tsx` : cocher donne la version au moteur, décocher la retire. **Le texte n'a pas changé
  d'un caractère** (les lignes du texte sont hors du diff).
- `moteur.ts` : l'accord est gardé par photo AU MOMENT du choix (comme la provenance), un lot
  n'en mêle jamais deux, la déclaration porte `accord: true` et `accordVersion`. Un 400
  `accord_requis` finit le lot avec la phrase du serveur (avant, tout refus en 400 passait pour
  une coupure réseau et se réessayait sans fin).
- `api/collectif/depot/presign` : un participant sans accord repart en **400 `accord_requis`**
  (« Cochez l'accord pour envoyer vos photos. »), avant toute lecture du lot et toute écriture ;
  la vérification d'une reprise (lecture seule) ne le demande pas ; le responsable ne coche rien.
- `supabase/migrations/20261020_collectif_accord_participant.sql` : écrite, **PAS appliquée**.
- Harnais `verif-collectif.ts` : 16 vérifications T-184. `tsc`, `lint`, `build`, les deux
  harnais : verts.
- **Vu dans le navigateur, sans rien écrire en base** (Chrome headless sur le serveur de la
  branche, toute requête non-GET arrêtée au réseau, la déclaration recevant une réponse
  fabriquée) : sans accord le bouton est fermé ; coché, la déclaration part avec
  `accord: true, accordVersion: "2026-10-17"` ; décoché, le bouton se referme ; un refus du
  serveur s'affiche tel quel. Le serveur de la branche, appelé directement : 400 sans accord,
  avec `accord: "true"`, avec une version inconnue ou « constructor » ; la vérification d'une
  reprise 200 ; **12 photos dans l'édition avant, 12 après**.

## La migration, puis la fusion (19/10, fin d'après-midi)
1. **Migration appliquée par Mathias le 19/10 vers 15 h 30.** Vérifiée juste après, en lecture :
   `accord_version` et `accord_le` lues par PostgREST sur `collectif_photos`, aucune photo avec
   un accord à ce moment-là.
2. **PR #266 fusionnée APRÈS elle** (https://github.com/Lecrackerssurlepot/bellajour-prelaunch/pull/266),
   recalée sur `main` (PR #265 à #269 arrivées entre-temps, conflits de documentation seulement).

## Ce qui reste
3. Au premier vrai dépôt d'un participant, vérifier que la donnée ARRIVE (le repli peut la faire
   disparaître en silence, `supabase/CLAUDE.md`) :
   `select accord_version, accord_le from collectif_photos where role_deposant = 'participant' order by created_at desc limit 5;`
Les photos déjà déposées gardent un accord nul : rien ne prouve après coup ce qui a été accepté
avant (le 19/10, 12 photos sur l'unique édition ouverte, « Première édition »).
