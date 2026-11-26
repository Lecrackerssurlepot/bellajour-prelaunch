# Archive : l'espace et la charte ambassadeur (`/ambassadeurs/**`)

Archivé le **26/11/2026**, sur demande de Mathias (retour sur la préversion de la charte V2) :
« / ambassadeur, tu peux désactiver cette page pour l'instant. […] Si on garde ambassadeur, on le
mettra avec la charte graphique actuelle. »

## Ce qui est ici

Tout ce qui restait sous `src/app/ambassadeurs/`, en l'état, ancienne charte comprise :

| Fichier | Rôle |
|---|---|
| `route.ts` | `GET /ambassadeurs` : la page « programme clos » en 410 (depuis le 08/09, T-067) |
| `layout.tsx`, `AmbassadeurNav.tsx` | l'enveloppe et la barre des pages ambassadeur |
| `espace/` (`page.tsx`, `Espace.tsx`, `espace.css`) | l'espace d'un ambassadeur existant (lien signé `?token=`) |
| `charte/` (`page.tsx`, `charte.css`) | la charte du Cercle Ambassadeur |

La page de vente, archivée plus tôt, est un niveau au-dessus (`../README.md`).

## Ce qui remplace la route

`src/app/ambassadeurs/[[...chemin]]/route.ts` redirige `/ambassadeurs` et tout ce qui est
dessous vers `/` en **307** (temporaire), sans recopier la requête (le `?token=` signé ne suit pas). Pas de 404 : les mails déjà partis, et ceux que le code envoie encore, pointent
vers `/ambassadeurs/espace?token=…` ; une redirection ne laisse personne dans une impasse, et
« pour l'instant » se dit 307, que ni Google ni un navigateur ne fige.

## ⚠️ Ce qui pointe encore ici (non modifié : routes d'API et mails)

- `src/app/api/webhook/route.ts` (DASHBOARD_URL des mails de parrainage, P3 et crédits) ;
- `src/app/api/ambassadeur/confirmer/route.ts` et `request-access/route.ts` (lien d'accès à
  l'espace).

Ces mails continuent de partir avec un lien qui mène désormais à l'accueil. Les crédits de
parrainage eux-mêmes ne bougent pas (ils vivent en base et au paiement), seul leur tableau de
bord n'est plus visible.

## Pour remettre en ligne

`git mv archive/ambassadeurs/espace-2026-11/* src/app/ambassadeurs/`, retirer
`src/app/ambassadeurs/[[...chemin]]/route.ts`, et porter les deux CSS dans la charte V2.
