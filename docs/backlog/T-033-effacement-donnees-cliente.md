---
id: T-033
titre: Aucun processus pour effacer les données d'une cliente
domaine: donnees
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — angle mort identifié le 29/08 en revue de préparation au lancement.
## Ce que j'ai vérifié
Le site collecte prénom, mail, téléphone, adresse de livraison, **et les photos personnelles**
d'une cliente. La page de confidentialité existe. Mais rien dans le code ni dans l'admin ne permet
de répondre à « effacez tout ce que vous avez sur moi », et aucune durée de conservation des
photos n'est appliquée : elles restent sur R2 indéfiniment.
Le droit applicable est portugais, et le RGPD s'applique. Ce n'est pas une question théorique :
c'est une demande qui arrivera, et elle a un délai de réponse légal.
## Ce que je propose
1. Décider une durée de conservation des photos après livraison, et l'écrire dans la politique de
   confidentialité **avant** de l'appliquer.
2. Une action d'admin « effacer ce dossier » qui supprime les objets R2, anonymise la ligne
   `numeros` et conserve ce que la comptabilité oblige à garder (une facture ne s'efface pas).
3. Vérifier que la politique de confidentialité dit vrai sur les sous-traitants réellement
   utilisés : Supabase, Cloudflare, Stripe, Brevo, Cloudprinter, Vercel.
**Question pour Mathias** : combien de temps garde-t-on les photos après livraison ? C'est la
seule décision qui bloque le reste.
## Ce qui a été fait
—
