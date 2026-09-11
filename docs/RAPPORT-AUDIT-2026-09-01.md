# Note de repasse — audit du 01/09/2026

Rédigée pendant ton absence. Trois audits en parallèle (front perf/SEO/UX/responsive, back
sécurité/données, structure prix+géométrie), plus tes six tickets à décision. Tout ce qui suit est
**prouvé dans le code** (fichier + ligne), rien n'est une intuition. Aucun chiffre inventé.

Branche : `fix/atelier-invoice-jobs`. **Rien n'a été commité, poussé, ni déployé. Aucun mail
réel n'est parti. Aucune migration n'a été appliquée.**

---

## 1. En deux minutes

- **2 correctifs sans risque appliqués et vérifiés** (build + lint + types + harnais atelier au
  vert) : la suppression de photo ne crée plus d'objet orphelin (T-048), et l'image de partage ne
  peut plus faire échouer un déploiement entier (T-069, partie technique).
- **Bonne nouvelle sur tes questions** : le **code fondateur est déjà 100 % automatique** (T-021),
  et la **rétention 90 jours est déjà écrite et testée** (T-076) — il ne reste que 2 gestes de ta
  part pour l'activer. Détails en §3.
- **Alerte** : je **n'ai pas envoyé** les 5 mails en test (T-025). L'outil actuel peut spammer de
  vraies clientes. À faire ensemble, encadré — voir §3.
- **Le backlog était périmé** : T-059 et T-061 étaient **déjà corrigés** depuis le 30/08. Statuts
  remis d'équerre. 3 nouveaux tickets ouverts pour tes retours (bande étapes, densité prix, logo
  du questionnaire).
- **Ta grande demande « prévoir la structure prix + géométrie »** : cadrage complet en §5, avec les
  fichiers à créer et la liste exacte des chiffres/specs qu'il me manque pour brancher.

---

## 2. Ce qui a été mis en place aujourd'hui (zéro risque, déjà vérifié)

| # | Ce qui a changé | Pourquoi c'était sûr | Preuve |
|---|---|---|---|
| **T-048** | `r2.supprimer()` rend maintenant un booléen ; la route de suppression de photo ne retire la ligne en base **que si l'objet R2 est vraiment parti**, sinon 500 et la cliente réessaie. | Avant, un échec R2 (panne) effaçait quand même la ligne → un objet **orphelin invisible et éternel**, l'inverse de ce que le code visait. Patron déjà éprouvé dans `anonymiser-dossiers.ts`. Les autres appelants ignorent la valeur de retour → aucune casse. | `src/lib/atelier/r2.ts`, `src/app/api/atelier/photos/supprimer/route.ts` |
| **T-069** (partie technique) | Les chargements de polices/images de l'image de partage ne lèvent plus d'exception : sur échec, l'image se fabrique **sans le décor manquant**. | Un fichier décor déplacé (le ménage T-003) ou Google Fonts injoignable faisait **échouer tout le déploiement**, y compris un correctif urgent sur la page qui fait payer. Le repli est strictement plus sûr que le `throw`. | `src/app/opengraph-image.tsx` |
| Backlog | T-059 et T-061 passés « à fermer » (déjà corrigés le 30/08, prouvé au build) ; T-063 requalifié en confort ; 3 tickets ouverts. | Documentation seule. | `docs/backlog/INDEX.md`, fiches T-086/087/088 |

**Vérification** (socle) : `tsc --noEmit` → 0 erreur · `npm run lint` → propre · `npm run build`
→ succès · `verif-atelier.ts` → **TOUT PASSE**.

> Le **visuel** de l'image de partage (le mot « album » au lieu de « magazine », les couleurs) et
> le fait de **rendre son image à `/ambassadeurs`** restent à faire — c'est ton chantier visuel, je
> n'y ai pas touché.

---

## 3. Tes six tickets — réponses

### T-077 — CGV 210×280 vs produit réel 210×297
Les faits te donnent raison : les deux produits Cloudprinter sont **A4 exact (210×297) + 3 mm de
fond perdu** (relevé via l'API, `docs/reference/SPECS-CLOUDPRINTER.md`). Les CGV mentent en disant
210×280. Comme tu l'as tranché : on corrige **dans le lot CGV complet** (prix, papier, grammage,
finitions, relecture juriste) — tout est déjà regroupé dans `docs/produit/LOT-JURIDIQUE.md`. Rien
à faire seul : c'est du texte légal. **Prêt pour le jour du bloc CGV.**

