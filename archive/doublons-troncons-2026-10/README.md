# Les doublons par tronçons, sans regroupement exact (13/10/2026 → 20/10/2026)

`src/lib/collectif/doublons.ts` tel qu'il était avant T-170 : le principe des tiroirs (trois
tronçons de 22, 21 et 21 bits), puis TOUTES les paires d'un même tiroir comparées une à une,
chaque paire notée dans un `Set` de chaînes (`"i:j"`) et mesurée par `distanceHamming` (une
expression régulière et seize `parseInt` par appel).

Remplacé le 20/10/2026 (T-170) parce que le coût explosait dès que beaucoup de photos portent la
MÊME empreinte (une rafale, des captures, des images noires) : elles tombent toutes dans le même
tiroir. Mesuré avec ce fichier, en exécutant le vrai module (banc du 20/10, même machine) :
2 000 photos variées 6,9 ms ; 400 identiques sur 2 000 : 1 785 ms ; 1 000 identiques sur 2 000 :
24 146 ms ; 2 000 empreintes distinctes qui partagent leur premier tronçon : 3 519 ms. L'audit
du 19/10 avait relevé 4,6 / 1 072 / 16 229 ms, et ce calcul tournait à CHAQUE page de la grille
et à chaque ouverture de la fiche de l'atelier.

La version qui le remplace donne les MÊMES groupes (le harnais la confronte à
`groupesDeDoublons` du B2C) : elle regroupe d'abord par empreinte exacte (coût linéaire), ne
compare que des empreintes DISTINCTES, saute toute paire déjà réunie et toute paire de deux
groupes déjà dissous, compte les bits sur deux entiers de 32 bits, et s'arrête franchement
au-delà d'un budget de comparaisons (aucune remarque plutôt qu'une remarque fausse).

Hors du périmètre du build (`archive` est exclu de `tsconfig.json` et du lint) ; rien ne
l'importe.
