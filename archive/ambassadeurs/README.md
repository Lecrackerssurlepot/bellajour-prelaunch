# Archive — la page de vente du Cercle Ambassadeur (`/ambassadeurs`)

Archivée le **08/09/2026** (T-067), sur décision explicite de Mathias : « archiver la page
entièrement — pas de formulaire fermé, pas de réécriture : la page de vente du programme
ambassadeur sort du site. »

Le Cercle Ambassadeur, Vague 1, est **clos depuis le 01/09/2026**. La page continuait pourtant à
vendre (« Parrainez vos proches, gagnez des pages et des albums offerts »), indexable, avec sa
section d'inscription active. Pire : `POST /api/ambassadeur/register` ajoutait chaque nouvelle
inscription à la liste Brevo `#3`, dont l'automation « Waitlist - Séquence W2 W3 » est ACTIVE et
envoyait deux mails de prévente (J+2, J+4) pour une offre qu'on n'honore plus (T-104).

## Ce qui a été archivé ici

La page de vente et ses composants propres, `src/app/ambassadeurs/` → ici (même niveau) :

| Fichier | Rôle |
|---|---|
| `page.tsx` | la route `/ambassadeurs` — Nav → Hero → Calculateur → Onglets → Engagement → Inscription → Footer |
| `Hero.tsx`, `hero.css` | premier écran, embarque `LiteYouTube` |
| `LiteYouTube.tsx`, `lite-youtube.css` | lecteur YouTube différé, consommé uniquement par `Hero.tsx` |
| `Calculateur.tsx`, `calculateur.css` | simulateur de pages/albums, s'appuyait sur `src/lib/pricing.ts` (`composeAlbums`) |
| `Onglets.tsx`, `onglets.css` | explication de la mécanique en onglets |
| `Engagement.tsx`, `engagement.css` | bloc de réassurance/engagement |
| `Inscription.tsx`, `inscription.css` | le formulaire — soumettait à `POST /api/ambassadeur/register` |

Et, dans un sous-dossier séparé parce qu'il vivait ailleurs dans l'arbre (`src/app/api/`) :

| Fichier | Rôle |
|---|---|
| `api-register-route/route.ts` | l'ancien `src/app/api/ambassadeur/register/route.ts` — upsert `waitlist`, envoi des mails A1/A2, génération des liens magiques |

## ⚠️ Ce qui n'est PAS parti avec elle — quatorze fondateurs ont des droits ouverts

`src/app/ambassadeurs/` contenait aussi `espace/` et `charte/`. Vérifié dans le code, pas supposé,
avant de toucher quoi que ce soit :

- **`espace/` (le tableau de bord) RESTE.** Ce n'est pas une annexe marketing : c'est la
  destination `DASHBOARD_URL` que `src/app/api/webhook/route.ts` (lignes 155 et 328) écrit dans
  les mails **P3** et **A3**, envoyés à de vraies ambassadrices quand un filleul confirme sa
  commande ou franchit un palier. Le footer partagé (`src/app/sections/Footer.tsx`, servi sur
  `/ambassadeurs`, `/merci` et — jusqu'à cet archivage — `/ambassadeurs`) porte encore le lien
  « Espace ambassadeur » vers `/ambassadeurs/espace`. Couper cette route aurait cassé l'accès de
  gens qui ont déjà parrainé.
- **`charte/` (le texte juridique signé) RESTE aussi.** C'est le document que chaque ambassadeur a
  accepté à l'inscription (« l'acceptation… vaut signature », §13), et son calendrier (§7) est
  **encore en cours** : crédit des pages le 15/08/2026, fenêtre pour composer jusqu'au
  **31/12/2026**. Ce n'est pas une brochure commerciale annexe, c'est la preuve d'engagement des
  quatorze fondateurs — elle doit rester consultable tant que la fenêtre n'est pas fermée.
  Ses deux liens de retour, qui pointaient vers `/ambassadeurs` et `/ambassadeurs#inscription`
  (aujourd'hui 410), ont été repointés vers `/ambassadeurs/espace`.
- **`AmbassadeurNav.tsx` et `layout.tsx` RESTENT** : `espace/page.tsx` importe toujours
  `AmbassadeurNav` (variant `"espace"`), et `layout.tsx` pose la police Cormorant crème pour
  `espace/` et `charte/`. Le `variant="page"` d'`AmbassadeurNav` (celui que `page.tsx` seul
  utilisait) n'a plus d'appelant — laissé tel quel, code mort inoffensif plutôt que retouché
  hors du périmètre de ce ticket.

## Ce que devient la route

`/ambassadeurs` répond désormais **410 Gone** via `src/app/ambassadeurs/route.ts` (Route Handler,
pas `page.tsx` : une page ne choisit pas son code de statut dans l'App Router). 410 et non 404,
parce que le contenu a existé et que son retrait est volontaire — c'est le signal que Google doit
recevoir pour désindexer.

`POST /api/ambassadeur/register` répond aussi **410 Gone**, inconditionnellement, via
`src/app/api/ambassadeur/register/route.ts` : plus jamais d'écriture en base, plus jamais d'ajout
à une liste Brevo. Contrairement à `preventeFermee()` (un drapeau qu'on rebascule), c'est une
fermeture en dur — le programme est clos, pas suspendu.

Les trois routes voisines ne bougent pas : `/api/ambassadeur/me`, `/confirmer` et
`/request-access` servent `espace/` et restent vivantes.

## `src/lib/pricing.ts` — non déplacé, à trancher séparément

Son seul importeur vivant était `Calculateur.tsx`, archivé ici. Après cet archivage, ce fichier
n'a donc plus aucun consommateur dans `src/`. Il porte cependant la grille tarifaire sur laquelle
**les quatorze fondateurs ont contracté** — un historique, pas seulement du code mort. Hors du
périmètre explicite de ce ticket (T-067/T-104) : laissé en place, signalé pour une décision
ultérieure plutôt que déplacé sans mandat.

## Comment la faire revenir

Retirer `src/app/ambassadeurs/route.ts` et son 410, puis :

    git mv archive/ambassadeurs/page.tsx src/app/ambassadeurs/page.tsx
    git mv archive/ambassadeurs/Hero.tsx archive/ambassadeurs/hero.css src/app/ambassadeurs/
    git mv archive/ambassadeurs/LiteYouTube.tsx archive/ambassadeurs/lite-youtube.css src/app/ambassadeurs/
    git mv archive/ambassadeurs/Calculateur.tsx archive/ambassadeurs/calculateur.css src/app/ambassadeurs/
    git mv archive/ambassadeurs/Onglets.tsx archive/ambassadeurs/onglets.css src/app/ambassadeurs/
    git mv archive/ambassadeurs/Engagement.tsx archive/ambassadeurs/engagement.css src/app/ambassadeurs/
    git mv archive/ambassadeurs/Inscription.tsx archive/ambassadeurs/inscription.css src/app/ambassadeurs/
    git mv archive/ambassadeurs/api-register-route/route.ts src/app/api/ambassadeur/register/route.ts

Et remettre `src/app/api/ambassadeur/register/route.ts` (le 410) au rebut. Repointer les deux
liens de `charte/page.tsx` vers `/ambassadeurs#inscription` si l'inscription revient à cet endroit.
Rien d'autre à retoucher : `src/lib/pricing.ts`, `src/app/ambassadeurs/AmbassadeurNav.tsx` et
`layout.tsx` n'ont pas bougé.
