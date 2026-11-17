---
id: T-215
titre: L'éditeur ne sait pas lire les photos lui-même : la lecture IA n'arrive que par un fichier préparé à côté
etat: en pause
domaine: atelier
gravite: serieux
autonomie: avis-requis
ouvert: 2026-11-17
---
## Ce que Mathias a dit
Le 17/11, après l'essai de lecture IA sur son dossier « Test 2 » (57 photos, deux passes et un banc de stabilité), il a validé le plan :
un entonnoir pour limiter le coût, où l'IA ne trie rien mais pose des tags que l'atelier trie, et un bouton « Lire les photos » dans
l'éditeur interne de mise en page.

## Ce que j'ai vérifié
Le 17/11, sur main (02ef6806) :
- La lecture IA (lot F, C14) ne se CHARGE que par le bouton « Premier jet », depuis un fichier JSON préparé hors de l'éditeur
  (`[id]/PremierJet.tsx`, `editeur/lectureIA.ts`). Aucune route n'appelle un modèle.
- Le format v1 n'a ni sujet, ni texte lisible, ni moment, ni correction de l'atelier (`lirePhoto` refuse toute autre clé).
- La contrainte `mep_lecons.type` (migration 20261110) ne connaît pas de leçon de correction de tag.
- Constat confirmé.

## Ce que je propose
Le plan validé : A local (la lecture de l'éditeur, gratuite), B planches de 16 vignettes lues par gpt-5.4, C regard fin par gpt-5.1 sur
les candidates (au plus un quart) et les photos à texte lisible ; une lecture IA version 2 ; des tags de rôle et de sujet corrigeables
d'un clic, chaque correction devenant une leçon. Les photos de clients attendent T-203 (création libre seulement).

## Ce qui a été fait
17/11, branche `feat/mise-en-page-lire-les-photos` (poussée, pas de PR) :
- Module pur `src/lib/mise-en-page/editeur/lireLesPhotos.ts` : modèles, prix datés (13/11), consignes et schémas de l'essai repris
  tels quels, corps de requête, relecture stricte, coût, entonnoir, estimation, conversion en lecture v2, correction et leçon.
- Lecture IA **version 2** (`editeur/lectureIA.ts`) : `sujet`, `candidate`, `texte`, `regard`, `corrige` par photo, `lecture` à la
  racine ; la v1 se lit comme avant.
- Route `POST /api/admin/atelier/mise-en-page/lecture-ia` (admin, `maxDuration = 60` littéral, deux nouvelles tentatives sur 429 et
  5xx, rien en base) ; 403 `photos_clients_non_autorisees` hors création libre, 503 `openai_absente` sans clé.
- Écran : bouton « Lire les photos » (`[id]/LireLesPhotos.tsx`, pixels dans `[id]/lireLesPhotosClient.ts`), annonce du coût,
  progression, « Arrêter », « Relire tout », coût réel à la fin ; tags lus sur la vignette et petit choix de correction ; Lecture (L).
- Leçon `tag_corrige` (règle IA) ; migration `20261117_mep_lecons_tag_corrige.sql` ÉCRITE, pas appliquée (sans elle, ces leçons-là
  sont dites `perdues` par la route, les autres partent).
- Harnais : `scripts/verif-mep-lire-les-photos.ts` (37 vérifications, réponses simulées). Règles R188 à R196, D31 proposée.
- Vu dans le navigateur (build local sans base, réponses d'OpenAI simulées dans la page) : annonce, progression, tags planche par
  planche, regard fin, « Lu : 20 photos · 0,17 $ » (coûts simulés), correction en bleu, Lecture (L), planches de 1 536 px.

## Ce qui reste
- **Recette réelle** sur de vraies photos (création libre), avec la vraie clé : coût réel contre l'estimation.
- Mathias valide D31 ; applique la migration 20261117 (avis requis).
- Les photos de clients : T-203 (politique de confidentialité, accord de Mathias), puis `MEP_LECTURE_IA_CLIENTS=1`.
