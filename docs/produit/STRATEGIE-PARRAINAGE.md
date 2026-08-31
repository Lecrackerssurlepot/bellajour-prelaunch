# Parrainage — la stratégie, prête pour le jour où on l'active

**Statut : EN PAUSE, décision de Mathias du 31/08/2026.** Le programme n'est ni actif ni
promis ; ce document conserve la stratégie établie pour ne pas la redéfinir plus tard.
Contexte : T-002 (les liens des mails de prévente sont morts depuis le retrait de
`/preventes` le 28/08) et la charte ambassadrices, dont les droits acquis restent honorés.

## Ce dont on dispose déjà (l'héritage de la prévente)

- Un code personnel par marraine (`waitlist.ref_code`), un rattachement filleule→marraine
  (`waitlist.referred_by`), des crédits en pages sur DEUX niveaux (`pages_credits`,
  niveaux 1 et 2), le mail de félicitation P3, et l'espace ambassadrices
  (`/ambassadeurs/espace`, token signé).
- Depuis le 30/08 : **l'infrastructure de coupons Stripe** (code fondatrice T-021 — coupon à
  usage unique, journal `evenements`, idempotence). Le parrainage la réutilisera telle quelle.
- Ce qui N'existe PAS : une page d'atterrissage pour la filleule, et le moindre rattachement
  dans le tunnel de l'atelier (`numeros` ne connaît pas les codes).

## Les quatre décisions qui définissent le programme (recommandations posées le 31/08)

1. **Qui est récompensé ?** Les DEUX côtés. La filleule a une raison d'utiliser le lien,
   la marraine partage un cadeau, pas une commission. Un programme à sens unique convertit mal.
2. **Avec quoi ?** Des montants fixes en euros (coupons Stripe, infra T-021), pas des pages :
   dans l'atelier, la pagination vient de l'histoire, pas d'un compteur. **X € filleule sur sa
   première commande, Y € de crédit marraine — montants À DÉCIDER par Mathias, jamais inventés.**
3. **Quand ?** Au moment du bonheur : à la livraison (mail M8) et sur la page cliente une fois
   le magazine validé. Jamais avant le paiement.
4. **Où atterrit la filleule ?** `/magazine?ref=CODE` : découverte produit + bandeau discret
   « <Prénom> vous offre X € », code mémorisé, commande rattachée. Page d'invitation
   personnalisée = raffinement d'étape 2.

## Le déploiement en trois étapes, quand Mathias activera

- **Étape 0 — capture sans regret** (aucune décision de montant requise) : `/magazine` lit
  `?ref` et le mémorise, la création de dossier l'enregistre au journal `evenements` (aucune
  migration), redirection `/preventes?ref=X` → `/magazine?ref=X` pour les liens déjà dans les
  boîtes, correction des `REF_LINK` de W1/P1/P2. Résultat : plus de lien mort, et l'historique
  « qui amène qui » se constitue même si les récompenses attendent.
- **Étape 1 — les récompenses** (dès X et Y donnés) : coupon filleule automatique, crédit
  marraine, bandeau sur `/magazine`, bloc parrainage dans M8 et sur la page cliente.
- **Étape 2 — le raffinement** : page d'invitation personnalisée, espace marraine enrichi
  (suivi des filleules), et arbitrage du niveau 2 hérité (recommandation : le réserver aux
  ambassadrices).

## Les questions qui attendent Mathias pour activer

X € (filleule) et Y € (marraine) — le même montant des deux côtés est le plus lisible ·
qui a un lien : toutes les clientes livrées, ou d'abord ambassadrices + fondatrices ? ·
le crédit marraine est-il cumulable sur une même commande ? · cumul avec le code fondatrice ?

## Tant que c'est en pause

Les liens `/preventes?ref=…` des mails déjà partis mènent à l'accueil sans effet (redirection
307 vers `/`). Les droits DÉJÀ ACQUIS (pages créditées en prévente, charte ambassadrices)
restent honorés à la main. Si un mail W1/P1/P2 devait repartir un jour, retirer ou corriger son
bloc parrainage d'abord — ne jamais promettre un lien mort (geste sur templates = accord Mathias).
