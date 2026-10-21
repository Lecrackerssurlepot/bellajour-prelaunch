# Le message de partage, le lien « pour tous » et le mail « Votre espace est prêt » (jusqu'au 21/10/2026)

Les fichiers tels qu'ils étaient sur `main` au 21/10/2026 (commit `87f55d8`), juste avant les planches
4, 5 et 6 du 21/10, validées par Mathias :

- `partage.ts` : `messagePartage` d'avant, UN seul pavé (« … et vos photos y ont leur place. Déposez-les
  ici, depuis votre téléphone, sans compte (30 par personne, jusqu'au 15 novembre) : » puis le lien collé
  dessous). Remplacé par trois courts paragraphes, la date limite et le nombre de photos dans leur propre
  phrase, le lien SEUL sur sa ligne, espaces insécables aux guillemets et au « ! » (planche 4).
- `Liens.tsx` : l'onglet « Les liens » avec la carte « Lien général » (`genre="Lien général"`, son QR,
  « Afficher en grand », « Partager », « Modifier » le nombre de photos). Remplacée : l'adresse de base
  n'est plus montrée ni envoyée ; ses photos, s'il y en a, apparaissent sous « Sans groupe », en lecture
  seule ; sans aucun lien de groupe, l'état vide « Créez un lien par groupe » (planche 5, vues 5A et 5B).
- `FinCreation.tsx` : l'écran « L'édition est créée » avec TROIS liens (responsable, équipe,
  participants) et « Copier les trois liens ». Remplacé par deux liens, « Copier les deux liens », et la
  carte « Les liens des participants » avec « Préparer les groupes maintenant » (planche 5, vue 5C).
- `liens.ts` : `texteTroisLiens`, remplacé par `texteDeuxLiens`.
- `mailsTextes.ts` : `mailEspacePret` d'avant, trois blocs gris (« Votre lien », « Le lien de votre
  équipe », « Le lien des participants ») et deux notes (« Lien perdu ? Retrouvez-le à tout moment
  sur bellajour.fr/espace. », le code par appareil). Remplacé par le mail allégé de la planche 6 : un
  titre, deux lignes, UN bouton « Ouvrir mon espace », « Votre équipe et les participants : tout se
  partage depuis l'espace. », la signature. `donneesEspacePret` ne prend plus `avecCode` ni ne rend
  `retrouver`. « Le lien des participants a changé » (`mailLienRegenere`) n'a PAS changé : il garde son
  bloc et ses notes (« dans un second temps », planche 6).

Ce qui n'est PAS archivé et reste en service : l'adresse de base `/depot/<token_depot>` elle-même (elle
reçoit toujours des photos : un lien déjà partagé ne doit jamais perdre une photo, et tous les liens de
groupe `?p=<clé>` en dépendent) ; le nom « Tous les participants », toujours RÉSERVÉ (`NOMS_RESERVES`,
`refusNomReserve`), comme « Sans groupe » ; la fenêtre « Modifier » du lien général dans `Liens.tsx`
(`FenetreModifierLien`, `general`), que `Collecte.tsx` sait encore ouvrir mais que plus aucun bouton ne
propose.

Hors du périmètre du build (aucun import, `archive` est exclu de tsconfig et du lint).
