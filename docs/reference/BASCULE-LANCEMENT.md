# Bascule en LIVE — la liste du lancement officiel

> Le fil rouge de ce document : **un mode test resté branché ne produit pas
> une erreur, il produit un silence.** Stripe encaisse et personne n'est
> prévenu. Cloudprinter imprime et le colis n'a pas de suivi. Le cron ne
> tourne pas et quatre mails ne partent jamais. Aucun écran rouge nulle part.
> Chaque case ci-dessous a donc deux colonnes : **ce qu'on bascule**, et
> **comment on vérifie** — parce qu'une bascule qu'on ne vérifie pas n'a pas
> eu lieu.

Cinq tiers ont chacun leur propre interrupteur : Stripe, Cloudprinter, Brevo,
Supabase, Cloudflare R2. Aucun n'est commandé par les autres.

---

## 0 · Ce qui est PARTAGÉ entre la preview et la production

⚠️ **La preview et la production écrivent dans la MÊME base Supabase.** Ce
n'est pas un accident de configuration, c'est ce qui rend la recette réaliste
— mais ça veut dire que tout ce qui a été fabriqué pendant les tests est
déjà, aujourd'hui, dans la base de production.

- [ ] Les dossiers de test sont supprimés : `node scripts/recette.mjs nettoyer --vraiment`
      (il ne touche QUE les titres commençant par « test » — c'est toute la
      raison de la convention de nommage)
- [ ] `/admin/atelier` ne montre plus une seule cliente qui n'existe pas
- [ ] Les commandes Cloudprinter de sandbox n'ont pas laissé de dossier en
      état « en production » ou « expédiée » qui ne correspond à rien

Corollaire utile : **les migrations n'ont pas à être rejouées.** Il n'y a
qu'une base, ce qui est appliqué l'est pour les deux. Vérifier tout de même
que la dernière est bien passée — aujourd'hui **`20260901_atelier_retention`**
(colonne `numeros.anonymise_le`), et elle **n'est PAS appliquée** au 01/09.

- [ ] `20260901_atelier_retention.sql` appliquée, **puis vérifié que la donnée
      arrive** : le dry-run de `scripts/anonymiser-dossiers.ts` doit cesser
      d'écrire « la colonne anonymise_le n'existe pas encore ». ⚠️ Le repli
      42703 efface en silence : tant qu'on ne fait pas ce contrôle, on ne sait
      pas si la migration a servi.
- [ ] `20260830_atelier_vignettes.sql` : rien dans le dépôt n'atteste son
      application. À contrôler au même passage.

---

## 1 · Stripe

**Ce qu'on bascule**

- [ ] `STRIPE_SECRET_KEY` = la clé **live** (`sk_live_…`), en Production sur Vercel
- [ ] Point d'écoute (webhook) **live** créé vers `https://www.bellajour.fr/api/webhook`,
      avec les trois événements : `checkout.session.completed`,
      `checkout.session.expired`, `charge.refunded`
- [ ] `STRIPE_WEBHOOK_SECRET` = le `whsec_…` **de ce point d'écoute live**
      (il est différent de celui du mode test, c'est l'oubli classique)
- [ ] Immatriculation **portugaise** ajoutée dans Stripe Tax, taux 23 %
      (tranché le 24/08/2026 : pas les 6 % du livre, un album photo
      personnalisé n'est pas un livre au sens fiscal)

**⚠️ Le piège vécu le 24/08/2026** — un album de l'atelier payé en test a
déclenché le mail « bienvenue en prévente ». Cause : l'événement était routé
vers un **ancien déploiement** par un point d'écoute oublié qui pointait sur
une preview. Le tri par métadonnées existe maintenant dans le code, mais il ne
protège que le code **déployé**.

- [ ] Aucun point d'écoute résiduel ne pointe vers une URL `*.vercel.app`
      avec des clés live. Passer la liste en revue, une par une.

**Comment on vérifie**

```bash
curl -X POST https://www.bellajour.fr/api/webhook
```

Doit répondre **400** (`missing_signature`). Si c'est **403** avec
`x-vercel-mitigated: challenge`, la mitigation automatique de Vercel est en
cours : elle s'éteint seule, on attend. **Ne pas couper le pare-feu** — le
mode challenge est au niveau du PROJET, le couper découvrirait aussi
bellajour.fr.

Puis : une vraie commande, avec une vraie carte, jusqu'au bout (§6).

> `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` est listée dans CLAUDE.md mais
> **n'est utilisée nulle part dans le code** : le paiement est une redirection
> côté serveur. Ne pas perdre de temps à la poser, et ne pas croire qu'elle
> prouve quoi que ce soit.

---

## 2 · Cloudprinter — le plus silencieux des cinq

C'est celui qui ne dit rien quand il n'est pas branché. Sans clé API,
« Envoyer à l'impression » redevient un simple changement d'état : le dossier
passe en production, la cliente reçoit M6 « votre numéro part à l'impression »,
et **aucun imprimeur n'a rien reçu**. L'écran de confirmation l'annonce (mode
manuel), mais il faut le lire.

**Ce qu'on bascule**