### T-021 — le code fondateur : pourquoi manuel ?
**Il ne l'est plus.** Vérifié dans le code : c'est **déjà entièrement automatique** depuis le 01/09.
- Un code **unique par personne** est frappé chez Stripe (`coupon` + `promotion_code`,
  `max_redemptions: 1`) — `fondatrice.ts`.
- Il est **appliqué d'office** sur la session de paiement : la cliente ne tape rien, la ligne
  « −30,00 € » apparaît sur l'écran Stripe — `checkout/route.ts:257-259`.
- Il est **présent côté Stripe** (coupon nommé « Crédit fondateur nºX », visible en métadonnées) et
  **porté par les mails M3/M3b**.
- **Ce qui reste** : uniquement le **tout premier vrai paiement fondatrice contre Stripe**, jamais
  éprouvé en réel. Avant de l'ouvrir, il y a 6 points à vérifier à la main (déjà listés dans la
  fiche T-021). Donc : ta demande « automatique dans le mail + visible dans Stripe + unique » est
  **déjà satisfaite**. Il n'y a rien à construire, juste à tester une fois.

### T-076 — combien de temps garde-t-on un dossier abandonné ?
**Tu as déjà tranché le 01/09 : 90 jours, anonymisation (pas suppression), relance à J-7.** Et
c'est le bon choix — pour trois raisons :
- **90 jours est l'usage courant** (30 à 90 j) pour un panier/dossier abandonné, assez long pour
  laisser revenir une cliente, assez court pour ne pas garder des photos perso indéfiniment.
- Le compte part de la **dernière activité** (dépôt jamais fini) ou de la **date du dépôt** (fini
  mais jamais payé), **pas de la création** — sinon une cliente qui monte 40 photos au 85ᵉ jour
  voyait tout effacé 5 jours après. C'est le piège qu'on a évité.
- **Anonymiser** plutôt que supprimer garde la ligne de compta/statistique tout en effaçant les
  données perso.

Le code est **écrit et testé** (`retention.ts`, 72 vérifications, dry-run passé sur la vraie base :
6 dossiers, 0 à refermer). Il est **inerte** — il te reste **2 gestes** :
1. Appliquer la migration `supabase/migrations/20260901_atelier_retention.sql` (colonne
   `anonymise_le`), puis vérifier que la donnée arrive.
2. Pousser le template **M10** chez Brevo (`node scripts/recette.mjs pousser … M10 --pousser`) et
   poser la variable `BREVO_TEMPLATE_M10_ID`. ⚠️ **Sans M10, rien ne s'anonymise du tout** (le
   script refuse de fermer un dossier non prévenu).

Reste aussi à écrire une phrase sur ces 90 jours dans la politique de confidentialité (texte légal
→ ton accord). Consigné dans le lot juridique.

### T-020 — le traceur d'audience (Vercel Web Analytics)
Ce que ça t'apporte, expliqué simplement :
- **Ce que tu verras** : combien de visiteuses arrivent sur `/`, `/magazine`, `/composer` ; sur
  quel appareil (et donc **le décrochage Android** qu'on ne peut pas voir aujourd'hui) ; d'où elles
  viennent (Instagram, Google, direct) ; le pays/la ville ; et, avec Speed Insights, la vraie
  vitesse ressentie sur de vrais téléphones (pas ta fibre).
- **Ce que ça ne verra PAS** : l'entonnoir écran par écran du questionnaire (les 6 écrans vivent
  sous la même URL) ; le lien avec un dossier précis (volontairement masqué). Pour ça, la page
  `/admin/atelier/metriques` reste la source.
- **Vie privée** : pas de cookie, pas de bandeau à ajouter, et surtout **les jetons secrets de tes
  liens (`/numero/<token>`) sont retirés de l'adresse avant tout envoi** — c'était une vraie fuite
  potentielle, elle est bouchée dans le code (`beforeSend` + `src/lib/analytics/chemin.ts`).
