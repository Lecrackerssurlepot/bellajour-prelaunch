---
id: T-163
titre: Le site n'envoie aucun en-tête de protection, l'atelier peut être affiché dans la page d'un autre site
etat: en cours
domaine: exploitation
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- 19/10, `curl -D -` sur `https://www.bellajour.fr/admin/login` : seul
  `strict-transport-security` est présent (posé par la plateforme). Ni `Content-Security-Policy`
  (`frame-ancestors`), ni `X-Frame-Options`, ni `X-Content-Type-Options`, ni `Referrer-Policy`.
- `next.config.ts` ne déclare des en-têtes que pour le cache de `/images/*`.
- Scénario : une page tierce encadre `/admin/atelier` pendant que Mathias ou Louis y est
  connecté, et fait cliquer sur un geste d'écriture (envoi à l'impression, transition). Même
  chose pour l'espace d'une édition (`/edition/<token>`), dont le lien circule.

## Ce que je propose
Commencer sans rien casser : `X-Frame-Options: DENY` (ou `frame-ancestors 'none'`),
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` sur tout le
site (`/edition` et `/depot` gardent leur `no-referrer`). Puis une CSP en mode « rapport seul »
le temps de recenser ce que les pages chargent vraiment (Stripe, R2, polices, Brevo), avant de
l'appliquer.

## Ce qui a été fait
- 20/10 : `next.config.ts` `headers()` (le raisonnement complet est en tête du fichier).
  - **Appliqué partout** : `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors
    'none'` (la SEULE directive de CSP appliquée), `X-Content-Type-Options: nosniff`,
    `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(),
    microphone=(), geolocation=()` (aucune page ne s'en sert ; le verrou d'écran de `/depot` et
    le presse-papiers ne sont pas touchés).
  - **`/edition` et `/depot`** gardent `no-referrer` : leurs layouts le posent par la balise
    meta (`metadata.referrer`), l'en-tête le redit par une règle posée APRÈS la générale (Next
    garde la dernière).
  - **Une exception à l'encadrement** : l'aperçu du mail « Votre espace est prêt »
    (`/api/admin/collectif/editions/<id>/mail-espace`), montré en iframe par `FinCreation.tsx`,
    s'encadre par le site seul (`SAMEORIGIN`, `frame-ancestors 'self'`).
  - **`/_vercel/` hors de la règle** : les scripts de la mesure d'audience, inertes tant que Web
    Analytics n'est pas activé, répondent 404 en `text/plain` ; avec `nosniff`, Chrome ajoutait
    « Refused to execute script… » sur chaque page (vu au premier relevé, disparu au second).
  - **CSP complète en `Content-Security-Policy-Report-Only`**, rien de bloqué : scripts et
    styles du site + en ligne (Next n'a pas de nonce), `'wasm-unsafe-eval'` (libheif), images du
    site / `data:` / `blob:` / coffre R2 / photo Google du compte, connexions du site + R2,
    cadres du site + `https:` (le « PDF feuilletable » de `/numero` est une adresse quelconque
    collée par l'atelier), workers du site, `object-src 'none'`, `base-uri` et `form-action`
    `'self'`. Stripe Checkout est une navigation, Canva et Meet des liens, Brevo et Geoapify du
    serveur : aucun n'y figure. En `next dev` seulement : `'unsafe-eval'` et la socket.
- Vérifié sur le build servi en local (3016, `COLLECTIF_OUVERT=1`, mails coupés) :
  - `curl -D -` : les en-têtes sur `/`, `/magazine`, `/composer`, `/admin/login`, `/admin/atelier`
    (307), `/edition/retrouver` et `/depot/<token>` (`no-referrer`), l'aperçu du mail
    (`SAMEORIGIN`), `/pdfjs/*.mjs` et `/heic/*.js` (servis en `application/javascript`, donc
    compatibles `nosniff`), `/images/*` (cache d'un jour conservé) ; rien sur `/_vercel/*`.
  - Chrome headless (pilote CDP, sonde `securitypolicyviolation`) sur 14 écrans : accueil,
    `/magazine`, `/composer`, `/cgv`, `/livraison`, `/compte/connexion`, `/numero/<token inconnu>`,
    `/edition/retrouver`, `/edition` et `/depot` inconnus, `/admin/login`, l'atelier de démo
    (liste et fiche, cookie forgé localement), `/admin/collectif` : **aucune violation de la
    CSP, aucune erreur nouvelle** (restent les 404 de `/_vercel/*` et les avertissements de
    préchargement, qui viennent du code et existaient avant).
  - Le PUT au coffre à l'adresse exacte que `signerPut` produit (sous-domaine du bucket) : permis,
    pré-vol et PUT interceptés et répondus localement (rien n'est sorti) ; témoin vers
    `example.com` : violation `connect-src` bien relevée (la sonde voit).
  - `location.href` vers `checkout.stripe.com` (le geste de `CasesEtCommande.tsx`) : la page
    arrive, aucune violation (réponse simulée, rien n'est sorti).
  - Encadrement : depuis le site, l'aperçu du mail s'affiche et `contentDocument` se lit ;
    `/cgv` et l'atelier sont refusés. Depuis une autre origine (127.0.0.1), tout est refusé,
    aperçu compris.
  - Le worker HEIC de `/depot` sous la politique : libheif se charge (WebAssembly), aucune
    violation ; pdf.js 6 et son worker : aucune violation (essai A/B de T-162).
- Harnais (`verif-atelier.ts`, « les en-têtes de protection ») : `next.config.ts` relu tel quel,
  chaque adresse passée au comparateur du routeur de Next (`getPathMatch` + `modifyRouteRegex`),
  en production ET en développement. Prouvé en réintroduisant cinq fautes, chacune son KO :
  règle générale sans l'exclusion de `/_vercel/`, exception de `/edition` posée avant la
  générale, aperçu du mail sans son exception, une seconde iframe vers le site, worker pdf.js
  qui n'est plus la copie du paquet.
- Reste, et c'est pourquoi le ticket reste ouvert :
  1. vérifier sur un déploiement Vercel (preview puis production) que les en-têtes arrivent, et
     ce que la plateforme fait de `/_vercel/*` (non vérifiable en local) ;
  2. relire la console de production quelques jours (personne ne collecte les rapports : aucun
     `report-uri`, une route de collecte serait une surface publique de plus, à décider) ;
  3. puis APPLIQUER la CSP (renommer l'en-tête), en resserrant le coffre au seul bucket et en
     tranchant `frame-src https:` (le PDF feuilletable) ;
  4. non vérifié en local : `/numero` d'un vrai dossier (images R2 signées, PDF feuilletable),
     `/compte` connecté (photo Google), `/edition` et `/depot` sur un vrai lien, le moteur
     d'envoi réel de `/composer` (seule l'adresse du PUT a été éprouvée). La CSP étant en rapport
     seul, rien de cela ne peut casser : au pire une ligne de console.
