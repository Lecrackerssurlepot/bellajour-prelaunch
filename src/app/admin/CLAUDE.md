# Back-office — /admin

Deux dashboards distincts sous le même mot. Chargé dès qu'on touche l'admin.

- **`/admin`** — prévente, lecture seule (inscrits, crédits, KPI, export CSV).
  Seule écriture tolérée : `admin_last_seen`.
- **`/admin/atelier`** — la table de travail, et elle **écrit, envoie des mails et lance des
  impressions**. C'est un outil de production, pas un tableau de bord.

## Auth

Comptes **nominatifs** : `ADMIN_PASSWORD_MATHIAS`, `ADMIN_PASSWORD_LOUIS`. L'ancien
`ADMIN_PASSWORD` partagé est **encore accepté** sous le compte `atelier` — c'est une dette connue,
pas une intention. Cookie HMAC `bj_admin`, comparaison `timingSafeEqual`. Le nom du compte est
écrit dans `notes.qui`, `numeros.en_charge` et le journal : les gestes sont attribuables.

## Ce qui se casserait sans qu'on le voie

- **`donnees.ts → lireNumeros()` tente le select AVEC la colonne récente et retombe SANS sur une
  erreur 42703.** Sans ce repli, la table de travail entière tomberait pendant la fenêtre entre le
  déploiement et la migration. Idem `lirePhotos()` et `marquerArrivee()`. **Ne pas simplifier.**
- **`loading.tsx` sur la liste et la fiche** : sans eux, Next garde l'écran précédent figé et le
  clic paraît mort. Les silhouettes ont la FORME de l'écran qui arrive.
- **`Rafraichissement.tsx`** rafraîchit chaque minute, RIEN quand l'onglet est caché, rattrapage
  au retour. Jamais `location.reload()` : il perdrait la recherche et le formulaire en cours.
- **La fiche AVERTIT sans bloquer** sur un dépôt non terminé : un coup de téléphone peut justifier
  d'avancer, et une machine qui refuse sans pouvoir écouter finit contournée en SQL.
- **La loupe** (`components/Loupe.tsx`) sert la page cliente ET l'admin : elle pose ses propres
  couleurs sur `.bj-loupe`, sans emprunter aux tokens de l'un ou de l'autre. Le vocabulaire est le
  même des deux côtés (« La couverture », « La quatrième », « Une double page »).
  ⚠️ Elle navigue par LÉGENDE : deux légendes identiques rendent un visuel inatteignable.
- **La grille sert des vignettes** (`urlVignette ?? url`), mais le cadre, la loupe et le
  téléchargement gardent l'ORIGINAL. Les dossiers anciens et les HEIC n'ont pas de vignette.
- **« Télécharger le lot »** ouvre le sélecteur de dossier AVANT tout `await` : Chrome exige une
  activation utilisateur fraîche. Dépend du CORS du bucket R2 en GET.

## Écrans

`page.tsx` (liste triée par urgence) · `[token]/page.tsx` (fiche + frise des 8 jalons + actions
armées en deux temps + carnet de l'éditeur) · `metriques/` · `sante/` (**le seul endroit qui
montre un mail sans template**) · `demo/` (fixtures, sans base).