- **Coût** : **gratuit** sur un compte **Hobby** (50 000 évènements/mois, aucune facture possible).
  ⚠️ **Si ton projet est sur un compte Pro**, Speed Insights coûte **10 $/mois** — Web Analytics,
  lui, reste sans risque dans les deux cas. **À vérifier avant de cliquer « Enable » sur Speed
  Insights.**

Le code est **déjà branché et inerte**. Pour activer : déployer la branche, puis sur vercel.com →
projet → onglet **Analytics** → **Enable** (et **Speed Insights** → **Enable**), puis redéployer une
fois. Réversible en retirant `<Mesure />` du layout. **C'est ta décision et ton clic — je ne me
connecte pas à ton tableau de bord.**

### T-025 — envoyer les 5 mails jamais partis en test
Tu as dit « oui, faisons-le ». **Je ne l'ai pas fait, et voici pourquoi je préfère qu'on le fasse
ensemble, à ton retour :** l'audit a montré qu'il **n'existe aucun script d'envoi de test *sûr*.**
Le seul mécanisme (`recette.mjs pousser`) :
- envoie à **l'adresse enregistrée sur le dossier ciblé** — rien ne garantit que c'est la tienne ;
- et déclenche la **relève complète** : **tous les dossiers dus ce jour-là** reçoivent leur mail —
  **y compris de vraies clientes**, car la base de preview et de prod est **la même**.

Envoyer à l'aveugle en ton absence, c'est risquer d'écrire à une vraie cliente. C'est exactement le
genre d'envoi sortant irréversible que je ne déclenche pas seul.
**Marche à suivre encadrée, à ton retour** (5 min ensemble) :
1. On vérifie **en base** qu'un dossier de test porte bien **ton** adresse.
2. On cible ce dossier, sur `--sur=preview`, un mail à la fois : `M3b` (=31), `M8` (=35), et pour
   `M7` (=34) on simule le webhook Cloudprinter (`recette.mjs signal … ItemShipped`).
3. Pour `M9` (=36) et l'auto-validation J+7, il faut d'abord retrouver leur déclencheur exact — je
   te le prépare.

### T-069 — l'image de partage
La **partie dangereuse est réglée** (le `throw` qui cassait le build, voir §2). Le **visuel** (ne
plus promettre un « album », montrer le magazine) attend ton chantier visuels, comme tu l'as
décidé. Il faudra aussi **rendre son image à `/ambassadeurs`** (aujourd'hui un partage de cette
page montre un rectangle vide). Ces deux points sont des décisions/visuels — je te les laisse.

---

## 4. Ce qui reste à faire — recommandations classées

Priorité = gravité × ce que ça débloque. Le **risque** est celui de *corriger* (pour décider ce
qu'on ose faire vite).

### 🔴 Bloquant / argent en jeu
| Ticket | Constat prouvé | Reco | Risque du fix |
|---|---|---|---|
| **T-049** | Le retour de paiement Stripe utilise l'en-tête `Origin` sans le vérifier (`checkout/route.ts:175`). Un lien piégé peut faire payer une cliente puis la renvoyer sur une fausse page « Votre numéro ». | Liste blanche de domaines. | **MOYEN** — une liste incomplète casse le paiement pour tout le monde. À tester en preview. |
| **T-081** | Aucune réconciliation Stripe ↔ base. Si un paiement n'écrit pas le dossier, **personne ne le sait** (l'argent est pris). | Script lecture seule, dry-run, qui compare les sessions Stripe réglées aux dossiers ≥ payée. | **NUL** (lecture seule). *Bon candidat à construire — je te propose de le faire à ton retour, avec ton œil sur la logique.* |

