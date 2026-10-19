---
id: T-159
titre: Rien n'efface les photos d'une édition collective après la livraison, et aucune durée n'est fixée
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
- PRD §12.5 « Délai de suppression des photos après livraison » : ouvert. T-146 le range dans
  « plus tard » (script sur le modèle d'`anonymiser-dossiers.ts`).
- `scripts/anonymiser-dossiers.ts` (T-076) ne traite que les dossiers particuliers (`numeros`) :
  les photos des éditions (`collectif_photos`, coffre R2) n'ont aucune fin.
- Une édition archivée garde tout (geste « Archiver » : « Rien n'est effacé »). C'est voulu pour
  « Récupérer », mais sans délai, une archive devient une conservation sans limite.

## Ce que je propose
Mathias fixe le délai (et s'il diffère pour les photos retenues dans le magazine). Ensuite : un
script en lecture seule par défaut, `--vraiment` pour agir, sur le modèle d'`anonymiser-dossiers`,
qui efface le coffre d'une édition livrée depuis plus que ce délai, journalisé. Le délai écrit
devra aussi entrer dans la politique de confidentialité (T-158).

## Ce qui a été fait
Rien encore.
