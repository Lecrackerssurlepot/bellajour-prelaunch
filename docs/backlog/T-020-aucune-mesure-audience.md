---
id: T-020
titre: On ne saurait pas qu'une visiteuse décroche
domaine: exploitation
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Signalé dans D5 le 27/08/2026 : « Web Analytics n'est pas activé sur le projet : on n'a
aujourd'hui AUCUN moyen de voir un décrochage Android. »
## Ce que j'ai vérifié
Aucune trace de Vercel Analytics, Speed Insights ou d'un quelconque traceur dans le dépôt.
Effet : on ne sait pas combien de visiteuses arrivent, sur quel appareil, ni où elles partent.
Concrètement, aujourd'hui, on ne peut pas répondre à : combien de gens ouvrent `/`, combien
arrivent sur `/magazine`, combien commencent le questionnaire, combien l'abandonnent et à quel
écran. Le dossier abandonné du 27/08 a été découvert à la main.
Une visiteuse qui subit le jank de la barre ne le signale pas : elle part.
## Ce que je propose
Vercel Speed Insights + Web Analytics : deux lignes dans le layout racine, pas de cookie, pas de
bandeau de consentement à ajouter. C'est le minimum pour que les décisions cessent d'être prises
à l'aveugle avant le lancement.
**Question pour Mathias** : je l'active ? C'est une option payante au-delà d'un quota sur Vercel,
et c'est ta décision. Si tu préfères un outil sans traceur tiers, dis-le — il en existe.
## Ce qui a été fait

### 01/09/2026 — le branchement est posé, RIEN n'est activé

Le code est en place et inerte. Aucun clic n'a été fait sur Vercel : c'est à toi.

**Ce qui est branché**
- `@vercel/analytics@2.0.1` et `@vercel/speed-insights@2.0.0`, versionnés dans `package.json`.
- `src/app/components/Mesure.tsx` — un composant client, monté une seule fois dans
  `src/app/layout.tsx` sous `<body>`. Il porte les deux balises et le masquage.
- `src/lib/analytics/chemin.ts` — module PUR qui décide de ce qui a le droit de sortir.
- 16 vérifications ajoutées à `scripts/verif-atelier.ts` (section T-020). Le harnais passe.

**Le geste exact que tu dois faire pour activer**
1. Déployer cette branche (le code seul ne mesure rien).
2. Sur vercel.com → projet **bellajour-prelaunch** → onglet **Analytics** → bouton **Enable**.
3. Même écran, onglet **Speed Insights** → **Enable**.
4. Redéployer une fois après l'activation (Vercel ne sert le script qu'aux déploiements
   postérieurs à l'activation).
5. Les chiffres apparaissent au bout de quelques minutes de trafic réel.

Tant que tu n'as pas cliqué, les deux `<script src="/_vercel/insights/…">` répondent **404**,
le paquet écrit une ligne dans la console du navigateur, et il ne se passe rien d'autre :
aucune requête sortante, aucun rendu changé. C'est vérifié — `npm run build` passe, `/`,
`/magazine` et `/composer` restent des pages statiques comme avant.
**Réversible en une ligne** : retirer `<Mesure />` du layout.

**Rien en développement.** `Mesure.tsx` rend `null` hors production. Sans ce garde, le paquet
bascule sur `script.debug.js` servi par `va.vercel-scripts.com` : une vraie requête vers un tiers
depuis le Mac, plus du bruit dans la console à chaque navigation. **Mesuré, pas supposé** : en
lançant `next dev` et en lisant le JavaScript réellement servi au navigateur, Turbopack a résolu le
garde à la compilation et écrit `if (compile-time truthy) { return null; }` suivi de
`//TURBOPACK unreachable` — les deux balises sont littéralement inatteignables en local. Côté
production, la détection d'environnement du paquet vaut littéralement `"production"` dans le chunk
minifié : la branche debug est morte des deux côtés. Contrepartie assumée : les déploiements de **preview** mesurent, eux. C'est voulu — c'est le
seul moyen de vérifier le masquage avant la prod, et ce trafic-là, c'est toi tout seul.

### ⚠️ Le token de la cliente ne part pas — c'était une vraie fuite, pas une hypothèse

