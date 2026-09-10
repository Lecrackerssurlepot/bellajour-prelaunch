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
