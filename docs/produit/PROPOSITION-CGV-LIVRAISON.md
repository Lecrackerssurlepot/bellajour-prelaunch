# Proposition — sortir la livraison du prix dans les CGV

Écrit le 07/09/2026, dans le lot 5 du chantier « barème par tranches de pages ».

**APPLIQUÉ le 10/09/2026** (accord de Mathias donné dans la conversation du 10/09, chantier « grille par pages », lot 5) : les §1, §2, §3a, §3b ci-dessous sont dans `src/app/legal/content/cgv.ts` v3.1, FR/PT/EN, et le tableau de l'annexe dérive désormais de `src/lib/atelier/grille.ts` (un prix par nombre de pages, 20 puis 24 à 60). La question §5 (28 ou 29) n'a plus d'objet : la grille est par page exacte. Restent à Mathias : les `.docx` de `legal-source/` et la relecture de la version PT. Le texte d'origine est conservé ci-dessous tel qu'il a été proposé.

~~**Rien ici n'est appliqué.**~~ Le texte légal ne se modifie qu'avec l'accord explicite de
Mathias (interdit nº2) : ce document liste précisément chaque passage de
`src/app/legal/content/cgv.ts` à changer le jour où il valide, avec le texte actuel et le
texte proposé, dans les trois langues. **La version portugaise (PT) fait foi**
(article 14 des CGV) : c'est elle qui engage, les deux autres traduisent.

Deux décisions de Mathias conditionnent l'application :

1. **Le tarif de livraison** (montant en euros, TTC). Aucun montant n'est proposé ici —
   interdit nº5. Les textes proposés disent « indiqué avant la validation de la
   commande » précisément pour ne pas graver un chiffre dans les CGV.
2. **La borne du premier palier : 28 ou 29 pages** (T-006, voir la dernière section).

À faire EN MÊME TEMPS que la modification des CGV, sinon le site ment :

- activer le bloc `shipping_options` laissé en commentaire dans
  `src/app/api/atelier/checkout/route.ts` avec le montant décidé ;
- reformuler la description du `line_item` Stripe (même fichier), qui dit encore
  « impression et livraison comprises » — elle apparaît sur l'écran de paiement ET sur
  la facture ;
- réafficher le tarif côté pages (la décision du lot 5 est « on prépare sans
  afficher ») ;
- mettre à jour `legal-source/*.docx` (qui a déjà une version de retard) et la date de
  version des CGV.

---

## 1. Article 4bis.4 (FR) / 4.º-A.4 (PT) / 4a.4 (EN) — le prix « comprend la livraison »

Le cœur du changement. La phrase engage l'inclusion de la livraison dans le prix.

**FR — actuel** (cgv.ts, art. 4 bis) :
> 4bis.4 Prix par palier de pagination. Le prix est déterminé par le nombre de pages
> effectivement composé par l'atelier, selon la grille « Offre Atelier » figurant dans
> la Fiche produit. Il est ferme, affiché toutes taxes comprises, et comprend
> l'impression et la livraison. Le nombre de pages n'est ni choisi ni saisi par le
> client : il résulte du nombre et de la qualité des photographies déposées, et lui est
> communiqué avec le prix avant tout paiement.

**FR — proposé** :
> 4bis.4 Prix par palier de pagination. Le prix est déterminé par le nombre de pages
> effectivement composé par l'atelier, selon la grille « Offre Atelier » figurant dans
> la Fiche produit. Il est ferme, affiché toutes taxes comprises, et comprend
> l'impression. Les frais de livraison sont facturés en sus ; leur montant, toutes
> taxes comprises, est porté à la connaissance du client avant tout paiement, en même
> temps que le prix. Le nombre de pages n'est ni choisi ni saisi par le client : il
> résulte du nombre et de la qualité des photographies déposées, et lui est communiqué
> avec le prix avant tout paiement.

**PT — actuel** :
> [...] É firme, exibido com todos os impostos incluídos e inclui a impressão e a
> entrega. [...]

