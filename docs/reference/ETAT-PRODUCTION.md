# État du système — au 04/09/2026

**Ce fichier est le SEUL endroit où va un fait périssable.** Un `CLAUDE.md` ne contient que des
règles qui survivent ; tout ce qui porte une date, un identifiant ou une mesure vient ici.
C'est ce qui a pourri l'ancien `CLAUDE.md` : 38 % de son contenu était de l'état, mélangé aux
règles, sans moyen de savoir ce qui avait expiré.

Règle d'entretien : quiconque change l'état du système met ce fichier à jour dans le même geste.
Un fait sans date ne vaut rien — chaque ligne porte la sienne.

---

## Ce qui tourne en production

| Brique | État | Depuis |
|---|---|---|
| Accueil (`/`) — couverture + sept pages du récit | en ligne | 28/08/2026 |
| Page produit (`/magazine`) | en ligne | 28/08/2026 |
| Questionnaire + dépôt (`/composer`) | en ligne, six champs exigés | 28/08/2026 |
| Page cliente (`/numero/<token>`) | en ligne | 21/08/2026 |
| Back-office (`/admin/atelier`) | en ligne | 25/08/2026 |
| Relève quotidienne des mails | armée, 7 h UTC | prouvée le 29/08/2026 à 07:20 |
| Cloudprinter | branché, **sandbox** (clés posées en Production le 01/09) | recette 26/08 ; **suivi vérifié sur la prod le 01/09** |
| Stripe | branché | prévente depuis juin, atelier depuis le 24/08 |
| Prévente (`/preventes`, `/lancement`) | retirées, 307 vers `/` | 28/08/2026 |
| Rebonds Brevo (`/api/brevo/webhook`) | **actif**, webhook Brevo id 2158565 | prouvé le 29/08/2026 à 10:14 |
| PDF souvenir + mail M7b à la livraison | en ligne, chaîne complète vérifiée | 03/09/2026 (PR #39) |
| Compte cliente (`/compte`) | **écrit et éprouvé en local, PAS déployé** — six gestes de mise en service en attente (voir plus bas) | 04/09/2026 |

Quatorze fondateurs ont des droits ouverts sous les CGV v2.5, maintenus en régime transitoire.

## Le compte cliente — écrit le 04/09, en attente de mise en service

Supabase Auth en « identité seulement » : Google **et** email + mot de passe, avec mot de passe
oublié. Le compte **s'ajoute** au lien `/numero/<token>`, il ne le remplace jamais — une cliente
qui n'en veut pas ne voit rien changer, et le token reste l'unique identité des routes
`/api/atelier/*`. `/compte` range ses numéros en **deux onglets** (« Mes numéros » · « Ma
bibliothèque »), et la barre du site gagne un coin compte — voir les retouches ci-dessous, qui
disent l'état final.

**Retouches du 04/09 (après-midi), demandées par Mathias en regardant l'écran :**
- `/compte` passe à **DEUX ONGLETS** (« Mes numéros » · « Ma bibliothèque ») au lieu de trois
  sections empilées : chaque onglet est un moment, et ils n'ont rien à voir.
- **La bibliothèque est une étagère de couvertures** (grille de vignettes au format A4, titre et
  année en haut, geste en bas) — la vraie couverture publiée par l'atelier, pas un aplat.
- **Nouvelle page `/compte/magazine/<token>`**, dans l'ordre voulu : on REGARDE le magazine,
  puis on lit sa fiche, puis on télécharge le PDF **en bas**. ⚠️ Elle passe par
  `lireDossiersDuCompte` : un token collé d'ailleurs rend 404, contrairement à `/numero/<token>`
  qui reste la porte publique du lien.
- **Sa visionneuse EST le composant `Apercu` de la page de suivi, pas une seconde** (2e retour de
  Mathias, 04/09) : flèches, glissé, loupe, et le support magazine validé (fermé pour les
  couvertures, ouvert avec pli pour les doubles). Sa scène a une hauteur FIXE, donc **passer
  d'une A4 à une double page ne fait plus sauter la page** — prouvé : couverture → quatrième →
  double, scène à 440 px et bas de visionneuse immobile à 678 px. La page resserre `--viz-h`
  sous `.cpt--mag` (55 unités au lieu de 64) pour que **les points de feuilletage tiennent dans
  l'écran sans scroller** : ils tombaient 33 px trop bas sur 1280 × 800 ; il reste 66 px de marge
  là, et 112 px sur un téléphone de 375 × 780. ⚠️ Le resserrage vit dans `compte.css`, jamais
  dans `numero.css` — la page de suivi n'a pas ce problème et n'a pas à payer pour lui.
- ⚠️ **Les flèches de la visionneuse sont désormais visibles AU DOIGT AUSSI** (3e retour de
  Mathias, 04/09). Elles étaient réservées au pointeur fin ; au doigt il ne restait que le
  glissé, un geste qui ne s'annonce pas. **Ce changement touche `/numero`, qui est EN
  PRODUCTION** — c'est voulu, les deux pages partagent le composant. Sur téléphone le bouton
  garde ses 44 × 44 (plancher tactile du dépôt) mais perd sa pastille de verre : le chevron
  seul, sur une ombre portée, parce que deux pastilles mangeraient un tiers d'un magazine large
  de 300 px sur un écran de 375. Vérifié sur les deux pages, sans débordement.
- **La barre ne devine plus** : un seul numéro en cours → « Suivre mon numéro » y mène ;
  plusieurs → « Mes numéros » ouvre le compte. Et **sur mobile la barre ne porte que le compte**.
- **Le jeton du compte montre la photo Google** (ou l'initiale) une fois connectée.
- **`/numero` a un vrai retour** « ← Mon compte » dans son en-tête quand on est connectée ; la
  ligne de service « ce numéro est rattaché » a disparu avec sa raison d'être.

**Ce qui est PROUVÉ en local, contre la base de production (04/09) :**
- connexion par mot de passe → cookie de session **`HttpOnly`** (aucun client Supabase dans le
  navigateur, la clé anon reste serveur), `/api/compte/statut` répond le numéro en cours ;
- réinitialisation complète : lien `generateLink(recovery)` → nouveau mot de passe → l'ancien est
  refusé (401), le nouveau passe (200), **aucun cookie de session laissé derrière**, et rejouer
  le même lien est refusé (400) ;
- réponses **indistinctes** sur inscription et mot de passe oublié (adresse inconnue ou déjà
  prise : 200 dans les deux cas) ;
- `/compte` déconnectée redirige vers `/compte/connexion?suite=%2Fcompte` ;
- `/numero/<token>` inchangée sans compte ; connectée, son en-tête porte le retour « ← Mon
  compte » et le logo reste centré au pixel (mesuré : 500 sur un viewport de 1000) ;
- les deux onglets, l'étagère de couvertures (vraies images R2 chargées, vérifié par
  `naturalWidth`) et la page magazine, sur 1000 px comme sur 375 px, sans débordement ;
- barre mobile à 375 px : signature + jeton du compte + CTA, le raccourci de suivi masqué ;
- téléchargement du PDF depuis la bibliothèque : `/api/atelier/souvenir?token=…` → **302** vers R2 ;
- `tsc`, `lint`, `build` verts ; harnais à **577 assertions** (28 neuves sur le compte : qui voit
  quoi, le classement des trois piles, les numéros en cours, et `?suite=` qui ne peut pas sortir
  du site), toutes vertes.

⚠️ **Les deux migrations ne sont PAS appliquées** (`20260904_compte_id`,
`20260905_waitlist_credit_consomme`) : le code tourne quand même grâce aux replis `42703`/
`PGRST204`, mais **le rattachement explicite ne s'écrit pas** — le rapprochement par
`email_canonical` fait tout le travail en attendant. C'est exactement le revers documenté dans
`supabase/CLAUDE.md` : après la migration, vérifier que `numeros.compte_id` se remplit vraiment.

**Les six gestes de mise en service, tous à faire par Mathias :**
1. Google Cloud → « ID client OAuth » (application web), URI de redirection autorisée
   `https://lxkivqbcegursmxshmoc.supabase.co/auth/v1/callback`.
2. Dashboard Supabase → Authentication → Providers → **Google** : coller l'ID et le secret.
3. Dashboard Supabase → Authentication → URL Configuration : Site URL `https://www.bellajour.fr`,
   et en Redirect URLs `https://www.bellajour.fr/compte/callback` + `http://localhost:3000/compte/callback`.
4. Vercel (Production **et** Preview) : `SUPABASE_ANON_KEY`, puis `BREVO_TEMPLATE_C1_ID` et
   `BREVO_TEMPLATE_C2_ID` une fois les templates poussés.
5. Appliquer les deux migrations.
6. Pousser les deux mails, **sur accord explicite** : `node scripts/mails-atelier.mjs --pousser
   --seulement C1` puis `--seulement C2` (jamais `--pousser` nu : il réécrit les quatorze).

Et, quand tout ci-dessus est en place, la pré-création silencieuse des comptes fondateurs :
`npx tsx --tsconfig tsconfig.json scripts/creer-comptes-fondateurs.ts` (dry-run) puis
`--vraiment`. **Aucun mail ne part** : chacun entre par « mot de passe oublié » ou par Google.

**Le crédit fondateur consommé devient visible** (même chantier) : le webhook écrit
`waitlist.credit_consomme_le` + `credit_code` au moment du paiement, en best-effort absolu, et la
fiche admin affiche « crédit consommé le … » à la place du bouton de frappe. ⚠️ `offer_type`
**ne bouge pas** : un fondateur dont le crédit est dépensé reste fondateur, pour la segmentation
des campagnes. La source de vérité reste le journal `evenements` ; ces colonnes sont un miroir.

✅ **Les deux comptes de test du 04/09 sont supprimés** (`mdurand085+test@gmail.com` après la
recette, `mdurand085+demo@gmail.com` après la relecture de Mathias). **`auth.users` est à ZÉRO
compte**, et aucun événement `compte_rattache` n'a jamais été écrit — la migration n'étant pas
passée, les replis 42703/PGRST204 ont joué à chaque fois. La base est exactement dans l'état
d'avant ce chantier.

## Recette de bout en bout de l'Atelier — 01/09/2026 (après-midi)

Tunnel complet éprouvé, du questionnaire à l'expédition, avec un dossier « Test premier
septembre » (mdurand085@gmail.com, fondatrice nº2). Fait en LOCAL (clés Stripe **test**,
`sk_test_`) contre la vraie base de prod, paiement réel dans le Checkout Stripe hosted.

Ce qui est prouvé :
- **Mails M0 → M7** partis à chaque transition (M0 création · M1 dépôt · M3 lien de paiement ·
  M4 paiement · M5 maquette · M6 validation · M7 expédition). La chaîne tient de bout en bout.
- **Crédit fondatrice automatique** : `FONDATRICE-MATHIAS30` frappé et appliqué d'office au
  checkout (−30 €), consommé au paiement. Palier p40 (32 pages) → **10 € réellement payés**.
- **Garde InvoiceXpress prouvée** (sur le code de la branche `fix/atelier-invoice-jobs`, en
  local) : un paiement `livemode=false` n'insère AUCUNE ligne `invoice_jobs` → aucune fatura.
  ⚠️ Rappel : cette chaîne compta atelier n'est PAS encore déployée en prod (commit dad0730
  branché uniquement, « NE PAS DEPLOYER avant immatriculation TVA »).
