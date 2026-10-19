---
id: T-164
titre: Les liens des mails d'une édition prennent leur adresse dans un en-tête de la requête, que l'appelant peut écrire
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
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
Rien encore.
