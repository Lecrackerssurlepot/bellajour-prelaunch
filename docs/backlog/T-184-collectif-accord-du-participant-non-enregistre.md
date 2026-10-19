---
id: T-184
titre: L'accord que coche chaque participant avant d'envoyer ses photos n'est enregistré nulle part
etat: nouveau
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

## Ce qui a été fait
Rien encore.