### 🟠 Sérieux
| Ticket | Constat | Reco | Risque du fix |
|---|---|---|---|
| **T-008** | Le rate-limit est une `Map` en mémoire, perdue à chaque cold start Vercel : inefficace. Et `/api/checkout` (prévente) n'en a **aucun**. | Compteur partagé (table Supabase) sur `/api/checkout` d'abord. | FAIBLE (migration = ton geste). |
| **T-082** | La liste `CHAMPS_MAIL` n'a pas le repli `42703` que le reste du code a : **une seule colonne manquante casse toute la relève de mails** + la page Santé + la page cliente. | Helper de lecture avec repli, même idiome que `transition/route.ts`. | FAIBLE, mais touche le chemin des mails → à faire avec recette. *Prêt à faire, je préfère ton feu vert vu le rayon d'impact.* |
| **T-084** | Deux dossiers pour la même adresse ne sont signalés nulle part → l'atelier peut composer un dossier vide. | Signalement (pas de fusion auto) sur `email_canonical`. | **NUL** (affichage seul). |
| **T-064** | ~30 déclarations de police jamais peintes chargées sur `/`, `/magazine`, `/composer` (polices crème déclarées dans le layout racine). | Sortir les polices vers un module posé seulement sur les 8 pages crème. | **MOYEN** — un oubli fait retomber une page en police système, en silence. Recette visuelle obligatoire. |
| **T-066** | Ouvrir `/composer` télécharge d'emblée tout le moteur d'envoi de photos (~72 % du poids), avant le moindre champ. | `next/dynamic` sur l'écran 5. | **ÉLEVÉ** — le worker nu et le raccourci `?reprendre=` sont deux pièges ; test réel de dépôt exigé. |

### 🟡 Confort
| Ticket | Constat | Risque du fix |
|---|---|---|
| **T-062** | Le grain (blend-mode plein écran) refond le viewport à chaque frame de scroll sur mobile. La moitié du ticket (boucles rAF hors écran) est **déjà faite**. Reste `content-visibility` par page + tester une opacité simple pour le grain. | FAIBLE pour `content-visibility`, MOYEN pour toucher le grain (rendu esthétique assumé). |
| **T-063** | 2 règles CSS globales (`overflow-wrap:anywhere !important`, `max-width:100vw`) restent des pièges à reproduire. `/magazine` est déjà protégé. | MOYEN (une page qui compte dessus casserait en silence). |
| **T-047** | Un paiement sous alias Gmail n'attribuerait aucun numéro fondateur — **mais borné** : prévente fermée, ne se produit que si tu la rouvres. | FAIBLE (migration SQL). |

---

## 5. Ta grande demande — prévoir la structure « prix + géométrie »

Objectif tenu : **tout câbler pour n'avoir qu'à brancher les chiffres le jour venu**, sans inventer
un seul nombre. Voici le cadrage. Le détail complet (formes d'objets, chemins) est prêt à devenir
du code dès que tu me donnes le feu vert.

### 5.1 Tarification dégressive (T-072/073/074)
**Ce qui existe** : `src/lib/atelier/prix.ts` porte une grille **en dur à 3 prix** (30/40/45 €,
livraison fondue dedans) et `QUANTITE_MAX = 1`. Le point d'entrée Stripe pose **une seule ligne**,
sans ligne livraison. Les « 3 prix » affichés sur la PDP (`paliers.ts`) sont **provisoires et faux**.

**Structure proposée** (paramétrable, un seul endroit, serveur uniquement) :
- Un fichier **`bareme.ts`** : `pageDeBase`, `prixDeBase`, **`pasPages` (2 ou 4)**,
  `incrementParPas`, `pageMax` ; une table `REMISES_QUANTITE` (vide tant que tu n'as pas les
  paliers) ; un bloc `LIVRAISON` par pays avec `incluseSiFondateur: true`.
- Des **fonctions pures** : `prixAlbum(nbPages)` (barème dégressif), `remiseQuantite(...)`,
  `livraison(pays, estFondateur)` — **c'est ici que « livraison offerte au fondateur » s'exprime
  proprement**, au lieu du forfait −30 € actuel qui ne distingue pas album et port.
- Un objet **`Devis`** unique (album, remise, livraison, total, + ventilation des lignes) qui
  circule du checkout à la facture.
- Côté Stripe : **deux lignes** (album + livraison) au lieu d'une → la livraison apparaît
  distinctement, y compris sur la facture InvoiceXpress avec la TVA au taux du pays.

**Ce qu'il me manque de toi pour brancher** (aucun ne s'invente) :
1. Le barème pages : prix de base, à partir de combien de pages, **le pas (2 ou 4)**, l'incrément.
2. Les paliers dégressifs par quantité + la quantité max.
3. Le modèle de livraison : prix par pays/zone, et l'arbitrage ligne séparée vs option Stripe.
4. Confirmer : c'est **la livraison seule** qui est offerte au fondateur (pas le −30 € actuel).
5. (comptable / projet Louis) le taux de TVA par pays (OSS) — le « 23 % » en dur à 3 endroits est
   **réputé faux** et **ne doit pas être déployé** avant l'arbitrage de Louis.

