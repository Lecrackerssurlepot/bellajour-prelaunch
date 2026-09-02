---
id: T-090
titre: Admin — planche couverture uploadée, découpage centré, doubles pages à la demande, drag-and-drop
domaine: admin
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-02
---
## Ce que Mathias a dit (02/09, brouillon)
« Il faut revoir l'admin et cette partie-là. »
- **Nous envoyons la 1ère et la 4ème sur une seule planche**, et l'outil **propose un découpage
  pile bien centré entre les deux**. On veut avoir la planche d'un coup, la 1ère, la 4ème.
- Pouvoir mettre **2 doubles pages, voire 3** — qui **ne s'affichent que si on le souhaite**.
- **Le drag-and-drop doit être au centre aussi, pour aider à travailler plus vite.**
- L'affichage (côté client) se fait par rapport à ce que nous avons décidé d'uploader.

## Ce que ça implique (à cadrer)
Refonte de la publication d'aperçu côté `/admin/atelier` :
1. Uploader **une planche** (1ère+4ème côte à côte) au lieu d'images séparées.
2. Un **curseur de découpage** (pile centré par défaut, ajustable au drag) qui fixe la ligne de
   coupe → dérive 1ère seule / 4ème seule / planche entière **sans re-générer d'image**.
3. Ajouter **0 à 3 doubles pages**, chacune activable/désactivable (« montrée » ou non au client).
4. **Drag-and-drop** pour ordonner/positionner rapidement les planches.
5. La structure enregistrée alimente la visionneuse client (T-089).

## À trancher / données manquantes
- La **structure de données** exacte (remplace/étend `apercu_urls`) : planche + position de coupe
  + liste ordonnée de doubles pages avec drapeau « visible ».
- Où vivent les images (R2 ? mêmes fichiers que l'impression, cf. T-078 ?).
- Compatibilité avec le flux de retouches (`retouches_demandees_le`, M5) et l'auto-validation.
