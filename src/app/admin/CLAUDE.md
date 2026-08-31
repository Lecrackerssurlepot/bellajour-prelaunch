# Back-office — /admin

Deux dashboards distincts sous le même mot. Chargé dès qu'on touche l'admin.

- **`/admin`** — prévente, lecture seule (inscrits, crédits, KPI, export CSV).
  Seule écriture tolérée : `admin_last_seen`.
- **`/admin/atelier`** — la table de travail, et elle **écrit, envoie des mails et lance des
  impressions**. C'est un outil de production, pas un tableau de bord.

## Auth

Comptes **nominatifs** : `ADMIN_PASSWORD_MATHIAS`, `ADMIN_PASSWORD_LOUIS`. L'ancien
`ADMIN_PASSWORD` partagé **n'est plus lu** depuis le 31/08/2026 (T-005) ; `PRENOM_COMPTE` garde
la clé `atelier` uniquement pour afficher les vieilles lignes du journal. Cookie HMAC `bj_admin`,
comparaison `timingSafeEqual`, et un frein sur `/api/admin/login` (délai croissant par échec,
T-046 — honnête : `Map` par instance, pas une protection forte). Le nom du compte est
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
- **Le tag rouge « ne reçoit pas »** est le seul marqueur qui dise qu'un dossier d'apparence
  normale est INJOIGNABLE (journal `email_rebond`, posé par le webhook Brevo). Lu dans la MÊME
  requête que les remboursements, sans colonne ni migration. La fiche en fait un bandeau qui
  rappelle le téléphone ; la page santé le remonte en ROUGE **sans borne de date** — un rebond ne
  se périme pas au bout d'une semaine, contrairement aux mails en échec.

## Écrans

`page.tsx` (liste triée par urgence) · `[token]/page.tsx` (fiche + frise des 8 jalons + actions
armées en deux temps + carnet de l'éditeur) · `metriques/` · `sante/` (**le seul endroit qui
montre un mail sans template**) · `demo/` (fixtures, sans base).
