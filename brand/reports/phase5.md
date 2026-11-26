# Phase 5 · le site parcouru comme un client (26/11/2026)

Branche `refonte-charte-v2`, build local `next start` (port 3970) avec les interrupteurs carte cadeau et Édition collective OUVERTS, plus la préversion Vercel de e46d0d06. Script : `brand/scripts/phase5/verifier.mjs` (Playwright). Aucune écriture : tout POST vers `/api` est répondu à vide par le script (sauf la lecture des créneaux de /partenaires), Stripe, Brevo et Vercel Insights coupés, jetons factices (`aaaa…`), jamais Audencia.

Résultats bruts : `brand/reports/phase5/passe1/`, `passe2/` (+ préversion Vercel), et la passe 3 à la racine de `brand/reports/phase5/` ; Lighthouse `lh-*.json`. Captures (hors git, 9 Mo) : `brand/reports/phase5/captures/`.

## Chiffres (passe 3, après corrections)

| Catégorie | Résultat |
|---|---|
| Liens | 32 pages atteintes (sitemap + liens + routes du plan), 0 lien cassé, 0 réponse 5xx |
| Redirections | 8/8 conformes (308 légal `?lang=`, 308 `/atelier`, 307 prévente, `/espace`) |
| Écrans | 8 pages × 6 largeurs (375 à 1920) × 3 moteurs = 144 rendus : 0 débordement horizontal, 0 image cassée, 0 erreur JavaScript |
| axe (wcag 2.1 AA, sérieux + critiques) | 25 routes × 2 largeurs : restent 3 constats, tous expliqués ci-dessous |
| Lighthouse mobile | `/` perf 75 · acc 96 · BP 96 · SEO 100 ; `/magazine` 100 · 96 · 96 · 100 ; `/composer` 85 · 98 · 96 · 66 (noindex voulu) |
| Réseau lent (3G 1,6 Mb/s, 150 ms, CPU ×4, 390 px) | `/` : 1er rendu 1,5 s, plus grand rendu 7,0 s, 1,28 Mo ; `/magazine` : 1,2 s, 1,2 s, 0,78 Mo |
| Motion | 0 erreur GSAP en défilant ; `prefers-reduced-motion` : 0 animation, aucun titre laissé invisible |
| Cache | polices et `_next/static` : 1 an immuable ; images `/images` : 1 jour + 30 j stale (règle voulue, mémoire cache 404) ; HTML `s-maxage=60` |
| Préversion Vercel (e46d0d06) | 32 pages, 0 5xx, redirections 8/8 ; `/` 1er rendu 1,0 s, plus grand rendu 7,4 s |

## Anomalies

| # | Gravité | Constat | Preuve | Suite |
|---|---|---|---|---|
| 1 | Bloquante | Porte de l'Édition collective (`/edition/…`, `/edition/retrouver`, `/depot/…`) : texte noir sur fond noir (1,06:1) depuis le remap `--c-*` → encre | axe color-contrast | **Corrigé** f0cb7ca4 (bloc nuit de la charte) |
| 2 | Importante | `/partenaires` : erreur JavaScript si la réponse des créneaux n'a pas de `jours` (3 moteurs) | pageerror `e.jours.find` | **Corrigé** 9ea45e1f |
| 3 | Importante | Étapes de `/composer` à 2,3:1 | axe | **Corrigé** 7d2df5ea (CSS seul, harnais atelier vert) |
| 4 | Importante | Mention du pied à 3,1:1 | axe | **Corrigé** e37785c9 |
| 5 | Importante | Accueil : 5 couvertures de la frise préchargées avant la couverture du livre | ressources : 1,58 → 1,28 Mo | **Corrigé** 7ddcf6ce ; perf Lighthouse 62 → 75 |
| 6 | Mineure | Tableau légal défilable non atteignable au clavier | axe scrollable-region-focusable | **Corrigé** 5674db59 |
| 7 | Mineure | Accueil sans repère `main` | Lighthouse | **Corrigé** c591682f |
| 8 | Mineure | Lien non souligné dans la porte | axe link-in-text-block | **Corrigé** 37c9f484 |
| 9 | Importante | Accueil sur 3G : plus grand rendu à 7 s (Lighthouse 7,5 s), TBT GSAP 60 ms après correction | lh-accueil.json | **Reste.** Le plus grand rendu est la double page (fond CSS de 1000 px). Il faut des tailles d'image par écran (`srcset`) pour chaque emplacement de `media.ts` : changement de structure de la librairie, à faire avec les vrais visuels |
| 10 | Importante | `/ambassadeurs/charte` et `/ambassadeurs/espace` sont encore dans l'ANCIENNE charte (crème, ancien pied `sections/Footer`) | axe .footer-tagline 2,2:1 | **Reste.** Page du programme ambassadeur de la prévente : à rhabiller ou à archiver, décision Mathias (phase 7 sinon) |
| 11 | Mineure | Interrupteur carte cadeau fermé (préversion Vercel) : Nav, pied, accueil et magazine gardent 4 liens vers `/offrir` qui rend 404 | préversion : `/offrir` 404 depuis `/` et `/magazine` | Existait déjà sur main (lien Nav inconditionnel). En production l'interrupteur est ouvert (Noël) ; à cacher si on le referme |
| 12 | Faux positif | `/magazine` `.gestes` : textes en cours d'apparition (`.rv`) mesurés à mi-fondu | axe avant défilement | Lisible une fois apparu (captures) |
| 13 | Faux positif | Mot géant décoratif du pied (`aria-hidden`) | axe | Filigrane voulu (fiche B) |
| 14 | Mineure | WebKit signale la CSP « rapport seul » sans `report-to` | console WebKit, toutes pages | Connu et documenté dans next.config.ts ; à trancher avec la CSP appliquée |
| 15 | Mineure | `/composer` SEO 66 | Lighthouse is-crawlable | Voulu (`noindex` du tunnel) |

## Pas testé

- Paiement Stripe réel, `/merci` après paiement, `/numero` d'un vrai dossier, `/compte` connecté, dépôt de photos réel, envoi d'un rendez-vous /partenaires : interdits en écriture (base et Stripe de production).
- Édition collective avec un vrai jeton (seul l'état « inconnu »).
- Lighthouse sur la préversion Vercel : la préversion est protégée, Lighthouse n'a pas le cookie de partage ; liens, cache et réseau lent y ont été passés.
- Test sur iPhone réel : **à Mathias** (WebKit Playwright n'est pas Safari iOS).
