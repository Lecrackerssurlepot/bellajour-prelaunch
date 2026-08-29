# PRD — Page Prévente Bellajour

> **Source de vérité unique du build de `/preventes`.** Consolide le spec dev frontend + le PDF structure. En cas de contradiction avec un autre doc, **ce fichier fait foi**.
> Scope : page `/preventes` uniquement. Hors scope (à spécifier séparément) : page « Nos prix », texte des CGV, logique backend.

---

## 0. Méta

| | |
|---|---|
| Route | `/preventes` |
| Branche | `prevente` (jamais `main` avant merge final) |
| Ouverture prévente | 13 juin 18h |
| Deadline mise en ligne | vendredi 12 juin |
| Lancement produit | 15 août |
| Charte | **Nouvelle DA** (tokens `--bj-*` déjà installés en global) — crème/charbon/terracotta, bleu d'action `#4a90d9`, glass, arrondis ≥ 12px, fonts Cormorant Garamond + DM Sans |
| Frontière handoff | bouton **« Réserver mon acompte »** → `POST /api/checkout` (backend Mathias) |
| Wording | **final** — corrigé des coquilles (voir §7). Zéro placeholder. |
| Cible | Desktop + Mobile, les deux optimisés |

**Principe d'architecture (rappel) :** Stripe ne traite que l'acompte. Toute la logique métier (numérotation Fondateur, crédits parrainage, statuts, anti-survente) vit dans Supabase. **Le front n'affiche que des états ; il ne calcule aucun prix ni crédit.**

---

## 1. Décisions verrouillées

Les 4 points business/design restés ouverts ont été tranchés par Mathias. **Tout le PRD est désormais stable.**