**PT — proposé** :
> [...] É firme, exibido com todos os impostos incluídos e inclui a impressão. Os
> custos de entrega são faturados adicionalmente; o seu montante, com todos os
> impostos incluídos, é dado a conhecer ao cliente antes de qualquer pagamento,
> juntamente com o preço. [...]

**EN — actuel** :
> [...] It is firm, displayed inclusive of all taxes, and includes printing and
> delivery. [...]

**EN — proposé** :
> [...] It is firm, displayed inclusive of all taxes, and includes printing. Delivery
> costs are invoiced in addition; their amount, inclusive of all taxes, is made known
> to the customer before any payment, together with the price. [...]

## 2. Liste « Ce que comprend une commande Atelier » (art. 4 bis)

**FR — actuel** (dernier item de la liste) :
> L'impression et la livraison dans la zone définie au 4bis.6

**FR — proposé** :
> L'impression. La livraison, effectuée dans la zone définie au 4bis.6, est facturée
> en sus (article 4bis.4)

**PT — actuel** :
> A impressão e a entrega na zona definida em 4.º-A.6

**PT — proposé** :
> A impressão. A entrega, efetuada na zona definida em 4.º-A.6, é faturada
> adicionalmente (artigo 4.º-A.4)

**EN — actuel** :
> Printing and delivery within the zone defined in 4a.6

**EN — proposé** :
> Printing. Delivery, within the zone defined in 4a.6, is invoiced in addition
> (Article 4a.4)

## 3. Annexe — Fiche produit, « Grille tarifaire — Offre Atelier »

### 3a. Le paragraphe d'introduction de la grille

**FR — actuel** :
> Grille applicable à toute commande passée via l'Atelier (article 4 bis). Prix fermes,
> affichés en euros, toutes taxes comprises, impression et livraison comprises dans la
> zone France, Belgique, Luxembourg. Le palier est déterminé par le nombre de pages
> composé par l'atelier, jamais saisi par le client.

**FR — proposé** :
> Grille applicable à toute commande passée via l'Atelier (article 4 bis). Prix fermes,
> affichés en euros, toutes taxes comprises, impression comprise. La livraison, dans
> la zone France, Belgique, Luxembourg, est facturée en sus au tarif porté à la
> connaissance du client avant tout paiement (article 4bis.4). Le palier est déterminé
> par le nombre de pages composé par l'atelier, jamais saisi par le client.

**PT — actuel** :
> Grelha aplicável a qualquer encomenda efetuada através do Atelier (artigo 4.º-A).
> Preços firmes, exibidos em euros, com todos os impostos incluídos, impressão e
> entrega incluídas na zona França, Bélgica, Luxemburgo. O escalão é determinado pelo
> número de páginas composto pelo atelier, nunca introduzido pelo cliente.

**PT — proposé** :
> Grelha aplicável a qualquer encomenda efetuada através do Atelier (artigo 4.º-A).
> Preços firmes, exibidos em euros, com todos os impostos incluídos, impressão
> incluída. A entrega, na zona França, Bélgica, Luxemburgo, é faturada adicionalmente
> à tarifa dada a conhecer ao cliente antes de qualquer pagamento (artigo 4.º-A.4).
> O escalão é determinado pelo número de páginas composto pelo atelier, nunca
> introduzido pelo cliente.

**EN — actuel** :
> Price list applicable to any order placed through the Atelier (Article 4a). Firm
> prices, displayed in euros, inclusive of all taxes, printing and delivery included
> within the France, Belgium, Luxembourg zone. The tier is determined by the page
> count composed by the atelier, never entered by the customer.

**EN — proposé** :
> Price list applicable to any order placed through the Atelier (Article 4a). Firm
> prices, displayed in euros, inclusive of all taxes, printing included. Delivery,
> within the France, Belgium, Luxembourg zone, is invoiced in addition at the rate
> made known to the customer before any payment (Article 4a.4). The tier is
> determined by the page count composed by the atelier, never entered by the customer.

### 3b. L'en-tête de colonne du tableau

