---
id: T-142
titre: Les participants et le responsable ne peuvent pas déposer leurs photos d'événement
etat: en cours
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
13/10/2026, branche `feat/collectif-phases-2-a-6` :
- **Le moteur d'envoi** `edition/_composants/depot/moteur.ts` (navigateur, sans React) : flux
  BORNÉ (8 photos réduites en mémoire au plus, déclarées et en route comprises), 4 envois en
  parallèle, 3 essais, chien de garde de 180 s sans progrès, URL renouvelée à 45 min,
  déclaration et confirmation par lots de 25, rien gardé dans le navigateur. **Reprise** : les
  clés de fichier sont vérifiées AVANT toute réduction (`connues`), un fichier déjà arrivé ne
  repart pas. Le type envoyé suit la charge réduite. `pool.ts` et le worker B2C importés tels quels.
- **Le lien participant** `/depot/[token]` (d'abord mobile) : prénom, accord `[À FIXER]`, choix
  des photos, progression, « Merci, N photos reçues », phrase honnête sur la page fermée, fermé
  après la clôture. `?p=<clé>` : un lien de provenance (sans plafond si demandé).
- **La page Photos** du responsable : grille par pages de 120 (vignettes signées, tuiles en
  `content-visibility`), filtres (toutes, par jour, par provenance, doublons, présélection,
  signalées), présélection facultative, signalement avec motif, « Qui a déposé », liens de
  provenance, panneau de dépôt (provenance, photos OU dossier entier, glisser-déposer) dont le
  moteur vit dans la coquille (pastille « Envoi des photos » sur toutes les sections).
- **Le serveur** : `/api/collectif/depot/presign|complete` (plafond par appareil en cookie
  httpOnly, total tenu côté serveur, déclarations mortes après 2 h, 409 après la clôture),
  `/api/collectif/photos`, `/photos/marquer`, `/provenances`. Métadonnées et lieux lus en
  `after()` par `enrichirCollectif` (le cœur B2C `lireDepuisCoffre` importé, aucune table B2C).
  Doublons par tronçons (`doublons.ts`), prouvés identiques à `groupesDeDoublons` sur 25 lots.
- **Côté atelier** : carte « La collecte » de la fiche (arrivées, appareils, signalées, sans
  vignette, par provenance) et lot téléchargé directement sur le disque, entier ou par provenance
  (`/api/admin/collectif/editions/[id]/lot`, noms de `lot.ts`, les signalées préfixées).
- **Prouvé le 13/10 en local (port 3000, le seul que le CORS R2 accepte) contre la production** :
  10 photos par un participant plafonné à 8 → 8 reçues, 2 refusées avec la phrase ; les mêmes 10
  renvoyées → rien en double (8 lignes, 8 clés distinctes en base), vignettes, empreintes et
  métadonnées lues en tâche de fond ; 3 photos du photographe dont une recompression → repérée
  doublon ; lien d'équipe en 403 sur dépôt et marquage ; clé de provenance inventée en 404 ;
  clôture → 409 et page « fermé », réouverture → rouvert.
- **Reste** : le QR code du lien (aucune bibliothèque) ; la vignette HEIC lue par Chrome (lot à
  part, licence à vérifier) ; le texte de l'accord (légal, Mathias) ; essai sur de vrais
  téléphones (le local n'est pas joignable d'un téléphone : un déploiement d'aperçu Vercel avec
  `COLLECTIF_OUVERT` en Preview le permettrait, réglage à décider par Mathias).