- [ ] Interface **Live** créée au dashboard (CloudCore → « My API interface »,
      PAS les « CloudApps Quick Order »). ⚠️ Sandbox/Live est une propriété de
      l'**interface**, pas de la clé : une clé live sur une interface sandbox
      commande dans le vide.
- [ ] `CLOUDPRINTER_API_KEY` = la clé de l'interface Live, en Production
- [ ] Webhook **CloudSignal** créé vers
      `https://www.bellajour.fr/api/cloudprinter/webhook`
- [ ] `CLOUDPRINTER_WEBHOOK_KEY` = la clé de ce webhook, en Production
- [ ] Le webhook « Bellajour preview » ne reçoit plus les signaux des
      commandes réelles (il pointe sur la preview)

**Ce qui casse en silence si le webhook manque** : pas de `ItemShipped`, donc
pas de passage automatique en « expédiée », donc pas de transporteur, pas de
numéro de suivi, pas de lien, **et pas de M7**. La cliente attend un colis
dont personne ne lui a dit qu'il était parti. Aucune erreur nulle part.
Le filet reste *Marquer expédiée* à la main, mais encore faut-il savoir qu'il
faut s'en servir.

**À trancher avant, pas pendant**

- [ ] Les finitions par défaut (`pageblock_130mcs`, `cover_250mcs`) sont
      celles qu'on veut : elles vivent dans `src/lib/atelier/impression.ts`,
      c'est LE seul endroit à retoucher. L'étude de prix tranche.
- [ ] Le catalogue live porte bien les deux références attendues
      (`magazine_sas_a4_p_fc` agrafé pour 20 p.,
      `magazine_pb_a4_p_fc` dos carré au-delà) :
      `node scripts/cloudprinter-produits.mjs` ⚠️ API très rationnée, une fois.

**Comment on vérifie** — la seule preuve qui vaille est une commande réelle
menée jusqu'au signal d'expédition (§6). En attendant, `node scripts/recette.mjs
signal "…" ItemShipped` forge un webhook, mais il ne prouve que notre moitié.

---

## 3 · Brevo

- [ ] `BREVO_API_KEY` en Production
- [ ] Les identifiants de template, **les treize**, en Production :
      `M0=38  M1=27  M2=30  M2B=37  M3=28  M3B=31  M4=29  M5=32  M6=33  M7=34  M8=35  M9=36`
      (atelier) et `W1  P1  P2  P3  F1  S1  A1  A2  A3  RELANCE` (prévente)
- [ ] ⚠️ **`BREVO_TEMPLATE_M0_ID` était absent de cette liste** — corrigé le
      01/09. C'est l'accusé qui part à la SECONDE où le dossier existe, le
      premier mail que voit une cliente. Sans lui : silence complet entre
      l'écran 4 et la relance du lendemain.
- [ ] ⚠️ **`BREVO_TEMPLATE_M10_ID` n'existe pas encore.** Le treizième mail —
      le préavis de fermeture de la rétention à 90 jours (T-076) — n'a jamais
      été poussé chez Brevo : `node scripts/mails-atelier.mjs --pousser
      --seulement M10`, puis poser l'ID qu'il affiche. **Tant qu'il manque,
      `scripts/anonymiser-dossiers.ts` n'anonymise RIEN** : il refuse de
      refermer un dossier qui n'a pas été prévenu. Toute la rétention en dépend.
- [ ] ⚠️ `BREVO_TEMPLATE_M2B_ID` : longtemps « à créer », il existe (37).
      Tant qu'il manque sur Vercel, la relève signale `sans_template` et
      **n'envoie rien** — sans autre bruit.
- [ ] ⚠️ Les identifiants ci-dessus sont ceux du compte utilisé jusqu'ici.
      **Si le lancement se fait sur un autre compte Brevo, ils changent tous** :
      c'est précisément pourquoi ils vivent en variable d'environnement et
      jamais en dur. Relancer `--pousser` avec la clé du bon compte et
      recopier les IDs qu'il affiche.

**Comment on vérifie**

```bash
npx tsx --tsconfig tsconfig.json scripts/verif-mails-brevo.ts
```

Il compare les `{{ params.X }}` de chaque template avec ce que le code envoie
réellement, et attrape le trou silencieux (un template qui attend un mot que
personne ne lui donne). ⚠️ Il lit `.env.local`, donc il vérifie **le compte
Brevo**, pas Vercel : la liste des variables de Production reste à comparer à
l'œil.

- [ ] Le texte des mails est celui du dépôt : `node scripts/mails-atelier.mjs --pousser`
      a été lancé après la dernière retouche (idempotent, mêmes IDs)
- [ ] SPF/DKIM toujours verts (DNS chez **Cloudflare**, pas Hostinger —
      réparé le 24/08/2026)

---

## 4 · Vercel