**FR — actuel** : `Prix TTC, tout compris` → **proposé** : `Prix TTC, hors livraison`
**PT — actuel** : `Preço c/ IVA, tudo incluído` → **proposé** : `Preço c/ IVA, sem entrega`
**EN — actuel** : `Price incl. VAT, all-inclusive` → **proposé** : `Price incl. VAT, excl. delivery`

### 3c. La grille de la livraison

Le jour où le tarif est décidé, l'annexe devrait porter UNE ligne de plus (un tableau
« Livraison » ou une phrase) donnant le montant TTC pour la zone FR/BE/LU. Montant
volontairement absent ici : décision de Mathias.

## 4. Passages vérifiés qui NE changent PAS

- **Art. 4.2 « Transparence — pas de frais cachés »** (FR/PT/EN) : « Hors prévente, les
  frais de port éventuels sont indiqués clairement avant la validation de la
  commande. » Cette phrase anticipait déjà des frais de port facturés : elle devient
  simplement VRAIE au lieu de dormante. Aucun changement.
- **Art. 4bis.6 / 4bis.7** (zone et délai de livraison) : décrivent OÙ et QUAND, pas ce
  que le prix comprend. Aucun changement.
- **Art. 5 et 5 bis (prévente, close)** : « livraison offerte » / « portes oferecidos » /
  « free shipping » sont des droits ACQUIS des offres closes (article 8.8 : aucune
  modification ne peut réduire les avantages déjà acquis). NE PAS Y TOUCHER : les
  quatorze fondateurs ont la livraison offerte, quoi qu'on décide pour l'Atelier.
- **Art. 9 et 10** (garanties, livraison/risque/GPSR) : parlent du délai, du transfert
  de risque et de la traçabilité, pas du prix. Aucun changement — sauf si Mathias veut
  préciser au 10.1 que le tarif de livraison est indiqué avant la commande (redondant
  avec 4bis.4, facultatif).
- **Grille tarifaire — Prévente** (annexe) : grille close, conservée telle quelle.
- **`src/app/legal/content/remboursement.ts`, `mentions-legales.ts`,
  `confidentialite.ts`** : leurs occurrences de « livraison » sont des repères de
  délai ou de traitement de données, jamais une promesse d'inclusion dans le prix.

## 5. La borne 28/29 pages (T-006) — pour la même passe d'édition

Le code facture 20 **à 29** pages au premier palier (`src/lib/atelier/prix.ts`, dérivé
de `src/lib/atelier/grille.ts`) ; l'annexe tarifaire des CGV écrit « 20 à 28 pages »
dans les trois langues. Un numéro de 29 pages est donc facturé 30 € sans ligne
contractuelle qui le couvre. Depuis le lot 5, **l'affichage du site dit 20 à 29**
(aligné sur le code, qui fait foi en attendant l'arbitrage).

**Question à Mathias** : le palier va-t-il jusqu'à 28 ou 29 pages ?

- **Si 29** (recommandé : c'est ce que le code fait depuis le début) — corriger les
  trois tableaux de l'annexe : `20 à 28 pages` → `20 à 29 pages` (FR),
  `20 a 28 páginas` → `20 a 29 páginas` (PT), `20 to 28 pages` → `20 to 29 pages` (EN).
  Note : les pages étant paires (annexe : « nombre de pages pair obligatoire »), une
  borne impaire est cosmétiquement étrange mais inoffensive — 29 n'arrivera jamais si
  la parité est tenue ; la borne à 29 couvre simplement le cas où elle ne l'est pas.
- **Si 28** — c'est `grille.ts` qui change (`maxPages: 29` → `28`), les CGV restent,
  et il faut vérifier qu'aucun numéro existant n'est à 29 pages. Idem pour 38/39 sur
  le deuxième palier (le code dit 39, l'annexe 38) : la décision vaut pour les deux
  coutures.

`scripts/verif-atelier.ts` porte des assertions sur la grille (p30 = 30 €, bornes
20/28/30/38/40/50) : elles restent vertes dans les deux cas, mais ses commentaires
citent « 20 à 28 » — à rafraîchir avec les CGV, jamais avant.
