---
id: T-187
titre: Après la création d'une édition, rien ne propose d'envoyer les liens, et le mail prévu ne porte pas le lien de l'équipe
etat: nouveau
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

## Ce qui a été fait
Rien encore (maquette seulement).
