---
id: T-109
titre: Relancer un client depuis l'atelier, et voir depuis quand il n'a rien reçu
domaine: admin
gravite: serieux
autonomie: libre
ouvert: 2026-09-11
ferme: 2026-09-11
etat: fermé
---
## Ce que Mathias a dit
« Options à rajouter ! Pouvoir relancer un client ! aussi pour les photos par exemple et pouvoir
le faire depuis l'admin. » (11/09/2026, après deux planches de propositions.)

## Ce que j'ai vérifié avant d'écrire une ligne
Le constat est réel, et il est double.

1. **Aucune relance ne peut partir de l'atelier.** Les sept actions de `transitions.ts`
   (`ACTIONS`) sont des changements d'état : publier l'aperçu, la maquette, l'impression,
   l'expédition, la livraison, « photos insuffisantes ». Aucune ne relance. Les relances M2, M2b,
   M3b et M10 ne partent que du balayage quotidien (`vercel.json`, `0 7 * * *`), et le plan Hobby
   le déclenche « dans l'heure qui suit ».
2. **Et une relance ne part qu'une fois, pour toujours.** `mails_envoyes` porte un index unique
   sur `(numero_id, code)` (migration `20260824`). Une fois M2b parti, le client qui reste muet
   ne reçoit plus jamais rien : le dossier s'éteint en silence jusqu'au préavis M10.

## Ce qui a été fait
**Aucun template Brevo à créer, aucune migration.** Ce qui empêchait de renvoyer une relance
n'était pas son texte, c'était son verrou : une relance manuelle emprunte donc le gabarit et les
paramètres du mail automatique qu'elle rejoue (`MODELE_RELANCE`, `relance.ts`) et ne se distingue
que par son code, qui porte le rang.

- `src/lib/atelier/relance.ts` — module PUR : le motif se déduit de l'état (dépôt vide → RD*,
  photos déposées sans accord → RP*, aperçu non payé → RA*), avec quatre refus lisibles (adresse
  absente, adresse qui a rebondi, plafond de deux relances par motif, 72 h de silence minimum
  depuis le dernier mail, quel qu'il soit).
- `src/lib/atelier/mails.ts` — `modeleDe()` : gabarit, objet, contrôle de complétude et
  paramètres d'une relance viennent tous du mail rejoué. Une seule source, jamais deux libellés
  à diverger.
- `POST /api/admin/atelier/relance` — **n'accepte aucun motif en entrée**, seulement un token :
  la règle est relue côté serveur à l'instant du clic. Journalise `relance_manuelle`.
- `Relance.tsx` — le bouton sur la ligne, armé en deux temps comme les six autres actions. Le
  bouton éteint DIT pourquoi ; sur un dossier où la relance n'a aucun sens, il n'existe pas.
- La colonne **« Dernier mot »** remplace « Ouvert » dans la liste (la date d'ouverture reste au
  survol) : depuis quand le client n'a plus rien reçu, et quoi. Aucune requête de plus, les mails
  partis étaient déjà chargés pour la projection des actions.
- Au passage, `chargerListe()` fait partir ses quatre lectures indépendantes **ensemble** au lieu
  de les enchaîner. Le patron existait déjà dans le même fichier pour la fiche d'un dossier.

## Tranché par Mathias le 11/09/2026
- **Deux relances manuelles par motif, 72 h entre deux** (`RELANCES_MAX`,
  `DELAI_MIN_RELANCE_MS`). Trois jours laissent passer un week-end entier ; quarante-huit heures
  ne le faisaient pas. La phrase du refus LIT la constante, elle ne recopie pas le chiffre.
- `MODELE_RELANCE` garde un troisième rang par motif (RD3, RP3, RA3) : remonter le plafond ne
  demandera pas une ligne de code, juste le chiffre.

## Ce qui reste ouvert
Le jour où une deuxième relance doit avoir **son propre texte**, il suffit de pointer RP2 vers un
autre gabarit Brevo dans `MODELE_RELANCE` : rien d'autre ne bouge.

## Vérifié
`npx tsc --noEmit`, `npm run lint`, `npm run build` : verts. `scripts/verif-atelier.ts` : 20
assertions de plus sur `evaluerRelance`, tout passe. Parcours joué sur `/admin/atelier/demo`
(bouton actif, bouton éteint avec sa raison, panneau, confirmation) ; en démonstration, rien ne
part. Le chemin d'ENVOI RÉEL n'est pas testé : il enverrait un mail à une vraie personne.
