# Archive — la prévente (`/preventes` et `/preventes/prix`)

Retirées de la ligne le **28/08/2026**, sur décision de Mathias : « /preventes
c'est du passé, on ne l'utilisera plus. »

Les deux URL répondent une **redirection 307 vers `/`** (`next.config.ts`).
Temporaire, et pas par hésitation : une 308 se grave dans le cache des
navigateurs pour des mois, et ne se retire pas du navigateur de quelqu'un
d'autre. Ces trois lignes-là se retirent en dix secondes.

Pourquoi une redirection et pas un 410 : les mails déjà partis (W6, P1, P2)
pointent sur `/preventes`, et 14 fondateurs peuvent rouvrir un vieux message
n'importe quand. C'est l'argument que `src/lib/prevente.ts` oppose depuis le
début au 404 — « une lectrice perdue pour rien ».

## ⚠️ Ce qui n'est PAS parti avec elles

La prévente ne s'est jamais gardée pour elle seule. Trois choses vivaient ici
et servaient ailleurs ; elles ont été SORTIES avant l'archivage, sans quoi
`/ambassadeurs` et `/merci` seraient tombées avec :

| Ce qui était ici | Où c'est maintenant | Qui s'en sert |
|---|---|---|
| `pricing.ts` | `src/lib/pricing.ts` | le calculateur ambassadeur (`composeAlbums`) |
| `navbar.css` | `src/app/components/navbar.css` | `AmbassadeurNav` et la barre de `/merci` |
| `Navbar.tsx` | réécrit en `src/app/merci/Navbar.tsx` | `/merci` |

La barre de `/merci` a été **réécrite, pas recopiée**. Celle d'ici observe `#s1`
pour devenir solide et fait défiler vers `#s4` : ni l'un ni l'autre n'existe sur
`/merci`, l'observateur ne s'armait jamais et le bouton menait à rien. La
nouvelle est solide d'emblée, avec une seule sortie vers l'Atelier.

`prix/_ref.ts` (préservation du `?ref` entre les pages de prévente) est resté
ici : son dernier lecteur extérieur était le logo de `AmbassadeurNav`, qui
pointe désormais `/` tout court — un code de parrainage de prévente n'a rien à
dire à l'Atelier.

## ⚠️ Ne pas en conclure qu'on peut effacer la prévente du produit

Quatorze fondateurs ont des droits ouverts, et les CGV v3.0 les maintiennent en
régime transitoire (art. 5.0, art. 5 bis). **Rien de ce qui les sert n'est
touché** : `/api/webhook` (les remboursements passent par là), `/api/checkout`,
`/merci`, `/inviter`, les pages légales, les crédits de parrainage,
`src/lib/prevente.ts`, `src/lib/founder.ts`, `src/lib/pricing.ts`.

Ce qui est archivé, ce sont les **pages de vente**. Pas le contrat.

## Comment les faire revenir

Retirer les deux entrées `/preventes` de `next.config.ts`, puis :

    git mv archive/preventes src/app/preventes

Et défaire les trois déménagements du tableau ci-dessus, ou plus simplement
laisser les imports pointer vers leurs nouvelles adresses — ils sont déjà écrits
en alias (`@/lib/pricing`, `@/app/components/navbar.css`), donc valides depuis
`src/app/preventes/` comme depuis ici. Rien à retoucher.

Et attendre du travail : ces fichiers n'ont pas suivi les règles React
d'aujourd'hui (ils sont hors périmètre ESLint depuis leur arrivée ici).
