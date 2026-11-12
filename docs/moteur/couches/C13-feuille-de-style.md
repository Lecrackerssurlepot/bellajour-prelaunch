# C13 : la feuille de style du magazine (paire de polices, nuancier, typographie française)

**Statut (12/11, lot C)** : sur la branche `feat/mise-en-page-feuille-de-style`, non fusionnée. Règles R120 à R124.

## Ce qu'elle fait
- **Propose** une paire de polices (catalogue fermé de 18, avec humeur) et un nuancier à six rôles d'après les palettes des photos du
  magazine (R92 reliée aux aplats) ; **applique** sur demande, à tout le magazine, à l'écran, dans l'IDML et dans le PDF.
- Le choix reste à l'atelier : la machine propose, des règles nommées décident de la proposition, l'atelier clique. Rien n'est appliqué d'office.

## Où
- `src/lib/mise-en-page/style.ts` (catalogue, niveaux, `styleValide`, rôles et alias de teintes), `nuancier.ts` (`proposerNuancier`, mesures de
  couleur, CIEDE2000, contraste), `francais.ts` (typographie française) ; le geste `styler` dans `editeur/stylage.ts` et `plans.ts`.
- Écran : `[id]/StylePanneau.tsx`, `[id]/polices.ts` (next/font/google, 30 familles, `preload: false`), `[id]/layout.tsx`.
- Export : `idml.ts` (polices, nuances, styles), `pdf.ts` (polices embarquées par `@pdf-lib/fontkit`), `scripts/polices-pdf.ts` (copie dans `public/polices/`).

## La couverture (12/11, après la fusion du lot B)
Le style gouverne aussi la couverture à plat : `SceneCouverture.tsx` (variables CSS du style), `construireIdmlCouverture` (mêmes fabriques que l'intérieur :
polices nommées, six nuances, styles Titre / Texte / Légende, rectangle « Papier ») et `planPdfCouverture` (polices embarquées dans le PDF de couverture).
Le corps du mot-titre de la 1re est recalculé avec la police de TITRE choisie (`mesureMotTitre(style)` donne la mesure à `tailleMotTitre` : chasses de la
police, capitales et approche de la paire) ; sans style, chasses d'Arial Bold comme avant (empreinte au harnais). Le mot-titre fait toujours au moins
60 % de la 1re.

## Un titre ne se coupe jamais (12/11, après la recette du lot C)
Sous un style, le corps d'un TITRE d'intérieur est ajusté à son cadre avec les chasses de sa police (`ajusterTitre`, style.ts, appelé par `texteStyle`
quand on lui passe le texte et le cadre) : les mots restent entiers, les lignes se coupent aux espaces, la hauteur de l'encre (première ligne de base,
interlignage, descente hors capitales) tient dans le cadre. On ne grossit jamais : au plus le corps du gabarit. L'écran (`cadresPlanche`), le PDF
(`planPdf`) et l'IDML (`texteXml`) lisent ce même corps, donc le même titre. Si le corps minimal (`REGLAGES_TITRE.CORPS_MIN`, 14 pt, réglage de départ) ne
suffit pas, le minimum est gardé et le contrôle avant export dit « Titre trop long · planche N » (`titresTropLongs`, en rouge, il ne bloque pas).
Sans style, rien ne change (le rendu d'avant garde son empreinte). Textes et légendes ne sont pas ajustés. La couverture garde le calcul de son mot-titre.
Harnais : chaque gabarit à mot géant (titre de 60 pt et plus) × les dix-huit paires × trois titres longs, mesurés dans la vraie police (fontkit, crénage compris).

## Réglages
Nommés et commentés dans `nuancier.ts` (`REGLAGES_NUANCIER`, pas dans `editeur/reglages.ts` : le module est pur et sans leçons ; à y rapatrier si une
leçon doit un jour les emporter). Réglages de DÉPART : ombre nulle sous L 22, pleine dès L 34 ; teinte franche à pleine voix dès C 30 ; famille à 12° ;
récurrence 0,15 ; contraste du titre 3 et du texte 4,5.

## Rejeu sur de vraies photos (12/11, cache du cycle 1)
Madère (60 photos) : aplat sourd bleu de mer #3b608e (L 40, C 29), accent tuile #a5684a, papier blanc. Madrid (59 photos) : aplat bleu de ciel #7d97c7,
accent brique #783e37. Lara : aplat bleu, accent rouge #a83826 (le rouge en touche du coloriste). Avant la correction « une ombre n'est pas un aplat »,
la dominante de Madère était un bleu nuit presque noir et celle de Madrid un brun d'ombre : le test de régression en garde la trace (`verif-mep-style.ts`).

## Limites
Pas de masque de personnes (la peau pèse moins, c'est une approximation) ; limite d'impression approchée par la teinte, FOGRA39 non lu (le profil de
Cloudprinter reste à demander) ; l'accord nommé (R-C-10) ne reconnaît que sept accords ; aucune double test imprimée (R-T-24) : les paires restent
« proposées » tant que Mathias n'en a pas imprimé une.

## Test
`scripts/verif-mep-style.ts` (lancé par `verif-atelier.ts`) : catalogue, fichiers de police, validateur, rendu sans style au bit près, nuancier, typographie, IDML, PDF.
