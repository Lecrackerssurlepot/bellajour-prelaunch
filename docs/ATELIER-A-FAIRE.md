# L'Atelier — ce qui reste à faire

Écrit le 25/08/2026, à la clôture de la séance de recette. Ce document est le
point de reprise : il suppose qu'on ne se souvient de rien.

---

## Où on en est

Le lot 7 du PRD est **en production** (merge `bf40c9d` puis correctifs).
`/admin/atelier` remplace l'UPDATE SQL, les neuf mails du PRD §10 existent,
la relève quotidienne est déclarée et armée.

**La base de l'atelier a été vidée le 25/08** à la demande de Mathias : tous
les dossiers étaient des tests. `numeros`, `photos`, `evenements`,
`mails_envoyes`, `notes`, `dossiers_vus` sont à zéro. La prévente est intacte
(48 inscrits, 21 crédits, 16 factures) et n'a jamais été touchée.

**Conséquence** : les métriques repartent de zéro, et **734 photos sont
orphelines dans le coffre R2** — plus aucune ligne ne les référence. À purger
à froid.

---

## Retours de la séance de recette du 25/08

Mathias a parcouru le questionnaire et le dépôt (« Test 1 », 41 photos).
Ses observations, avec ce qui a été fait ou reste à faire.

### ✅ Corrigé pendant la séance

**Un seul numéro par appareil, à vie.** Rouvrir `/composer` affichait le
questionnaire prérempli d'un numéro terminé, sans moyen d'en commencer un
autre. Le brouillon localStorage n'était jamais effacé (`clearDraft()` existait
et n'était appelé nulle part) et `creerNumero` refuse de créer si un token est
présent. **C'était la boucle de retour du produit qui était coupée** : le modèle
est « un numéro par moment » et le mail M8 dit « composer un nouveau numéro ».
Corrigé par un drapeau `termine` sur le brouillon (commit `8f30d32`).
⚠️ **Non rétroactif** : un navigateur portant un vieux brouillon reste bloqué
tant qu'il n'est pas vidé. Sans objet aujourd'hui (base vide), à garder en tête
si une vraie cliente le signale.

**Le journal racontait onze fois le même envoi.** `photos_confirmees` est écrit
à chaque LOT : 41 photos produisaient onze lignes identiques, sans traduction.
Retirées de l'affichage (fiche et fil d'activité), conservées en table pour le
débogage.

**La grille de photos** se replie à douze vignettes.

### ⚠️ À faire — par ordre d'importance

**1. Télécharger réellement les photos.** *Le plus bloquant pour l'éditeur.*
« Télécharger le lot » ne produit qu'un fichier texte de liens signés, et
« Copier les liens » ne sert que si on colle dans un terminal. Le raisonnement
d'origine (ne pas faire passer 200 Mo par une fonction Vercel) était bon, le
résultat est inutilisable.
→ **Solution retenue** : `showDirectoryPicker()` de Chrome. L'éditeur choisit
un dossier sur son Mac, les photos s'y écrivent directement, sans serveur et
sans limite de mémoire. Repli sur le `.txt` actuel pour les autres navigateurs.

**2. Les notes doivent voyager avec les photos.** Elles ne sortent aujourd'hui
nulle part : il faut ouvrir la fiche pour les lire. Pour servir à celui qui
compose dans Canva, elles doivent accompagner le lot téléchargé — un
`notes.txt` dans le dossier, ou un récapitulatif imprimable reprenant occasion,
histoire, titre et notes. **Sujet ouvert, à trancher en réunion.**

**3. La case « montrer des extraits » est mal placée.** Sur l'écran 6, qui
ressemble à une validation, elle a l'air obligatoire. Elle est purement
facultative et sans effet sur la commande (`consent_communication`, PRD §14).
→ Soit un libellé qui dise franchement « ça ne change rien à votre commande »,
soit la déplacer.

**4. Le crédit fondateur est entièrement manuel.** L'admin affiche « 30 € à
imputer » (CGV art. 5 bis) mais il faut créer un code Stripe nominatif à usage
unique et l'envoyer à la main. Tenable à deux fondateurs, pas au-delà.

**5. Les mails tombent dans l'onglet Promotions de Gmail.** Un M3 en Promotions
est une vente perdue. Chantier à part : DNS, contenu, réputation.
Cf. [[dns-et-delivrabilite]] en mémoire.

**6. Rappeler à la cliente de garder son lien.** Sa page suit l'état et le lien
est permanent, mais rien ne le lui dit. À intégrer à la relecture des mails.

---

## Points ouverts hors recette

**Purger les 734 photos orphelines de R2.** À faire à froid, jamais pendant une
séance de test.

**La page Santé crie sur une base vide.** Elle signale « aucun mail parti depuis
longtemps » quand il n'y a plus aucun dossier. Le constat devrait se taire s'il
n'y a rien à envoyer, pas seulement si rien n'a été envoyé.

**Retirer `ADMIN_PASSWORD` de Vercel** une fois que Louis s'est connecté avec
son compte nominatif. Le bouton « Atelier » disparaîtra seul de l'écran de
connexion.

**Cinq mails jamais envoyés en vrai.** M5 et M6 sont prouvés de bout en bout,
M2 l'a été involontairement. Restent M3b, M7, M8, M9 et l'auto-validation à
J+7 — cette dernière ne peut se tester que sur un dossier en état 4.

**Les CGV v3.0 n'ont pas été relues par un juriste.** Elles encadrent de vrais
encaissements. Le portugais fait foi.

**Cloudprinter** : phase 2 du PRD, pas commencé. La place du bouton est réservée
dans la machine à états (`envoyer_impression`).

**Deux lints pré-existants**, hors périmètre du lot 7 :
`src/app/admin/page.tsx:145` (`Date.now()` pendant le rendu) et
`src/app/api/waitlist/route.ts:181` (`randomCode` inutilisé).

---

## Pour reprendre

**Tester** : sur la preview, jamais en production pour l'étape paiement —
Stripe y est en mode réel.

```
https://bellajour-prelaunch-git-cha-a10ca9-lecrackerssurlepots-projects.vercel.app
```

Carte de test : `4242 4242 4242 4242`. La feuille de route complète du parcours
est dans [`RECETTE-PARCOURS.md`](./RECETTE-PARCOURS.md).

**Les commandes utiles** :

```bash
node scripts/recette.mjs etat                     # l'état de tous les dossiers
node scripts/recette.mjs pousser "Test 1" M3b     # force un mail à retardement
node scripts/recette.mjs relever                  # déclenche la relève
node scripts/recette.mjs nettoyer --depuis=2026-08-26

npx tsx --tsconfig tsconfig.json scripts/verif-atelier.ts       # 47 assertions
npx tsx --tsconfig tsconfig.json scripts/verif-mails-brevo.ts   # variables des templates

node scripts/mails-atelier.mjs                    # aperçus HTML des 7 mails
node scripts/mails-atelier.mjs --pousser          # met à jour les templates Brevo
```

**Le texte des mails** vit dans `scripts/mails-atelier.mjs`, pas dans Brevo :
une phrase corrigée apparaît dans un diff et se repousse en une commande.

**Trois pièges déjà rencontrés, à ne pas re-découvrir** :

- un texte JSX coupé par une expression (`arrivé{x} aujourd'hui`) perd son
  espace au passage à la ligne — construire la chaîne d'un bloc ;
- une entité HTML (`&rsquo;`) se décode dans le corps d'un mail et **jamais**
  dans l'objet, qui est du texte brut ;
- les valeurs de `.env.local` peuvent être entre guillemets : `dotenv` les
  retire, un lecteur maison non.
