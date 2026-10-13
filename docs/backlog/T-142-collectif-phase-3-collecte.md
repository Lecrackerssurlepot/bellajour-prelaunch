---
id: T-142
titre: Les participants et le responsable ne peuvent pas déposer leurs photos d'événement
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-13
---
## Ce que Mathias a dit
« Je veux pouvoir ouvrir de vraies éditions de test et tout utiliser de bout en bout (phases 0 à
6). »

## Ce que j'ai vérifié
- Le moteur B2C (`composer/depot/moteur.ts`, 1158 lignes) n'est pas réutilisable à 2 000 photos :
  copie IndexedDB de chaque photo, purge des autres dossiers, mémoire gardée jusqu'à la
  confirmation, liste reconstruite à chaque image. Ni dossier entier, ni provenance, 5 voies en
  dur. `pool.ts` + `reduire.worker.js` (vignette 320 px) s'importent tels quels.
- Le pHash se calcule sur le SERVEUR après l'arrivée (`enrichissement.ts` + sharp) : il ne peut
  rien écarter avant l'envoi. La reprise sans doublon passe par `cle_fichier` (nom, taille, date
  de modification), unique par édition.
- HEIC : Chrome ne le décode pas (pas de vignette navigateur), le sharp de Vercel non plus (pas de
  vignette ni d'empreinte serveur, donc pas de doublon détecté). Safari convertit souvent en JPEG.
- `groupesDeDoublons` compare toutes les paires : 2 millions à 2 000 photos.
- Possible défaut B2C vu à la lecture, NON vérifié : un PNG de plus de 5200 px part en octets JPEG
  déclarés `image/png` (`moteur.ts`). Hors de ce ticket.

## Ce que je propose
PRD §5, phase 3 :
- `src/lib/collectif/depot/` : moteur à flux borné (lire, réduire, envoyer, libérer), 3 à 4
  envois en parallèle, nouvel essai, confirmation par lot, vivant dans la coquille ;
- `/depot/[token]` mobile d'abord : prénom, photos, consentement, « Merci, N photos reçues » ;
  phrase d'invitation réglée par l'atelier ; « Gardez cette page ouverte pendant l'envoi. Les
  photos déjà arrivées sont gardées. » ; fermé après la clôture (message, pas erreur) ;
- plafonds de `plafonds.ts` (appareil par cookie `httpOnly`, total tenu côté serveur, plafond non
  réglé = dépôt fermé), insertion par lot à la déclaration ;
- panneau responsable : provenance, dossier entier (`webkitdirectory`, `webkitGetAsEntry`), file
  d'attente, lien sans plafond par provenance (clé aléatoire) ;
- grille 2 000 photos virtualisée maison, URL signées par fenêtre, filtres (jour, provenance,
  doublons, présélection), présélection facultative, signalement ;
- doublons par tronçons d'empreinte (prouvés égaux à `groupesDeDoublons` au harnais) ;
- côté atelier : compteurs, lot par provenance (patron `telechargement.ts` + `lot.ts`) ;
- `enrichirCollectif` (voisin de `enrichirPhotos`, mêmes cœurs purs) en `after()` ;
- message type à copier pour l'organisateur ;
- **lot à part, chiffré** : vignette HEIC dans le navigateur par une bibliothèque WASM chargée à
  la demande, après vérification de sa licence (une séance, risque mémoire sur téléphone). La
  phase commence par l'honnête « pas de vignette pour un HEIC ».

**Avis requis** : le texte du consentement et des conditions est un texte LÉGAL : `[À FIXER]`.

**Recette** : 3 téléphones déposent, le responsable dépose un dossier de 300 photos, coupe le
réseau, reprend : aucun doublon, le plafond tient, le lien se ferme après la clôture.

## Ce qui a été fait
Rien. Ticket ouvert le 13/10/2026.
