---
id: T-187
titre: Après la création d'une édition, rien ne propose d'envoyer les liens, et le mail prévu ne porte pas le lien de l'équipe
etat: en cours
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Et, voilà, il devrait y avoir à la fin de l'édition quand on crée le mail simplement qui permet
de donner l'accès aux liens de l'équipe et, surtout de la personne responsable directement. »
(19/10/2026)

## Ce que j'ai vérifié (19/10)
- Après « Créer l'édition », `FormulaireEdition.tsx:148-150` mène à la fiche sans un mot ;
  l'écran disait « Aucun mail ne part à cette étape » (`:388`).
- Le mail « Votre espace est prêt » existe (T-146) mais ne se déclenche que depuis l'onglet
  « Réglages et liens » (`EnvoiLienResponsable.tsx`, route `mail-espace`, deux temps + aperçu).
- Il ne porte QUE le lien du responsable (`mail-espace/route.ts:46`, `DonneesEspacePret` n'a
  qu'un champ `lien`). Il PARLE d'un lien d'équipe (`mailsTextes.ts:90-91`) que l'espace client
  ne donne nulle part : `token_equipe` n'apparaît dans aucun fichier de `src/app/edition`. Le
  mail promet donc une chose introuvable : défaut réel.
- Coupé par `COLLECTIF_MAILS` (aucune variable sur Vercel au 17/10, ETAT-PRODUCTION) ; texte
  « PROPOSÉ PAR CLAUDE LE 15/10, À VALIDER PAR MATHIAS » (`mailsTextes.ts:5`).
- Une seule adresse par édition (`responsable_email`) : aucune adresse d'équipe en base.

## Ce que je propose
Planche 6 du canevas du 19/10 :
1. Après la création, un écran « L'édition est créée » : les trois liens, chacun avec son rôle
   en une ligne ; « Envoyer à <adresse> » armé en deux temps avec l'aperçu ; « Copier les trois
   liens » quand les mails sont coupés ; « Aller à la fiche ».
2. Le gabarit porte les trois liens séparés : le sien (à garder), l'équipe (lecture seule, à
   transférer), les participants (le QR est dans l'espace). Harnais : vous/tu, échappement,
   aucun token dans le journal.
3. Le lien d'équipe visible dans l'espace du responsable (« Partager avec mon équipe »).

**Avis requis** : le texte du mail, et l'ouverture de `COLLECTIF_MAILS` en production. Aucun
envoi réel sans l'accord de Mathias (interdit n° 2).

## Validé par Mathias le 19/10/2026
« Je valide les huit planches telles quelles. Pour les questions, prends tes recommandations, sauf le mail : n'ouvre rien sans moi. »
Planche 6 telle quelle, texte du mail compris. **`COLLECTIF_MAILS` reste FERMÉ** : l'ouvrir
en production attend Mathias, aucun envoi réel sans lui.

## Ce qui a été fait
19/10/2026, planche 6 codée (non commitée, en attente de relecture) ; `COLLECTIF_MAILS` reste
FERMÉ, aucun mail envoyé, aucune variable posée :
- Après « Créer l'édition », l'écran « L'édition est créée » (`/admin/collectif/creee/[id]`, hors
  de `[id]/` pour ne pas montrer la silhouette de la fiche pendant le chargement) : la ligne de
  résumé, les trois liens en cartes avec leur rôle (adresses abrégées, le lien entier ne sort que
  par « Copier »), « Envoyer à <adresse> » en deux temps (`useEnvoiEspace`, le flux de l'onglet
  Réglages, désormais partagé), « Copier les trois liens », « Aller à la fiche → », l'aperçu du
  vrai mail (iframe du GET `mail-espace`) avec « À » et « Objet ». Mails coupés : le bouton dit
  « Mails coupés : copiez les liens » et ne fait rien, « Copier les trois liens » passe en bleu.
  Édition archivée : « Édition archivée : aucun mail ne part ».
- Le gabarit « Votre espace est prêt » (`mailsTextes.ts`) porte les TROIS liens séparés, avec les
  mots de la planche, en vous et en tu ; l'équipe et les participants en adresse écrite et
  cliquable. Objet : « Votre espace Bellajour est prêt, <événement> ». `donneesEspacePret` est
  l'unique assemblage (route ET écran) ; le journal ne garde que l'empreinte et l'adresse masquée.
- L'espace du responsable montre « Partager avec mon équipe » en bas du menu (fenêtre : le lien,
  « Copier », « Lecture seule : votre équipe suit tout sans rien modifier. ») ; le layout ne
  calcule ce lien que pour le responsable (`voitLienEquipe`), l'équipe ne le reçoit jamais.
- Vérifié : harnais (trois liens, vous/tu, aucun tiret cadratin, échappement des adresses, route,
  journal sans token, lien d'équipe au responsable seulement) ; captures 1440 et 375 px, jour et
  nuit, aucune écriture en base (le pilote a intercepté les seuls POST de création, factices).

Écarts à la planche, assumés : le titre de la carte dit « Le lien de Claire, responsable de
l'édition » (masculin générique sans accord forcé) ; la note de l'équipe dit « Claire le transfère
à son équipe » ; le mail garde l'en-tête « Bellajour · Édition collective », le titre « Votre
espace est prêt » et « À très vite » de la maison commune des mails des éditions ; « Copier le
lien d'équipe » de la planche devient l'adresse écrite (un mail ne copie pas). Non vu à l'écran :
le second temps de l'envoi (mails coupés, le bouton ne vérifie rien) ; prouvé au harnais.
