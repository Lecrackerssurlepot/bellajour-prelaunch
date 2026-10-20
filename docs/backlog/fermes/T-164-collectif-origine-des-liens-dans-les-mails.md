---
id: T-164
titre: Les liens des mails d'une édition prennent leur adresse dans un en-tête de la requête, que l'appelant peut écrire
etat: fermé
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
ferme: 2026-10-20
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- `src/lib/collectif/liens.ts:39` `origineDepuis(hote, proto)` ne contrôle que la FORME de
  l'hôte, pas qu'il s'agit de bellajour.fr. `/api/collectif/retrouver` (route publique) lui passe
  `x-forwarded-host` ou `host` de la requête, et les liens du mail « Retrouver mon espace » sont
  construits avec. Scénario : un tiers demande le lien d'un vrai responsable en écrivant
  `X-Forwarded-Host: domaine-pirate.example` ; si la plateforme laisse passer cet en-tête, le
  responsable reçoit un vrai mail de Bellajour dont le lien envoie son token au domaine pirate.
- Non vérifié : si Vercel et Cloudflare écrasent `x-forwarded-host` (je ne peux pas le prouver
  sans envoyer un vrai mail). Le code, lui, ne s'en protège pas.
- **Sans effet aujourd'hui** : `COLLECTIF_MAILS` est fermé en production, aucun mail ne part
  de cette route (`mailsCollectifEnService()`).

## Ce que je propose
L'origine des liens envoyés par mail vient d'une constante du site (`https://bellajour.fr`, ou
une variable d'environnement), jamais d'un en-tête. Les liens affichés à l'atelier peuvent garder
l'origine de la requête (utile en local). **À faire avant d'ouvrir `COLLECTIF_MAILS` (T-146).**

## Ce qui a été fait
Le 20/10, branche `fix/collectif-mails-origine-et-frein`. Revérifié avant d'y toucher : le
constat était vrai et plus large que la fiche. CINQ routes bâtissaient les liens de leurs mails
sur `x-forwarded-host` ou `host` :
- `/api/collectif/retrouver` (publique, sans token : le cas de la fiche) ;
- `/api/collectif/appareil` (le mail du code : « Demande faite depuis <hôte> ») ;
- `/api/collectif/rendez-vous` et `/api/admin/collectif/editions/[id]/rendez-vous` (le lien
  vers l'espace dans les mails de rendez-vous) ;
- `/api/admin/collectif/editions/[id]/mail-espace` (« Votre espace est prêt », aperçu compris).

Changé :
- `liens.ts` : `origineDesMails(env)`, pure. `NEXT_PUBLIC_SITE_URL` (posée sur Vercel, et
  `https://www.bellajour.fr` dans le `.env.local`), sinon `ORIGINE_SITE` =
  `https://www.bellajour.fr`, la même que le B2C. Une origine nue seulement : un chemin, un
  autre protocole ou http hors localhost retombent sur le site.
- Les cinq routes prennent `origineDesMails(process.env)`. Les pages qui AFFICHENT des liens
  (fiche, écran des liens, espace) gardent `origineDepuis` : en local, ils s'ouvrent sur localhost.
- Trouvé en route : `codeNeuf` décidait du code d'essai local (`COLLECTIF_CODE_ESSAI`) sur la
  même origine, `x-forwarded-host` compris. Il lit désormais l'en-tête `host` BRUT seul (Vercel
  n'achemine jamais un `host` localhost). `VERCEL_ENV` ne pouvait pas servir : le `.env.local`
  tiré de Vercel contient `VERCEL_ENV="production"` (vu le 20/10). La variable n'est pas sur
  Vercel aujourd'hui : c'était une porte, pas une fuite.
- Harnais (`verif-collectif.ts`) : la règle pure, les cinq routes, l'interdiction de
  `origineDepuis` et de `x-forwarded-host` dans toute route d'API, le code d'essai sur le host.
  Prouvé en réintroduisant la faille dans `retrouver` : trois KO, puis TOUT PASSE une fois remise.
- Règles écrites dans `src/lib/collectif/CLAUDE.md` et `src/app/api/CLAUDE.md`.

Non vérifié, et sans objet désormais : si Vercel ou Cloudflare écrasent `x-forwarded-host`.
Aucun mail n'a été envoyé pour le savoir.
