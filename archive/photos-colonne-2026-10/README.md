# La page Photos « en colonne » (14/10/2026 au soir → 15/10/2026)

`Collecte.tsx` tel qu'il était au commit f45405f (T-152) : une COLONNE à gauche, comme un
explorateur de fichiers, qui listait « Toutes les photos », « Ma sélection », chaque dossier du
responsable avec ses sous-dossiers, puis chaque lien de contribution et, sous le lien ouvert,
chaque personne.

Remplacée le 15/10/2026 sur retour de Mathias : avec beaucoup de liens et de participants, la
colonne devenait longue et « pas très belle », et « Mes photos » n'y était qu'une liste de
dossiers. La page montre désormais des ONGLETS au-dessus des photos (Toutes, Ma sélection, Vos
dossiers, Les participants) ; les dossiers et les liens s'ouvrent en vignettes, comme des
albums, avec un fil d'Ariane. Les règles (`src/lib/collectif/dossiers.ts`) n'ont pas changé.
Hors du périmètre du build (aucun import) ; les styles de la colonne (`.ec-ph-dossiers`,
`.ec-ph-noeud`, `.ec-ph-groupe`…) restent dans `espace.css` tant qu'ils servent ailleurs.