- **Facture Stripe** : `invoice_creation` finalise la facture mais Stripe NE LIVRE PAS le mail
  en mode test (normal, pas un bug) — le lien `hosted_invoice_url` est rangé dans
  `numeros.facture_url`. En live, le mail partira.
- **Cloudprinter sandbox** : commande passée (`orders/add`) + signaux de retour reçus
  (`CloudprinterOrderValidated`, `ItemValidated`, `ItemShipped`).

⚠️ **Trou trouvé ET RÉGLÉ le 01/09 : les clés Cloudprinter manquaient en PRODUCTION sur Vercel.**
`CLOUDPRINTER_API_KEY` et `CLOUDPRINTER_WEBHOOK_KEY` n'existaient QU'EN PREVIEW. Conséquences en
prod : webhook fermé (les logs runtime criaient « CLOUDPRINTER_WEBHOOK_KEY absente », donc aucun
suivi ni M7) ET « Envoyer à l'impression » en mode manuel (`cloudprinterConfigure().pret=false`,
pas de commande auto). Le CODE était bon depuis toujours (prouvé par rejeu). Fix appliqué :
les deux variables ajoutées en **Production** (valeurs **sandbox**) + redéploiement.
**Vérifié bout en bout sur la prod réelle** : un `ItemShipped` rejoué → dossier `expediee`,
transporteur « DPD », `tracking_url`/`tracking_code` remplis.