### 5.2 Géométrie produit / PDF print-ready (T-077/078)
**Ce qui existe** : `impression.ts` porte déjà les specs relevées (210×297, fond perdu 3 mm, règles
de pagination) et les verdicts de contrôle. Le « moteur » actuel **contrôle** des PDF déposés à la
main, il n'en **fabrique aucun**. Les 66 gabarits de mise en page (JSON, géométrie normalisée
0→1) existent mais sont **hors git et lus par aucun code**.

**Structure proposée** : un fichier **`specs-produit.ts`** — une entrée par référence Cloudprinter
(format fini, bleed, safe zone, pagination, grammages, **formule du dos**, profil couleur) qui
alimente à la fois le contrôleur existant et le futur générateur gabarit→HTML→PDF (Chromium hors
Vercel, écriture R2 single-part pour garder le md5 exigé).

**Ce qu'il manque — à obtenir de Cloudprinter (bloque la génération auto, ne s'invente pas)** :
1. **La formule d'épaisseur du dos** (dos carré) en fonction de `pages × grammage` — sans elle, on
   ne peut pas fabriquer la couverture enveloppante.
2. La **safe zone** (marge de sécurité) exacte par produit.
3. Le **profil colorimétrique** (CMJN/ICC) exigé.
4. Le contenu des **zips de gabarits officiels** (`templates/2208` agrafé, `templates/2216` dos
   carré) — pas encore téléchargés.

**Ce qu'il manque de toi** : grammages définitifs (T-027/028), et l'accord pour **versionner les
gabarits dans `src/`** (rouvre la décision « prototype hors git »).

### 5.3 Optimisation des images / SEO — « installer quelque chose en avance »
Deux choses posées d'avance pour le jour où tu changes tous les visuels, **sans rien casser
maintenant** : voir §4 (T-069 rendu résilient = tu pourras remplacer/déplacer les images sans faire
tomber le build). Pour le reste (formats responsive, `alt`, poids), le socle est déjà bon (canonical,
JSON-LD, sitemap sains — audit SEO §4 : rien à signaler). Le vrai gain viendra le jour J avec les
nouveaux fichiers ; je te proposerai à ce moment un pipeline (variantes téléphone + compression)
plutôt que de l'installer sur des images qui vont disparaître.

---

## 6. Nouveaux tickets ouverts aujourd'hui

| Ticket | Ce que c'est |
|---|---|
| **T-086** | PDP desktop : la bande « étapes 1-2-3 » occupe un vide disproportionné. 2 pistes (collage discret / mise en avant) — ton arbitrage. |
| **T-087** | PDP mobile : le prix à 10-11 px est à la limite de lisibilité. À traiter probablement avec le barème (T-072). |
| **T-088** | Le logo en haut du questionnaire est un **clic mort** ; le chrome de nav (retour, croix, routes) diagnostiqué. Tu as dit vouloir le retravailler — le ticket porte le diagnostic + des propositions. |

---

## 7. Ce que je n'ai pas fait, exprès

- **Aucun commit / push / déploiement.** Tout est dans le répertoire de travail, à ta main.
- **Aucun mail réel** (T-025, voir §3).
- **Aucune migration appliquée** (T-076).
- **Aucun texte légal modifié** (CGV, confidentialité — lot juridique).
- **Rien touché au questionnaire ni à la nav** (ton chantier — propositions seulement).
- **Rien touché au « 23 % » de TVA** (consigne T-075 : ne rien déployer avant Louis).

---

## 8. Si tu ne dois retenir que 3 gestes

1. **T-076** : applique la migration + pousse M10 → la rétention 90 jours s'active (RGPD).
2. **T-020** : clique « Enable » sur Vercel (après avoir vérifié Hobby vs Pro) → enfin des chiffres.
3. **T-081** : dis-moi si je construis le rapprochement Stripe↔base (lecture seule, sans risque) —
   c'est le seul filet qui manque là où de l'argent est déjà pris.