Le script de Vercel **n'envoie pas le motif de route : il envoie `location.href` tel quel**
(champ `o` du POST — lu dans `https://va.vercel-scripts.com/v1/script.js` le 01/09, et dans le
paquet `@vercel/analytics/dist/next/index.mjs` qui lui passe `path = usePathname()`). Posé tel
quel, ceci partait chez Vercel :

| page | sans masquage (ce que Vercel aurait reçu) | avec masquage |
|---|---|---|
| page cliente | `/numero/aB3xY9kLmN0pQ7rS2tU4vW6zC8dE1fG5` | `/numero/[token]` |
| retour Stripe | `/numero/<token>?paiement=ok` | `/numero/[token]` |
| reprise du dépôt | `/composer?reprendre=<token>` | `/composer` |
| espace ambassadrice | `/ambassadeurs/espace?token=<token>` | `/ambassadeurs/espace` |
| back-office | `/admin/atelier/<token>` | **rien n'est envoyé** |

Ces jetons ne sont pas des identifiants, ce sont des mots de passe : qui les a ouvre la page, et
la page porte nom, adresse et photos. Le masquage passe par `beforeSend`, le seul point où l'URL
peut être réécrite avant l'envoi, branché sur `src/lib/analytics/chemin.ts`. Trois règles :
1. `/admin/**` n'est pas envoyé du tout — c'est l'arrière-boutique, pas de l'audience.
2. tout segment porteur d'un token devient `[token]` (table des routes connues + filet générique
   pour les routes qui n'existent pas encore) ;
3. la chaîne de requête est vidée sauf `utm_*`, et le `#fragment` est jeté.
Si une URL ne se lit pas, **rien n'est envoyé** : le doute se tranche du côté de la cliente.

**On ne perd rien au comptage.** Le paquet calcule à côté un « Dynamic Path » (`computeRoute`,
champ `dp`) qui vaut déjà `/numero/[token]` sans valeur dedans, et c'est LUI qui regroupe les
vues dans le tableau de bord. On garde le motif, on jette la valeur.

### Ce que ça mesurera

Nombre de visiteuses et de vues par page, appareil (mobile / tablette / desktop), OS et version
(donc **le décrochage Android que D5 ne pouvait pas voir**), navigateur, référent (Instagram,
Google, direct), pays/région/ville. Speed Insights ajoute les Core Web Vitals réels du terrain :
LCP, CLS, INP — mesurés sur de vrais téléphones, pas sur ta fibre.

### Ce que ça ne mesurera PAS — à ne pas se raconter d'histoires

- **Aucun entonnoir interne.** On saura « 100 vues sur `/composer` », jamais « 40 abandons à
  l'écran 4 ». Les six écrans du questionnaire vivent sous la MÊME URL : Vercel ne verra qu'une
  seule page. Suivre écran par écran demanderait des évènements personnalisés — payants (plan Pro)
  et pas branchés.
- **Aucun lien avec un dossier.** C'est le prix du masquage, et c'est le bon prix : impossible de
  dire « cette visiteuse-là est la cliente qui a abandonné mercredi ». Pour ça, la base
  `evenements` et `/admin/atelier/metriques` restent la seule source.
- **Aucun parcours reconstitué.** Vercel jette la session au bout de 24 h par conception.
- **Rien sur `/admin`** : volontairement coupé.
- **Pas d'UTM sur le plan Hobby** : Vercel réserve leur affichage au plan Pro + add-on. Le code
  les laisse passer pour le jour où, mais ils ne s'afficheront pas aujourd'hui.

### RGPD — ce qui est prouvé, ce qui reste supposé

**Prouvé** (doc Vercel « Privacy and Compliance », lue le 01/09/2026, page datée du 26/06/2026) :
- aucun cookie tiers ; la visiteuse est identifiée par un **hash calculé depuis la requête** ;
- la session **n'est pas conservée** : jetée automatiquement au bout de 24 h ;
- pas d'identifiant permettant de recouper une même personne entre sites ou applications ;
- les points de donnée listés par Vercel : horodatage, URL, motif de route, référent, paramètres
  de requête filtrés, géolocalisation (pays / région / **ville**), OS, navigateur, type d'appareil ;