**Téléphone en E.164 (PR #22 mergée et déployée le 01/09, commit `6d7a946`)** : le numéro part
chez Cloudprinter au format international (`+33…`), normalisé avec le pays de livraison Stripe
(`telephoneE164` dans `impression.ts`). Avant, il partait en national (« 0680009071 »).

**Ménage admin** : les 4 dossiers de test de mdurand085 supprimés (sauvegarde JSON hors dépôt).
Restent en base : Marjorie, Flore, **Klervie** (« MADRID », fondatrice nº13, demande réelle
arrivée le 01/09) et le dossier de test « Test premier septembre » (état `expediee`, gardé).

## Fusionné le 01/09/2026 (PR #16) — et ce qui dort dedans

Quatre choses sont entrées dans `main` ce jour-là. **Trois sur quatre ne font encore RIEN**, et
c'est le genre de silence que ce fichier existe pour empêcher.

| Quoi | État réel | Ce qui manque pour que ça vive |
|---|---|---|
| **Le crédit fondatrice s'applique tout seul** | actif dès le déploiement | rien — mais **jamais éprouvé contre l'API Stripe réelle** (T-021) |
| **La mesure d'audience** | branchée, **inerte** | le clic « Enable » de Web Analytics au tableau de bord Vercel (T-020) |
| **La rétention à 90 jours** | livrée, **inerte** | la migration `20260901`, le template M10 poussé, `BREVO_TEMPLATE_M10_ID` (T-076) |
| **Le dépôt se valide sans attendre la fin des transferts** | actif dès le déploiement | rien — à voir à l'œil sur un vrai dépôt de 80 photos en 4G |

**Le crédit fondatrice, en détail.** Il ne se tape plus : `/api/atelier/checkout` relit
`waitlist` lui-même et pose `discounts: [{ promotion_code }]` sur la session Stripe. La règle
vit dans `src/lib/atelier/fondatrice.ts`, unique pour les deux appelants (le checkout, et le
bouton admin gardé comme filet). ⚠️ `allow_promotion_codes` est RETIRÉ dans ce cas : Stripe
interdit les deux ensemble, les laisser ferait échouer le paiement. ⚠️ Au palier 30 €, le
crédit couvre TOUT le prix : la session se solde en `no_payment_required` et le dossier n'a
**aucun `payment_intent`** — plusieurs gardes ailleurs dans le code en dépendent.

**Le dépôt validable sans attendre, en détail.** Le bouton « Envoyer à l'atelier » ne demande
plus `enVol === 0` (`composer/depot/paliers.ts`). Le seuil de 40 reste compté sur les photos
**confirmées par le serveur**, jamais sur celles qui sont en vol. Le navigateur annonce au clic
combien il comptait en envoyer (`photos_attendues`, dans l'événement `consentements` — un
témoin, pas une promesse) : l'écart avec `nb_photos` est la seule trace qui dise à l'atelier
qu'un onglet s'est fermé en route. La fiche admin l'affiche, et ne conclut RIEN quand il est
absent (dossier antérieur au 01/09).

⚠️ **Le déploiement Vercel de cette fusion n'a pas été vérifié** par la passe documentaire du
01/09. La leçon du 30/08 tient : une fusion ne prouve pas un déploiement, et le cache de
bellajour.fr peut servir l'ancienne version plusieurs minutes.

## 🌙 Recette autonome du 03/09 au soir — dossier « Test soir »

Parcours complet rejoué en autonomie (accord de Mathias du 03/09 : « push absolument tous les
mails », uniquement sur mdurand085@gmail.com). Quatre dossiers de test créés par les vraies
routes de prod ; **14 mails partis, tous sur ces dossiers, aucun autre dossier touché**
(vérifié dans `mails_envoyes`).

**Prouvé de bout en bout** : questionnaire prod (dont `sous_titre`/`mot_quatrieme` écrits — la
migration du 03/09 marche par la route) · dépôt 45+1 photos (presign→PUT→complete) · M0, M1,
M9 (+MOT), M3, correction d'aperçu sans mail, paiement Stripe test 10 € (crédit fondateur
appliqué d'office −30 €, webhook local → `payee`, `facture_url` posée), M4, M5, retouches
(auto-validation suspendue) puis republication → M5 bis (verrou réouvert), validation cliente
→ M6, `envoyer_impression` en **mode manuel** (aucune commande Cloudprinter — non couverte par
l'accord), `ItemShipped` forgé → M7 + suivi Colissimo, PDF souvenir fabriqué,
`ItemDeliveryCompleted` → M7b, rejeu ignoré (idempotence), souvenir 302/404 vérifié SUR LA
PROD. `verif-mails-brevo` : aucun trou. `reconcilier-stripe` : paiement rapproché, zéro écart.
Recette technique verte (tsc, lint, build, harnais **734 assertions**).

**Reste à échéance, par le cron de 7 h UTC (tout part sur mdurand085)** : M2 (« Test soir 2 »,
vide, dû sam. 05/09) · M2b (« Test soir 3 », 10 photos sans consentement, dû sam. 05/09) ·
M3b (« Test soir 4 », `apercu_pret` non payé, dû 06/09 ; les deux `apercu_pret` du 02/09 sont
aussi des tests de Mathias) · M8 (« Test soir » livré, dû 06/09). Ou en une commande :
`node scripts/recette.mjs pousser "Test soir 2" M2 --sur=local` (etc.). M10 : levier ajouté à
`recette.mjs` (arbre de travail, NON commité) — cible « Test soir 2 », relancer `relever` une
seconde fois.

**Trouvailles** :
1. **Le template M10 EXISTE chez Brevo** (id 40, poussé le 02/09, actif) et
   `BREVO_TEMPLATE_M10_ID=40` est posée en local — la section « Mails Brevo » ci-dessous était
   en retard. Reste à confirmer la variable sur Vercel Production.
2. **Supprimer un dossier payé ressuscite le crédit fondateur** : la consommation vit dans les
   `evenements` du dossier payeur ; le ménage du 01/09 (dossiers de test supprimés en cascade)
   a effacé la trace, et le checkout de ce soir a re-frappé `FONDATEUR-MATHIAS30` (−30 €).
   Portée réelle : ménage de tests seulement, mais à savoir avant tout `nettoyer`.
3. **La reprise `?reprendre=` est aveugle aux photos serveur** tant que le navigateur n'envoie
   ou ne supprime rien (`nbServeur` ne s'apprend qu'au retour de `complete`/`supprimer`,
   `moteur.ts:325,722`) : sur un AUTRE appareil, une cliente au dépôt fait voit « 0 photo » et
   un bouton verrouillé. À transformer en ticket.
4. Le rate-limit de `POST /api/atelier/numero` a freiné la 3e création consécutive (429) —
   comportement voulu, constaté en vrai.

**Les 4 dossiers « Test soir\* » restent en base** pour porter les mails à échéance ; les
supprimer ensuite avec `recette.mjs nettoyer` (⚠️ trouvaille nº2 : la suppression de
« Test soir » payé ressusciterait ENCORE le crédit fondateur — le re-consommer ou l'assumer).

## Mails Brevo — identifiants réels

L'atelier compte **quatorze** codes de mail (`CodeMail`, `src/lib/atelier/mails.ts`) —
recomptés le 03/09 dans le code, M7b venant de s'ajouter :

| | |
|---|---|
| Treize avec un identifiant Brevo | M0=38 · M1=27 · M2=30 · M2b=37 · M3=28 · M3b=31 · M4=29 · M5=32 · M6=33 · M7=34 · **M7b=41** · M8=35 · M9=36 |
| **Un sans identifiant** | **M10** — le préavis de fermeture (T-076). Le template n'a **jamais été poussé** chez Brevo et `BREVO_TEMPLATE_M10_ID` n'existe nulle part. |

Prévente : F1=17 · S1=18 · P3=19 · A1=20 · A2=21 · A3=22 · Relance=23 · W1=5 · P1=10 · P2=11.

Le texte est versionné dans `scripts/mails-atelier.mjs`, pas dans l'interface Brevo.
`--pousser` réécrit les **douze** templates que porte le tableau `MAILS` du script
(M0, M2, M2b, M3, M3b, M5, M6, M7, **M7b**, M8, M9, **M10**) ; borner avec
`--seulement <CODE>`.
⚠️ **M1 et M4 ne sont PAS dans ce script** et ne sont donc jamais réécrits par `--pousser` :
leur maquette se met à jour par le simple déploiement des images qu'elle référence. C'est la
raison pour laquelle « les dix templates » et « les douze mails » ne se recoupaient pas — deux
comptes différents, aucun des deux n'étant le nombre de mails.

⚠️ **Ce que coûte l'absence de M10** : `scripts/anonymiser-dossiers.ts` exige que le préavis
soit parti depuis 7 jours avant de refermer quoi que ce soit. Sans la variable, aucun M10 ne
part, donc **rien ne s'anonymise du tout** — la rétention de 90 jours est livrée et inerte.

## Les rebonds — actifs, et prouvés de bout en bout (29/08/2026)

`BREVO_WEBHOOK_SECRET` est posé sur Vercel (Production) et le webhook Brevo existe :
**id 2158565**, type `transactional`, événements `hardBounce` / `blocked` / `invalid` / `spam`,
en-tête `x-bellajour-secret`.

**Recette réelle, pas simulée.** Un dossier créé sur `rebond-test@bellajour.com` — boîte
inexistante de notre propre domaine, donc aucun tiers impliqué et aucune adresse inventée chez
un fournisseur qui abîmerait la réputation d'expéditeur :

| | |
|---|---|
| 10:14:41 | dossier créé |
| 10:14:42 | M0 part |
| **10:14:56** | **`email_rebond` au journal**, motif SMTP complet (`550 5.1.1 … User doesn't exist`) |

Quatorze secondes. Dossier de test supprimé ensuite (1 mail, 3 événements, 1 numéro).

⚠️ **Brevo n'a AUCUN endpoint de test de webhook** (`POST /v3/webhooks/{id}/test` → 404). La
seule façon d'éprouver cette chaîne est de provoquer un vrai rebond.

⚠️ **Le branchement rend RÉELS deux défauts relevés en relecture** : T-036 (la graphie `invalid`
pourrait être ignorée en silence) et T-038 (la route rend 200 même si l'écriture au journal a
échoué, donc Brevo ne réessaie pas). T-038 était théorique tant que la route rendait 404 ; elle
ne l'est plus.

Le garde-fou de saisie (`suggestionEmail`, écran 4) est autonome : aucune variable, aucune
configuration. Vérifié en production le 29/08 — `flore@gmial.com` propose `flore@gmail.com`,
`m.durand@bellajour.com` est laissé tranquille.

## Migrations

**21 fichiers sur disque, 19 entrées dans l'historique appliqué** (mesuré le 03/09/2026 au
soir : `ls supabase/migrations/*.sql` et `supabase_migrations.schema_migrations`). L'écart de
deux vient des migrations passées par l'éditeur SQL du dashboard, qui n'écrit pas l'historique.
La correspondance fichier ↔ entrée n'a PAS été ré-auditée une par une ; ce qui suit l'a été,
colonne par colonne.

✅ **Les colonnes fraîches existent toutes en production** (vérifiées le 03/09 dans
`information_schema.columns`, pas déduites d'un ticket) :

| Colonne | Migration | État |
|---|---|---|
| `numeros.anonymise_le` | `atelier_retention` | ✅ appliquée le 02/09 |
| `photos.vignette_key` | `atelier_vignettes` | ✅ appliquée |
| `numeros.tracking_code` | `atelier_tracking_code` | ✅ appliquée le 30/08 |
| `numeros.souvenir_pdf_key` + `souvenir_pdf_octets` | `atelier_souvenir` | ✅ appliquée le 03/09 |
| `numeros.sous_titre` + `mot_quatrieme` | `composer_mots_couverture` | ✅ appliquée le 03/09, **écriture prouvée** (dossier de test créé par la route de prod, les deux colonnes remplies, dossier supprimé) |

Les deux avertissements qui vivaient ici — « `atelier_retention` N'EST PAS APPLIQUÉE » et
« rien n'atteste l'application d'`atelier_vignettes` » — **sont levés** : les colonnes sont là.

⚠️ **Le revers du repli 42703 reste vrai et vaut pour toute migration future** : un repli qui
se déclenche fait disparaître le champ en silence. Après CHAQUE migration, vérifier que la
donnée arrive vraiment, pas seulement que la page s'affiche. Pour `anonymise_le`, le contrôle
est que le dry-run d'`anonymiser-dossiers.ts` cesse d'écrire « la colonne n'existe pas encore ».

`atelier_tracking_code` : ✅ **preuve de bout en bout faite le 01/09** — un signal `ItemShipped`
rejoué sur la prod a rempli `tracking_url` + `tracking_code` (transporteur « DPD »), une fois
les clés Cloudprinter posées en Production. Reste à confirmer un jour avec un VRAI colis.

Trois anciennes (`20260528_g1_email_canonical`, `20260528_g3_pages_credits_unique_source`,
`20260704_notion_synced`) sont absentes de l'historique mais leurs colonnes existent : appliquées
hors CLI. Deux entrées de l'historique n'ont pas de fichier : `prevente_ambassador_system` (qui
crée `waitlist`, `pages_credits`, `invoice_jobs`) et `fondateur_assign_by_email_canonical`.

## Variables d'environnement

**48 sont réellement lues** par `src/` et `scripts/`, et **toutes les 48 sont documentées dans
`.env.example`** — rediffé le 01/09/2026, l'écart est nul dans les deux sens : aucune variable
lue n'y manque, aucune variable morte n'y traîne. Le trou de douze relevé par T-011 est bouché,
et T-011 est fermé. (Le code lit une 49e chose, `NODE_ENV`, qui n'est pas une variable à poser.)

**Une variable absente ne casse pas : elle fait un silence.**
`/admin/atelier/sante` est le seul écran qui montre un mail sans template.

À vérifier sur Vercel, Production ET Preview, avant le lancement :
`BREVO_TEMPLATE_M0_ID` (posée le 28/08), les douze autres templates de l'atelier
— dont **`BREVO_TEMPLATE_M7B_ID` = 41**, le magazine numérique, ✅ **posée en Production et
Preview le 03/09** (voir la section du 03/09) —
**`BREVO_TEMPLATE_M10_ID`** (celle-ci n'existe encore nulle part : il faut d'abord pousser le
template — sans elle, aucune rétention ne s'applique), `ADMIN_PASSWORD_MATHIAS`,
`ADMIN_PASSWORD_LOUIS`, `CRON_SECRET`, `ATELIER_MAILS_SECRET`, `CLOUDPRINTER_API_KEY` +
`CLOUDPRINTER_WEBHOOK_KEY` (**posées en Production le 01/09, valeurs SANDBOX — elles n'étaient
qu'en Preview jusque-là ; à basculer en LIVE au lancement**), les cinq `R2_*`, `PREVENTE_FERMEE`.
⚠️ `ADMIN_PASSWORD` (l'ancien mot de passe partagé) peut rester posée : depuis le 31/08 le code
l'ignore complètement (T-005). Elle n'ouvre plus rien.

## ✅ Le PDF souvenir et la livraison automatique — EN PRODUCTION depuis le 03/09/2026

PR #39, mergée et déployée le 03/09 à 12h46 UTC, puis **#41 et #42 le même jour** (voir
« Les deux correctifs » plus bas). Trois choses arrivent ensemble : le signal Cloudprinter
`ItemDeliveryCompleted` passe le dossier en « livrée » tout seul (le geste manuel
« Marquer livrée » reste en repli) ; un mail **M7b « votre magazine est arrivé »** part à ce
moment-là ; son bouton mène à `/numero/<token>`, où la cliente télécharge le **PDF
souvenir** — les PDF d'impression fusionnés en un fichier feuilletable (1re de couv + bloc +
4e découpées de la feuille enveloppante, rognées au format fini, CMJN gardé tel quel).

**Ce qui est PROUVÉ, sur la base de production (dossier de test « test PDF souvenir 03-09 ») :**
- fusion déclenchée par le bouton de la fiche admin : **34 pages, toutes au format fini
  210 × 297**, dos écarté, fond perdu rogné. Dos **mesuré** à 2,9 mm sur la feuille réelle
  (jamais calculé au grammage : T-028 n'est pas tranché) ;
- bascule automatique `expediee → livree` sur le signal, avec l'événement `etat_change`
  — obligatoire, `mesure.ts` en dépend pour les métriques de livraison ;
- **M7b réellement envoyé et reçu** (template Brevo **41**) ;
- téléchargement en production : `www.bellajour.fr/api/atelier/souvenir?token=…` → **302** ;
  token faux, token absent, dossier non livré → **404** indistinct ;
- rejeu du même signal : ignoré, aucun doublon.

`tsc` + `lint` + `build` verts, harnais à **549 assertions**, toutes vertes.

**Les trois gestes de mise en service sont FAITS :**
1. migration `20260903_atelier_souvenir.sql` (colonnes `souvenir_pdf_key` +
   `souvenir_pdf_octets`) **appliquée le 03/09**, colonnes vérifiées en base ;
2. template Brevo M7b poussé (id **41**) et `BREVO_TEMPLATE_M7B_ID=41` posée sur Vercel
   Preview + Production le 03/09 ;
3. ✅ **abonnement Cloudprinter au signal `ItemDeliveryCompleted` : VÉRIFIÉ le 03/09.**
   Webhook nº 5255, endpoint `www.bellajour.fr/api/cloudprinter/webhook`, les douze signaux
   cochés dont `ItemDeliveryCompleted`. Et la clé a été éprouvée de bout en bout : un signal
   réel posté sur la PRODUCTION a répondu `{"received":true,"ignored":true}` — donc la clé
   du dashboard et `CLOUDPRINTER_WEBHOOK_KEY` sur Vercel sont bien la même, et la garde
   d'idempotence a joué (le dossier était déjà livré). Si les deux clés avaient divergé, le
   webhook aurait répondu 404 **en silence** et aucune livraison n'aurait jamais basculé.

✅ **Le dossier de test « test PDF souvenir 03-09 » a été SUPPRIMÉ le 03/09**, recette close :
ses 3 objets R2 d'abord (souvenir + les 2 PDF d'impression, absence vérifiée après coup),
puis ses lignes (2 mails, 26 événements, le dossier). La base est revenue à ses 6 dossiers
réels — 4 en `photos_recues`, 2 en `apercu_pret`. **Aucun dossier n'est donc en état livrée
aujourd'hui** : la prochaine preuve de bout en bout viendra d'un vrai colis.

## Les deux correctifs du 03/09, après la mise en ligne

**PR #41 — le mail atterrissait sur un onglet blanc.** Le bouton pointait le fichier
directement : il téléchargeait bien, mais ne rendait AUCUNE page (`Content-Disposition:
attachment`). La cliente se retrouvait devant un onglet vide. Le bouton mène désormais à
`/numero/<token>`, ce que la doctrine disait déjà — « le mail fait le clic, la page fait le
spectacle ». Une assertion du harnais monte la garde sur la régression exacte : aucun lien
direct vers `/api/atelier/souvenir` dans le mail.

**PR #42 — l'état livrée répétait la vente.** Deux CTA pleins identiques l'un sous l'autre,
et le magazine offert perdait la vedette. La relance (« Et le prochain moment ? ») est passée
en pied de page, derrière un filet, avec un bouton cuivre cerné ; le téléchargement du
magazine est le seul geste plein de la page. Le **poids du fichier n'est plus montré à la
cliente** (décision de Mathias : contrainte technique à l'instant d'offrir un cadeau) — il
reste lisible côté atelier, sur la fiche. Et « Gardez ce lien » disparaît **à l'état livrée
seulement** : ailleurs, ce lien est la seule porte du dossier (ni compte ni mot de passe,
PRD §7.5) et une cliente qui perd son mail perdrait son numéro.

⚠️ **Ce qui n'est PAS fait, et c'est assumé** : aucune conversion CMJN → RVB, aucune
recompression. Le souvenir pèse le poids du fichier d'impression — plutôt 150 à 200 Mo qu'une
dizaine — et depuis la #42 ce poids n'est **plus annoncé à la cliente**, seulement à l'atelier.
Si un téléchargement interminable est signalé un jour, c'est là qu'il faut regarder. Une
version allégée demande le moteur de rendu de **T-078**.

## ⚠️ L'atelier n'est pas encore en fonctionnement (30/08/2026, tenu au 01/09)

Le tunnel est OUVERT au public et il crée de vrais dossiers, mais **l'atelier ne compose pas
encore**. Des clientes s'inscrivent en avance ; leurs numéros seront faits plus tard, et elles
sont prévenues à la main par mail.

**À lire avant de crier au dossier oublié.** Au 29/08, quatre dossiers sont en base, tous à
l'état `photos_recues`, trois avec leur dépôt terminé. Le plus ancien (Marjorie, 49 photos, 25/08)
attend depuis cinq jours alors que `DELAIS.photos_recues` promet « Couverture sous 48 h ».
**Ce n'est pas une défaillance** : c'est une inscription anticipée, et Mathias l'a prévenue
par mail — c'est Marjorie, « Notre histoire », 49 photos.
`/admin/atelier/sante` les comptera pourtant comme « oubliés », puisqu'il ne connaît que la
promesse. Le constat est juste selon sa règle, et faux selon la réalité.

**Au 01/09, la base porte six dossiers** (compte relevé par le dry-run de
`scripts/anonymiser-dossiers.ts` : cinq au dépôt terminé, un jamais terminé, aucun à refermer).

⚠️ **C'est ici, et nulle part ailleurs, que vit le constat nº4 de la page Santé.** T-024 est
fermé : la page ne crie plus sur une base vide. Ce qui reste — « oubliés » compte les
inscriptions anticipées — n'est pas un défaut de code, c'est cette période-ci. Le distinguer
demanderait un réglage « date d'ouverture » qui n'existe pas et que seul Mathias peut poser. Le
jour où l'atelier compose, le constat redevient vrai tout seul.

Deux conséquences à garder en tête tant que l'atelier n'a pas ouvert :
1. La page `/numero/<token>` annonce « Votre couverture arrive **sous 48 h** » **sans condition** —
   la même phrase après deux heures et après cinq jours. C'est le seul endroit où le site dit
   autre chose que ce que Mathias écrit à la main.
2. Rien ne part automatiquement pour contredire un mail manuel : `mails.ts` arrête toute relance
   dès que le dépôt est terminé (« Elle a fait ce qu'on lui demandait ; le trou est de notre
   côté »). C'est le bon comportement, et il tient pendant cette période.

À supprimer de ce fichier le jour où l'atelier compose vraiment.

## ✅ RÉSOLU le 31/08 — le correctif du compteur est déployé

L'épisode du 30/08 (aucun déploiement créé pour la fusion de la PR #11) s'est refermé avec
la fusion de la PR #13 : Vercel a déployé le nouveau `main` normalement, compteur compris.
Historique conservé ci-dessous pour mémoire du symptôme.

| | |
|---|---|
| `main` pointe sur | `86fb3e2` (fusion de la PR #11, le compteur) |
| Dernier déploiement de PRODUCTION | `5c170a72` — la PR #10, les titres |
| Déploiement pour `86fb3e2` | **aucun**, douze minutes après la fusion |

Ce n'est ni une file d'attente ni un échec de compilation : Vercel n'a créé **aucun**
déploiement pour cette fusion — pas de trace réussie, annulée ni en erreur. La fusion
précédente (PR #10) avait produit le sien en quelques minutes.

**Conséquence visible** : sur bellajour.fr, le compteur de la page 02 affiche encore `0`
sans JavaScript, alors que le correctif est dans `main`.

**Comment reprendre** : tableau de bord Vercel → Deployments → le déploiement de production
le plus récent → les trois points → **Redeploy**, en décochant « Use existing build cache ».
Cela reconstruit depuis l'état actuel de `main`, qui contient déjà le correctif.

⚠️ Ne PAS forcer avec un commit vide sur `main` : c'est un push sur `main`, interdit par le
socle, et le garde-fou le refuse. Un problème d'infrastructure ne justifie pas de contourner
la règle qui protège la production.

**À vérifier une fois redéployé** — la commande qui tranche, cache contourné :
```bash
curl -s -H "Cache-Control: no-cache" "https://www.bellajour.fr/?v=$(date +%s)" | grep -o 'data-compte="12480">[^<]*<'
```
Doit rendre `12 480`, pas `0`. ⚠️ Ne pas chercher `12` dans la ligne entière : `12480` est
déjà dans l'attribut, un test naïf conclut à la réussite quoi qu'il arrive.

## 🌙 Nuit autonome du 30/08 — fusionnée et DÉPLOYÉE le 31/08 à 07:32 UTC

PR #13 fusionnée par Mathias ; Vercel a déployé `473bf0c` en production dans la foulée
(vérifié : le compteur rend `12 480`, cache contourné). Le retard de déploiement de la
PR #11 est résolu du même coup — l'épisode « aucun déploiement créé » du 30/08 ne s'est
pas reproduit. ⚠️ Leçon au passage : le bouton **Redeploy** de Vercel reconstruit le MÊME
commit que la ligne choisie, il ne prend PAS le main courant — pour déployer main sans
nouvelle fusion, c'est « Create Deployment » (menu ⋯), pas Redeploy.

`--pousser` FAIT le 31/08 vers 07:50 UTC, sur feu vert explicite de Mathias : les 10
templates (mêmes IDs, aucune variable Vercel à changer) portent la maquette au logo
`logo-mail-fond.png` et l'encart CODE_SUIVI de M7. `verif-mails-brevo.ts` après coup :
« Aucun trou de variable ». Trois mails de test envoyés à Mathias (M0, M7 avec lien,
M7 numéro seul). M1 et M4, hors script, sont couverts par le PNG opaque déjà en ligne.

### Le détail de ce que portait la branche (mémo)

`chantier/nuit-autonome-30-08` porte 7 commits (recette VERTE : types, lint, build, harnais) :
logo mail opaque + M7 avec numéro de suivi · dashboard métriques complet (entonnoir, durées,
réactivité↔conversion, export CSV) · aperçu + contrôle des PDF d'impression sur la fiche ·
code fondatrice en un clic (T-021) · verrou multi-exemplaires (T-073) · 5 corrections de
performance mobile · 8 tickets neufs (T-072→T-079) · specs Cloudprinter relevées
(`SPECS-CLOUDPRINTER.md` : les produits font 210×297, les CGV disent 210×280 — T-077).

**Rien n'est actif tant que** : (1) la PR n'est pas fusionnée et déployée ; (2) pour les mails,
`node scripts/mails-atelier.mjs --pousser` n'est pas lancé avec l'accord de Mathias (M1/M4,
hors script, sont couverts par le simple déploiement du PNG opaque).

## Ce qui n'est pas mesuré — corrigé le 01/09/2026

Ce paragraphe disait deux choses fausses ; elles ont pourri sur place parce qu'elles n'ont pas
été relues quand le code a bougé. L'état réel :

**Le traceur d'audience EXISTE, et il ne compte encore rien.** `<Mesure />` est posé dans
`src/app/layout.tsx`, sur `@vercel/analytics`. Il rend `null` hors production et **reste inerte
tant que Web Analytics n'est pas activé dans le tableau de bord Vercel** — c'est un clic de
Mathias, pas un déploiement. Le filtre de fuite est en place et testé :
`src/lib/analytics/chemin.ts` masque tout segment porteur d'un jeton (`/numero/[token]`,
`?reprendre=`, `?token=`), ne laisse passer que les `utm_*`, exclut `/admin/**` en entier, et
n'envoie RIEN d'une URL qu'il n'a pas su lire. Voir T-020.
⚠️ Tant que le clic n'a pas eu lieu, **on ne sait toujours pas** combien de visiteuses arrivent
ni où elles partent : le résultat pratique est le même qu'avant, la cause est différente.

**Les rebonds Brevo SONT traités** depuis le 29/08 — voir la section « Les rebonds » plus haut,
dans ce même fichier, qui le dit et le prouve depuis toujours. Ce paragraphe la contredisait.
Le webhook (id 2158565) écrit `email_rebond` et `email_plainte` au journal, la page Santé les
montre depuis le 31/08 dans deux constats séparés (T-037).

**Ce qui manque vraiment, aujourd'hui :**
- aucune remontée d'erreur serveur autre que les logs Vercel (T-031) ;
- rien ne compare les paiements Stripe aux dossiers de la base (T-081) — le seul silence de la
  liste où l'argent est déjà encaissé ;
- personne ne serait prévenu si Google rejetait le site (T-071).

## Le piège de la mitigation Vercel

Vercel peut répondre **403** avec `x-vercel-mitigated: challenge` à tout client non-navigateur
sur un trafic qu'il juge robotique. Ce n'est pas un réglage, ça s'éteint seul. Un navigateur
passe ; Stripe et `scripts/recette.mjs` non. Test : `curl -X POST …/api/webhook` doit rendre
**400** (`missing_signature`) ; 403 = épisode en cours, attendre.
⚠️ **Ne pas couper le pare-feu** — « Attack Challenge Mode » est au niveau du PROJET et
découvrirait aussi bellajour.fr. Stripe réessaie trois jours, et l'événement se renvoie à la main.

## Avant la bascule en LIVE

Cinq tiers à faire passer en production, chacun avec son interrupteur et sa vérification :
`docs/reference/BASCULE-LANCEMENT.md`. Deux points se décident AVANT le jour J : l'immatriculation
portugaise chez Stripe Tax (le câblage TVA est inerte sans elle) et les finitions Cloudprinter
(T-027). **Un mode test resté branché ne fait pas d'erreur, il fait un silence.**
