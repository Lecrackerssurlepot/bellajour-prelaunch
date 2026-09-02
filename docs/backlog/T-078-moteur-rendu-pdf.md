---
id: T-078
titre: Aucun moteur ne transforme les gabarits de mise en page en PDF imprimable
domaine: atelier
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-30
---
## Ce que Mathias a dit
« Que le PDF s'adapte au produit directement sur la fiche admin, qu'on puisse voir le
résultat avant impression. »
## Ce que j'ai vérifié
Le dépôt ne fabrique aucun PDF : la maquette se compose dans Canva, l'admin dépose des PDF
finis à la main. 65 gabarits JSON de mise en page + leur schéma existent à la racine
(`bellajour_layout_template.schema/`) mais sont HORS GIT (décision D8) et lus par aucun code.
L'étape 0 (voir les PDF déposés + contrôle technique sur la fiche admin) a été livrée le 30/08.
## Ce que je propose
Le vrai chantier, par étapes, chacune utile seule :
1. Specs produits relevées chez Cloudprinter (T-077, prérequis).
2. Versionner les gabarits JSON dans `src/` — rouvre la décision D8, d'où l'avis-requis.
3. Un composant de rendu HTML des gabarits (les coordonnées 0→1 se projettent sur le format +
   fond perdu) → aperçu du produit fini sur la fiche admin.
4. Export PDF print-ready du même rendu (Chromium hors Vercel — une fonction Vercel ne
   tiendra pas 50 pages en 300 DPI), en single-part R2 pour préserver l'égalité ETag=md5
   qu'exige l'envoi Cloudprinter.
C'est le chantier qui sort l'atelier de Canva — plusieurs séances, à planifier.
**Question pour Mathias** : d'accord pour versionner les gabarits (étape 2) ?
## Ce qui a été fait
30/08 : étape 0 livrée (aperçu des PDF déposés + contrôle pages/dimensions sur la fiche).

02/09 : **la formule d'épaisseur du dos est trouvée** (le verrou géométrique le plus dur), via la
doc Cloudprinter atteinte par le gabarit `templates/2216`. Consignée dans
`docs/reference/SPECS-CLOUDPRINTER.md` avec sa source, ses coefficients (bulk, terme couverture) et
l'application chiffrée (24 p → 2,40 mm, 32 p → 2,87 mm, 50 p → 3,93 mm). Le `constat` de largeur
`cover` d'`impression.ts:224-227` pourra donc devenir un **vrai calcul**
(`largeur_cover = 2×(210+3) + dos_mm`), paramétré par le grammage (T-028 non tranché). Profil
couleur exigé : Coated FOGRA39. Restent : versionner les gabarits (étape 2) et le moteur de rendu.
