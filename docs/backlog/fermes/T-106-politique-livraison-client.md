---
id: T-106
titre: La politique de livraison facturée au client (plafond, tarif fixe ou port compris) n'est pas tranchée
domaine: paiement
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-10
---
## Ce que Mathias a dit
« Il faut que je voie avec Louis ce qu'il en est des coûts de livraison qu'on applique à nos
clients pour éviter que cela paraisse excessif, puisque onze euros de livraison, c'est juste
énorme. On enregistre l'info du plafond mais pour l'instant on laisse comme ça. » (10/09/2026)
## Ce que j'ai vérifié
Depuis PR #103, la livraison est facturée en sus par devis Cloudprinter à la publication de
l'aperçu (`src/lib/atelier/livraison.ts`, `transition/route.ts`). Le plafond
`LIVRAISON_PLAFOND_CENTIMES` vaut `null` : **le client paie le devis complet**. Devis réels du
10/09 (clé sandbox) : France 32 p. → Colissimo 9,22 € HT soit 11,06 € TTC ; Belgique 20 p. → UPS
12,45 € HT soit 15,06 € TTC. Sur un magazine de 32 pages à 35 €, le port réel pèse près d'un
tiers du prix. Le tableur de Mathias estimait 5 € HT.
L'admin peut déjà écrire n'importe quel montant (0 compris) dans « Livraison TTC (€) » avant de
publier : c'est le filet manuel en attendant.
## Ce que je propose
Trois politiques, chacune = UN réglage, à choisir avec Louis :
1. **Plafond** : le client paie le devis jusqu'à un maximum, Bellajour absorbe le reste. Prêt :
   poser `LIVRAISON_PLAFOND_CENTIMES` dans `livraison.ts`. Le montant absorbé est journalisé.
2. **Tarif fixe** : un port unique pour la zone quel que soit le devis (le devis reste affiché
   dans l'admin pour information). Une constante et trois lignes dans `transition/route.ts`.
3. **Port compris** : la livraison revient dans le prix de la grille. Défait le lot 6 côté
   client (ligne Stripe, bon de commande, mails, CGV 4bis.4) ; la marge des petits formats en
   souffre.
Quel que soit le choix, valider avec le comptable la règle HT → TTC (`TAUX_TTC_LIVRAISON`,
taux du pays) et refaire un devis avec les vraies clés Cloudprinter (celles de Production sont
encore le sandbox).
**Question pour Mathias et Louis** : quelle politique, et quel montant ?

## Fermé le 16/09/2026
Tranché par Mathias le 15/09 avec le tableur « Prix & Marge v3 », validé par Louis : **zones à
prix fixe TTC** (A 5 € : FR DE ES NL PL GB BE AT CZ HU ; B 13 € : IT IE SE DK RO LU PT FI GR US ;
C : le devis Cloudprinter du jour, dont CH, NO, CY, MT, SI, BG, HR, EE, LV, LT, SK, BR), **offerte
dès 50 € TTC de magazines** (remises déduites). Le plafond d'absorption est archivé
(`archive/livraison-plafond-2026-09/`). Livré : `ZONES_PORT`, `FRANCO_CENTIMES`, `portClient`
(`livraison.ts`), le port BRUT gelé et le seuil rejoué à la lecture, CGV v4.0 art. 4bis.11 et
page `/livraison` (FR/PT/EN). Les coûts réels des douze pays de zone C sont relevés dans
`docs/reference/SPECS-CLOUDPRINTER.md` (16/09) pour reclasser en connaissance.
