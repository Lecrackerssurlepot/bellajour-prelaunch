---
id: T-158
titre: La politique de confidentialité ne parle ni des participants d'une édition ni de leurs photos, et il n'existe aucun accord sur les données pour les entreprises
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux vraiment que tu enregistres dans le projet euh, tous ces problèmes-là et aussi tout ce
qu'on aura, enfin, tous ces points encore à mettre et à voir » (19/10/2026).

## Ce que j'ai vérifié
- 17/10 : `src/app/legal/content/confidentialite.ts` (450 lignes) ne contient ni « collectiv » ni
  « participant ». Or le dépôt `/depot/[token]` recueille d'un participant, qui n'est pas le
  client : un prénom et un nom facultatifs, ses photos (avec leurs métadonnées), un identifiant
  d'appareil pour compter son plafond. Le responsable d'une édition laisse son adresse, et un
  cookie d'appareil `bj_ec_appareil` (un an) existe depuis T-154.
- Le texte d'accord du dépôt est tranché (17/10, PR #245) mais il renvoie à des conditions qui ne
  sont écrites nulle part (PRD §12.12 : « les conditions détaillées » restent ouvertes).
- PRD §12.7 : l'accord sur les données (DPA) avec l'entreprise cliente est « hors outil », non
  rédigé. Une entreprise qui confie les photos de ses salariés nous en fait sous-traitant.

## Ce que je propose
Texte légal : je ne rédige rien d'office. Préparer pour Mathias une liste exacte de ce que le
B2B collecte, où c'est stocké, combien de temps, et qui le voit (tirée du code), pour qu'il la
porte à la rédaction (confidentialité, conditions du dépôt, modèle de DPA). Puis intégrer le
texte qu'il valide.

## Ce qui a été fait
Rien encore.
