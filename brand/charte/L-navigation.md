# L. Navigation et liens

## Carte des appels à l'action

| Libellé | Destination | Où |
|---|---|---|
| Composer mon numéro | `/composer` (« Reprendre » s'il y a un brouillon) | En-tête, ouverture, fin de chaque page |
| Voir un numéro | `/magazine` | Ouverture |
| Choisir mes photos | Sélecteur de fichiers, sans changer de page | Essai photos |
| Écrire mon titre | Le titre de la couverture (une feuille sur téléphone) | Essai photos |
| Mes numéros | `/compte` (connexion si pas de session) | En-tête |
| Offrir | `/offrir` (existe sur `main`, avec `/offrir/merci` et `/carte/<token>`) | Navigation |
| Groupes | page du banc. Sur `main`, la page B2B s'appelle `/partenaires` : URL à trancher en phase 4 | Navigation |
| Liens légaux | `/cgv`, `/confidentialite`, `/mentions-legales`, `/livraison`, `/remboursement` | Pied |
| Contact | `mailto:` | Pied |
| Instagram, TikTok | `instagram.com/bellajour__`, `@bellajourmagazine` | Pied |

La carte complète, vérifiée lien par lien, est produite en phase 5 dans `brand/reports/phase5.md`.

## Règles

- **Lien interne** : même onglet.
- **Lien externe** (réseaux, partenaires) : nouvel onglet, `rel="noopener"`. Une flèche ↗ dans le texte signale qu'on quitte le site.
- **Libellé** : un lien dit où il mène. Jamais « cliquez ici ».
- **Le lien du numéro** (`/numero/<token>`) reste toujours valable seul. Le compte ne le remplace jamais.
- **Un lien envoyé à un client** vise toujours `bellajour.fr`, jamais une préversion.

## 404

Voir le gabarit K. Elle propose l'accueil et `/composer`.

## Redirections

**Déjà en place** dans `next.config.ts` :
- `/atelier` → `/` et `/atelier/composer` → `/composer` ;
- `/preventes`, `/preventes/prix` et `/lancement` → `/` ;
- `/espace` → `/edition/retrouver` ;
- `?lang=en|pt` → `/en|pt/…`.

**En phase 4** : toute URL qui disparaît reçoit une redirection 301 vers sa remplaçante, et la
liste s'ajoute ici.