- Vercel écrit noir sur blanc que les URL peuvent contenir un token et que `beforeSend` est le
  remède. C'est exactement ce qu'on a fait.

**Supposé, pas prouvé** : que « sans cookie » suffise à se passer de bandeau de consentement.
C'est la position de Vercel et la lecture courante des lignes directrices CNIL sur la mesure
d'audience exemptée, mais l'exemption CNIL est **conditionnelle** (finalité strictement limitée
à la mesure, pas de recoupement, pas de transmission à des tiers, durée bornée). Le hash calculé
côté serveur par Vercel et la géolocalisation à la ville sont les deux points que je ne peux pas
trancher seul. Je n'affirme pas que c'est exempté ; je dis que rien n'écrit sur le poste de la
visiteuse et que le code ne pose aucun cookie.

### ✅ Le texte légal est à jour — 01/09/2026, sur ton accord explicite

« Alors on y va pour les cookies » (conversation du 01/09). Périmètre strictement tenu à ça.

`src/app/legal/content/confidentialite.ts` a bougé à **deux endroits, dans les trois langues** :
- **tableau des sous-traitants (§9)** — la ligne `Vercel` passe de « Hébergement du site » à
  « Hébergement du site et mesure d'audience (Vercel Web Analytics) ». Localisation, transfert
  hors UE et encadrement DPF/CCT inchangés : Vercel était déjà déclaré.
- **§8.1, un paragraphe ajouté en fin de section** (après celui du bandeau, avant 8.2 Meta) :
  mesure d'audience sans cookie ni identifiant persistant ; la liste exacte de ce qui est
  collecté (page consultée, référent, pays/ville, appareil, navigateur, système) ; le fait que
  **les identifiants secrets de nos liens sont retirés de l'adresse avant tout envoi** — c'est
  `beforeSend` + `src/lib/analytics/chemin.ts`, donc une phrase que le code tient vraiment ;
  pas de revente, pas de recoupement entre sites ; Vercel = sous-traitant, renvoi au §9.

**Ce qui n'a PAS été écrit, volontairement** : nulle part il n'est dit qu'aucun consentement
n'est requis. Ce point reste non tranché (voir « Supposé, pas prouvé » ci-dessus) et une
politique de confidentialité n'est pas l'endroit où l'on tranche ça tout seul.

**Ce qui n'a PAS été touché** : le pixel Meta (Mathias le garde, il fera de la publicité), le
bandeau de consentement décrit mais inexistant, le §3, le numéro de version (3.1) et sa date.
Ces quatre points partent dans **`docs/produit/LOT-JURIDIQUE.md`**, avec le reste de la refonte
CGV (format 210×297, prix, grammage, finitions, relecture juriste, palier 29 pages, rétention
90 jours de T-076).

**Réserve** : Speed Insights, monté par le même composant, n'est pas mentionné — c'est de la
mesure de performance, hors périmètre de l'accord du 01/09. Consigné dans le lot juridique.

Tu peux donc cliquer **Enable** : le texte décrit maintenant ce que fait le site.

### Coût — vérifié dans la doc tarifaire Vercel le 01/09/2026

- **Web Analytics, plan Hobby** : gratuit, 50 000 évènements / mois, projets illimités, fenêtre de
  consultation 1 mois. Au-delà : 3 jours de grâce puis Vercel **arrête de collecter** — un compte
  Hobby ne peut pas être facturé. Zéro risque de facture surprise.
- **Speed Insights, plan Hobby** : gratuit pour **UN seul projet**, 10 000 évènements / mois,
  fenêtre 7 jours. Au-delà, collecte en pause jusqu'au lendemain. Zéro facture possible.
- ⚠️ Ces chiffres valent pour un compte **Hobby**. Si le projet est sur un compte **Pro**, Speed
  Insights coûte **10 $/projet/mois** et Web Analytics passe à l'usage ($0,03 / 1 000 évènements).
  Je n'ai pas vérifié sur quel plan est le compte — je ne me connecte pas à ton tableau de bord.
  **À regarder avant de cliquer Enable sur Speed Insights.** Web Analytics, lui, est sans danger
  dans les deux cas aux volumes actuels.
