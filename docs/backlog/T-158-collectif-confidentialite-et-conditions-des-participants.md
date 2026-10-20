---
id: T-158
titre: La politique de confidentialité ne parle ni des participants d'une édition ni de leurs photos, et il n'existe aucun accord sur les données pour les entreprises
etat: en cours
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
- **20/10/2026** : Mathias, « il faut qu'on mette en place la politique de confidentialité ».
  Projet écrit, **rien n'est en ligne, aucun texte légal du site n'a été touché** :
  `docs/produit/collectif/PROJET-CONFIDENTIALITE-B2B.md`.
  - §1 : le relevé, depuis le code avec chemin:ligne, de tout ce que l'Édition collective collecte
    et garde (responsable, participants, photos et leurs métadonnées, GPS envoyé à Geoapify,
    identifiants d'appareil, cookies `bj_depot_appareil` / `bj_ec_appareil` / `bj_ec_mode`, deux clés
    de localStorage, accord et sa version, messages, contenus, documents, rendez-vous dans Google
    Agenda, journal), où c'est stocké, qui y accède, et combien de temps aujourd'hui : sans limite.
    Aucun téléphone n'est collecté.
  - §2 : ce que disent déjà les textes. Les CGV ne visent que le consommateur (art. 1.1) ; la
    politique dit « Bellajour n'est pas le sous-traitant du client » (§1), « pas de moins de 18 ans »
    (§6.3, à confronter aux écoles), ne déclare ni nos cookies ni Geoapify ni Google. Deux écarts B2C
    relevés en passant : la promesse « photos supprimées 90 jours après la livraison » (§7) n'est
    tenue par aucun code (l'anonymisation épargne les dossiers payés), et AWS Rekognition, OpenAI,
    Fal.ai sont déclarés sans exister dans `src/`.
  - §3 : la section 13 proposée (rôles en options A/B, données et bases légales, qui voit quoi,
    durées, droits, sous-traitants, cookies) ; §5 : une nouvelle version proposée du texte d'accord
    du dépôt (qui voit les photos, combien de temps, un lien vers la politique) ; §6 : un modèle
    court de DPA (art. 28) pour l'entreprise cliente. Tout est marqué « projet, à faire relire ».
  - Les trois décisions du 20/10 transmises par le coordinateur (e-mail du participant, album du
    lien, corbeille de 30 jours) y sont intégrées comme **décidées, pas encore codées** (vérifié :
    aucune trace dans `src/`).
- **Reste** : les dix questions du §0 (la première, le rôle de Bellajour, commande le DPA), la
  relecture juriste, la traduction PT (qui fait foi) et EN, puis l'intégration dans
  `confidentialite.ts` et `Depot.tsx` sur accord explicite de Mathias.