| # | Point | Ma reco |
|---|---|---|
| D1 | **Prix album final « à partir de 63 € ».** | ✅ **VERROUILLÉ à 63 €** (confirmé depuis la grille interne). Reste en variable isolée dans le code pour modif facile. |
| D2 | **Affichage de l'offre Standard en mode Fondateur.** | ✅ **VERROUILLÉ** : en mode Fondateur, Standard visible mais **secondaire** (droite, plus petite). Au sold-out, Standard passe au centre et devient l'offre active. |
| D3 | **Section 2 mobile** — nombre de cartes visibles. | ✅ **VERROUILLÉ : 1,2 carte visible** (carte active pleine + amorce de la suivante à droite), incite au swipe. |
| D4 | **Offre Influenceur — montant + prix barré.** | ✅ **VERROUILLÉ : acompte 25 €**, crédité 30 €, **sans prix barré**. La mention « −10 € via code » du spec est **caduque** (le delta réel serait −5 €, et on n'affiche aucun delta de toute façon). |

---

## 2. Architecture de page — ordre définitif

Numérotation unifiée (top → bottom). Remplace les numéros divergents des deux docs.

| # | Section | Statut composant | Réf visuelle PDF |
|---|---|---|---|
| — | **Navbar** | réutiliser l'existant + delta | toutes pages |
| S1 | **Hero produit** | nouveau | p.1 (Header) |
| S2 | **Expérience Bellajour** (carrousel 4 cartes) | nouveau | p.2 |
| S3 | **L'objet Bellajour** (boutons + image) | nouveau | p.3 |
| S4 | **Réservation fondatrice** (offre + paiement) ← *handoff* | nouveau | p.4 |
| S5 | **Garanties + FAQ courte** | FAQ = réutiliser l'accordéon existant | p.5 |
| — | **Footer** | réutiliser l'existant | p.6 |

**Variante Influenceur** = la même page ; seul le bloc offre de **S4** change (voir §5.4 + §6). Pas une section à part.
**Page « Nos prix »** (PDF p.7) = **route séparée, hors scope de ce PRD**. La navbar y pointe (voir Navbar), mais elle se spécifie à part.

**Responsive :** une seule page responsive, pas deux builds. Breakpoint desktop/mobile selon la convention du repo. Mobile = CTA sticky bottom (voir Navbar).

---

## 3. Machine à états de l'offre (le cœur de la stabilité)

S4 affiche **un seul mode à la fois**. Les 3 modes sont **mutuellement exclusifs par construction**.

### 3.1 Les 3 modes

| Mode | Déclencheur | Affichage S4 |
|---|---|---|
| **FOUNDER** | `foundersConfirmed < 100` ET pas de `?ref` valide | Fondateur au centre (prominent) + Standard secondaire (droite). Prix barré 30→25, badge Fondateur, compteur « X places restantes ». |
| **SOLDOUT** | `foundersConfirmed >= 100` ET pas de `?ref` valide | Offre Standard seule, au centre, prominent. **Pas de prix barré.** Carte Fondateur retirée. |
| **INFLUENCER** | `?ref` valide (priorité sur les deux autres) | Offre Influenceur seule (acompte 20 €). Pas de prix barré agressif. |

### 3.2 Transitions

- **FOUNDER → SOLDOUT** : par **état** (100e confirmé via webhook Stripe), pas par date. Bascule visuelle automatique au prochain chargement / refresh de l'état.
- Dépassement assumé : les personnes déjà en Checkout au moment du 100e finissent normalement (101, 102…). **Pas de buffer « 99 », pas d'expiration de panier.**
- **?ref valide** force INFLUENCER quel que soit le compteur. **?ref invalide/expiré → fallback propre vers Standard** (= mode SOLDOUT visuellement, offre Standard).

### 3.3 Contrat front ↔ backend (à builder contre un mock)

Le front consomme **un état** fourni par le backend. Le dev build l'UI contre ce mock pendant que Mathias câble le vrai endpoint. Forme recommandée :

```json
// GET (état de l'offre, source de vérité = Supabase alimenté par webhook Stripe)
{
  "offerMode": "founder" | "soldout" | "influencer",
  "foundersConfirmed": 47,
  "foundersTotal": 100,
  "influencer": { "ref": "abc", "valid": true } | null
}
```

Le front calcule `placesRestantes = max(0, foundersTotal - foundersConfirmed)`.
**Le front ne décide jamais du mode lui-même** au-delà de cette logique d'affichage : il rend ce que `offerMode` dit. Source de vérité = backend, **jamais** la page de retour Stripe.

---

## 4. Navbar

**Objectif :** header simple, logo + un seul CTA contextuel.

**Desktop**
- Logo Bellajour à gauche.
- CTA à droite (taille barre desktop standard). Label contextuel :
  - hors S4 : **« Participer aux préventes »** → scroll ancré vers S4.
  - dans S4 (prix visibles) : **« En savoir plus sur les prix »** → lien vers la page « Nos prix » (route séparée).

**Mobile**
- Logo Bellajour à gauche, **pas de CTA dans la navbar**.
- CTA en **sticky bottom** :
  - hors S4 : **« Participer aux préventes »** → scroll vers S4.
  - dans S4 : **« En savoir plus »** → page « Nos prix ».

Détection « dans S4 » via IntersectionObserver sur la section S4 (pas de scroll listener non-throttlé).

---

## 5. Spec par section

### 5.1 S1 — Hero produit

**Objectif :** comprendre immédiatement « Nous composons vos photos en album d'exception ».

- **Visuel** : desktop = vidéo 16:9 vue mer, album centré ; mobile = photo 16:9 vue mer, album centré.
- **Titre** : *Nous composons vos photos en album d'exception*
- **Sous-titre** : *Vivez, nous composons*
- **CTA** : *Participer aux préventes* (sticky bottom sur mobile)
- **Comportement** : statique. Réf p.1.

### 5.2 S2 — Expérience Bellajour

**Objectif :** montrer le parcours en 4 étapes, de l'import à l'illustration.

- **Titre section** : *Tout le parcours, sans la complexité.*
- **Format** : section quasi plein écran, **carrousel horizontal de 4 grandes cartes**. 1er écran : ~2,5 cartes visibles (desktop) / 1,2 carte (mobile, voir D3).
- **Comportement** : seule la carte active (gauche) est animée ; les autres figées + légère transparence. Bouton flèche pour naviguer. Mobile : swipe au doigt + flèche.
- Chaque carte = label court + titre + sous-texte + vidéo/mockup animé.

**Carte 01 — L'upload**
- UX : *Ajoutez l'ensemble de vos photos, même si elles ne sont pas triées. Invitez vos proches à contribuer directement sur votre projet.*
- Algo : *Bellajour analyse chaque photo : netteté, lumière, doublons, valeur émotionnelle… afin de préparer la composition.*

**Carte 02 — Le questionnaire**
- UX : *Choisissez vos préférences de mise en page parmi nos différents styles, ajustez la densité. Définissez les rôles des protagonistes de votre histoire.*
- Algo : *Vos réponses calibrent l'algorithme de sélection. Il sait maintenant qui compte pour vous, quelles photos prioriser, dans quel ordre, et avec quelle intention narrative.*

**Carte 03 — La mise en page**
- UX : *Votre album est déjà là. Feuilletez, admirez, et si une photo vous manque, échangez-la en un geste selon vos envies.*
- Algo : *Bellajour a sélectionné, ordonné et mis en page vos meilleures photos. Les autres sont triées par critères — lieu, moment, personne — pour que comparer et choisir ne prenne que quelques secondes.*

**Carte 04 — L'illustration**
- UX : *Choisissez une illustration générée uniquement pour votre album, créée pour refléter votre histoire. Ajoutez-la en couverture, complétez avec une de vos photos si vous le souhaitez. Sélectionnez vos couleurs, donnez un titre à vos souvenirs.*
- Algo : *Bellajour a analysé l'ensemble de votre album — les lieux, les visages, les émotions — pour générer une illustration qui lui ressemble. Rien n'est pioché dans une bibliothèque. C'est la vôtre !*
- Clôture (mise en valeur) : *Votre album est prêt !*

Réf p.2.

### 5.3 S3 — L'objet Bellajour

**Objectif :** faire ressentir la qualité physique sans répéter le Hero.

- **Titre section** : *Un objet de fascination*
- **Comportement** : les **titres sont des boutons** ; cliquer ouvre l'encart correspondant. L'image change selon le bouton actif (glisse droite → gauche : l'ancienne sort, la nouvelle entre). Mobile : encarts à l'horizontal, nav flèche / glisser au doigt, animation simple, texte au-dessus ou sous l'image.

**Le format** · *Fait pour durer*
A4 portrait — 21 × 29,7 cm. Un format choisi pour une raison précise : il suit naturellement le regard. La verticalité de l'A4 portrait accompagne la lecture, page après page, comme on tourne les chapitres d'un livre. Couverture rigide. Papier 170g. Base de 30 pages — pas 24. La plupart des albums démarrent au minimum d'impression en usine. Nous avons choisi 30, parce que 24 pages, c'est trop peu pour raconter une histoire.

**L'illustration** · *Une couverture pensée comme une œuvre*
La couverture de votre album est une illustration originale générée à partir de votre voyage, ses couleurs, ses ambiances et son âme. Elle ne reproduit pas vos photos. Elle les interprète. Chaque couverture est unique, faite pour être exposée.

**La mise en page** · *Des pages composées pour raconter*
Les photos sont organisées en chapitres, doubles-pages et respirations visuelles. Bellajour alterne les grands moments, les séquences intimes et les pages plus calmes pour créer un rythme naturel. Trois styles de mise en page coexistent dans chaque album : pleine page pour les photos qui méritent tout l'espace, composition à plusieurs images pour les séquences et les détails, et pages aérées pour laisser respirer le récit.

**La 4ème de couverture** · *L'endroit où rien n'a besoin d'être dit*
La quatrième de couverture porte juste une photo, ou rien. Un espace pour souffler avant de refermer l'album. La sobriété comme choix délibéré.

**La reliure** · *Une tranche marquante*
La tranche de l'album est le seul endroit où figure le titre de votre voyage. Posé sur une étagère parmi d'autres, c'est ce qui le rend reconnaissable au premier coup d'œil : un nom, une date, une destination.

Réf p.3.

### 5.4 S4 — Réservation fondatrice (handoff)

**Objectif :** convertir. C'est ici que vit le bouton de handoff.

> ⚠️ **Affichable vs interne** : seuls les montants d'acompte et ce que reçoit le client vont sur la page. Marges, commissions influenceurs, coûts de production = **internes**, jamais affichés ni dans le code front.

- **Titre** : *Pré-commandez dès maintenant votre album Bellajour*
- **Sous-titre** : *Lancement le 15 août, date à laquelle vous pourrez concevoir votre premier album*

#### Contenu des offres (client-facing)

| | **Fondateur** (100 places, 13 juin → 15 août) | **Standard** (15 juin → 15 août) | **Influenceur** (via code) |
|---|---|---|---|
| Acompte | **25 €** (au lieu de 30 €) | **30 €** | **25 €** (via code) |
| Crédité sur commande | **30 €** | 30 € | 30 € |
| Statut | **Fondateur numéroté #1 → #100** | — | — |
| Illustration Midjourney offerte | ✅ | — | — |
| Instants crédités | **200** | 100 | 100 |
| Livraison offerte | ✅ | ✅ | ✅ |
| Version digitale HD | ✅ | ✅ | ✅ |
| Accès anticipé | — | ✅ (1ers à recevoir) | — |

**Argument transverse :** l'acompte est **intégralement crédité** sur la commande finale (l'album se règle ensuite au prix grille selon le nombre de pages, base 30 pages, à partir de 63 € — voir D1).

#### États d'UI à coder

- Compteur de places Fondateur (alimenté backend, voir §3.3).
- Bascule sold-out Fondateur → Standard (déclenchée par l'état).
- Badge « Fondateur ».
- Style prix barré (Fondateur uniquement : 30 → 25).
- Écran succès paiement → merci + code parrainage.
- Écran erreur paiement.

#### Parcours utilisateur

1. **Case « J'accepte les CGV »** (obligatoire) — désactive le bouton tant que non cochée. Lien CGV branché plus tard (avec Louis) ; **prévoir l'emplacement dès maintenant**.
2. CTA **« Réserver mon acompte »** → handoff `POST /api/checkout` (voir §6).
3. Retour paiement validé → écran de confirmation + explication du système de parrainage + **code de parrainage affiché**.
4. Mails (backend) : Mail 1 = récap paiement, Mail 2 = parrainage.

**Parrainage (front) :** le code est remis **dès la prévente**, mais la remise (1 page = 1 €) **ne s'active qu'à partir du 15 août**. Le front affiche le code + l'explication ; il **ne gère aucun crédit**.

Réf p.4.

### 5.5 S5 — Garanties + FAQ

**4 garanties visibles :** Photos privées · Validation avant impression · Paiement sécurisé · Acompte remboursable si non-production.

**FAQ accordéon (réutiliser le composant existant) — 5 Q/R :**

1. **Quand pourrai-je créer mon album ?** Le lancement a lieu le **15 août**. En réservant pendant la prévente, vous faites partie des tout premiers à concevoir votre album, dès l'ouverture.
2. **Combien coûtera l'album final ?** L'album se règle selon son nombre de pages, à partir de **63 €ⁱ pour 30 pages** (le format de base). Votre acompte est **intégralement crédité** sur ce prix : il n'est pas un surcoût, il est déduit de votre commande.
3. **Puis-je valider avant impression ?** Oui. Rien n'est imprimé sans votre **validation finale**. Vous feuilletez votre album, ajustez ce que vous voulez, et vous seul décidez du moment de lancer l'impression.
4. **Mes photos sont-elles sécurisées ?** Vos photos sont **privées et protégées**. Elles ne servent qu'à composer votre album, ne sont jamais partagées ni réutilisées, et vous pouvez les supprimer à tout moment.
5. **Que se passe-t-il si Bellajour n'est pas prêt à temps ?** Votre acompte est **intégralement remboursable** si l'album ne peut pas être produit. Vous ne prenez aucun risque en réservant aujourd'hui.

ⁱ `63 €` = variable isolée tant que D1 non confirmé.

Réf p.5 (utiliser le visuel « référence » à droite, pas la version vide à gauche).

---

## 6. Contrat de handoff `/api/checkout`

Frontière unique. Le dev construit **tout jusqu'au clic** ; le bouton appelle l'endpoint, géré par Mathias.

```json
// POST /api/checkout  (envoyé par le front)
{
  "offerType": "founder" | "standard" | "influencer",
  "ref": "abc" | null,        // présent si influencer
  "cgvAccepted": true          // toujours true (bouton désactivé sinon)
}
// Réponse attendue : { "checkoutUrl": "https://checkout.stripe.com/..." }
// → le front redirige vers checkoutUrl. Le front NE calcule aucun prix.
```

Retour de paiement : page de confirmation (succès / erreur). Le code parrainage affiché vient du backend, **pas** d'un calcul front.

---

## 7. Wording corrigé — coquilles du mockup PDF à NE PAS reproduire

Le PDF p.4 contient des coquilles et du texte qui se chevauche. **Le wording de ce PRD fait foi**, pas le mockup. À corriger explicitement :

| Mockup PDF (faux) | Correct (ce PRD) |
|---|---|
| « maintenantvotre album » (espace manquant) | « maintenant votre album » |
| « Acompte offre fondatrice » | titre = « Pré-commandez dès maintenant votre album Bellajour » ; carte = « Offre Fondateur » |
| Standard : « 5 C de crédit » | Standard : **100 Instants crédités** (pas « 5 € ») |
| Standard : texte qui se chevauche / illisible | suivre le tableau §5.4 |
| Sous-titre « De quoi vous laisser le temps de prendre plein de photos cet été » | non retenu (garder le sous-titre du spec : « Lancement le 15 août… ») |

---

## 8. Assets à fournir (avant / pendant build)

- [ ] Visuels exportés **webp**, optimisés, nommés, dans `public/images/prevente/`.
- [ ] Vidéos : header S1, animations parcours S2 (×4), photo objet S3.
- [ ] OG image + title/meta/OG tags.
- [ ] Delta charte appliqué (badge Fondateur, prix barré, état sold-out) — la DA globale est déjà installée.
- [x] Prix + acomptes validés (Fondateur 25 · Standard 30 · Influenceur 25 · album final 63 €).
- [x] Réponses FAQ rédigées.
- [ ] CGV : texte + lien à brancher ensuite (avec Louis). Case déjà prévue front.

---

## 9. Hors scope de ce PRD (à spécifier séparément)

- **Page « Nos prix »** (PDF p.7) — route séparée, ciblée par le CTA navbar en S4.
- **Texte des CGV** — à rédiger avec Louis ; seul l'emplacement (case + lien) est dans ce PRD.
- **Toute la logique backend** — Stripe Checkout, Supabase (compteur, statuts `pending→confirmed`, parrainage, anti-survente), Brevo (mails). Côté Mathias. Le front consomme l'état (§3.3) et appelle `/api/checkout` (§6), rien de plus.