- [ ] **Le cron tourne en Production.** `vercel.json` le déclare (7 h UTC,
      `/api/atelier/mails/relever`) mais un cron déclaré n'est pas un cron qui
      tourne : le vérifier dans l'onglet Cron Jobs, et lire la dernière
      exécution. ⚠️ **Sans lui, M2, M2b, M3b, M8, M10 et l'auto-validation à
      J+7 ne partent JAMAIS** — donc, depuis M10, **toute la rétention à
      90 jours ne s'applique pas non plus** : le préavis ne part pas, et le
      script d'anonymisation refuse de refermer un dossier non prévenu.
      C'est la panne la plus coûteuse de la liste, et la plus invisible.
      Le détail : `docs/reference/CRON-RELEVE.md`.
- [ ] `CRON_SECRET` (envoyé automatiquement par Vercel) **ou**
      `ATELIER_MAILS_SECRET` posé. Si aucun des deux n'existe, la route répond
      404 et le cron échoue en silence — et avec lui M2, M2b, M3b, M8, **M10 et
      donc toute la rétention à 90 jours**, plus l'auto-validation à J+7.
- [ ] `ATELIER_M2_DEPUIS` **absent en Production**, ou posé à la date
      d'ouverture. Il est reculé sur la preview pour rendre M2 testable ;
      reculé en prod, il relance des dossiers abandonnés vieux de plusieurs
      semaines.
- [ ] `PREVENTE_FERMEE=true` (lu côté serveur — ferme `/api/checkout` en 410
      et bascule `/api/offer-state`)
- [ ] `NEXT_PUBLIC_SITE_URL=https://www.bellajour.fr` — c'est l'adresse qui
      part dans **tous** les liens des mails. Fausse, chaque mail envoie la
      cliente sur une preview.
- [ ] `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (strictement server-side)
- [ ] `R2_ENDPOINT`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- [ ] Les nominatifs `ADMIN_PASSWORD_MATHIAS`, `ADMIN_PASSWORD_LOUIS` (le
      prénom au journal en dépend). ⚠️ `ADMIN_PASSWORD`, l'ancien mot de passe
      partagé, **n'est plus lu par le code depuis le 31/08** (T-005) : la
      poser n'ouvre plus rien, et la retirer ne ferme rien.
- [ ] `AMBASSADEUR_LINK_SECRET`, `INFLUENCER_CODES` si la prévente garde ses droits
- [ ] Protection de déploiement désactivée sur le domaine public (sinon Stripe
      et Cloudprinter prennent un 403 à chaque signal)

---

## 5 · Cloudflare R2

- [ ] Le CORS du bucket autorise **GET** pour `https://www.bellajour.fr`
      (aujourd'hui : PUT/GET/HEAD sur bellajour.fr, `*.vercel.app`,
      localhost:3000). Sans GET, « Télécharger le lot » échoue photo par
      photo et l'éditeur se retrouve devant une liste de ratées.
- [ ] Un dépôt de photos réel depuis un téléphone passe (PUT signé)

---

## 6 · Le tour de piste — une vraie commande, une vraie carte

Rien de ce qui précède ne prouve la chaîne. Une seule chose la prouve : un
numéro mené de bout en bout **en production**, avec un vrai paiement (qu'on se
rembourse ensuite) et une vraie impression.

- [ ] Un dépôt de photos depuis un téléphone, jusqu'au bouton *Envoyer à l'atelier*
      → **M1** reçu
- [ ] Publier l'aperçu → **M3** reçu, la page d'état 2 affiche le prix
- [ ] Payer avec une vraie carte → **M4** reçu, la facture est liée
- [ ] Publier la maquette → **M5** reçu, avec la bonne date limite
- [ ] Valider → **M6** reçu
- [ ] *Envoyer à l'impression* → la commande apparaît dans le dashboard
      Cloudprinter **Live**, le journal du dossier porte son numéro
- [ ] Le signal d'expédition arrive **seul** → état « Expédiée », transporteur
      et numéro de suivi remplis sans qu'on ait rien tapé, **M7** reçu avec le
      lien « Suivre le colis chez … »
- [ ] Le colis arrive vraiment. *Marquer livrée* → **M8** trois jours plus tard
      (ou `node scripts/recette.mjs pousser "…" M8`)
- [ ] Se rembourser : le journal l'écrit, aucun état ne recule tout seul

---

## 7 · Le jour J, et les jours suivants

- [ ] `/admin/atelier/sante` est vert : aucun mail sans template, aucun mail
      en échec, aucun dossier qui attend un mail impossible, la relève ne se
      tait pas
- [ ] Le lendemain matin, vérifier que le cron de 7 h UTC a bien tourné —
      c'est la première nuit qui dit si la machine vit toute seule
- [ ] Un premier vrai dossier suivi à la main pendant 48 h : les délais
      promis par `urgence.ts` sont ceux que la page publique annonce, et
      c'est la seule façon de s'en assurer

---

## Ce qui n'a PAS besoin d'être basculé

Pour ne pas perdre de temps à chercher un interrupteur qui n'existe pas.

- **Les migrations Supabase** : une seule base pour la preview et la prod.
- **Les redirections 308** `/atelier` → `/` (next.config.ts) : déjà en place,
  et ⚠️ mises en cache par les navigateurs — ne pas les inverser à la légère.
- **Le tri du webhook Stripe** : il vit dans le code, pas dans une variable.
