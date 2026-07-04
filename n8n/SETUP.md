# n8n — Radar ambassadrices + Sync Supabase → Notion

Deux automatisations pour l'instance auto-hébergée : **https://n8n.srv1802624.hstgr.cloud**

- **Radar** (`radar-ambassadrices.json`) : chaque matin à 08:00, un mail listant quoi faire aujourd'hui.
- **Sync** (`sync-supabase-notion.json`) : chaque heure, crée dans le CRM Notion la fiche de chaque nouvelle ambassadrice/influenceuse inscrite sur le site (Supabase).

> Les 3 credentials existent déjà dans n8n et sont réutilisés **par leur nom** :
> `Gmail account`, `Supabase account`, `Notion account`. On ne recrée aucun mot de passe.

---

## 0. Pré-requis (à faire UNE fois)

1. **Migration Supabase** — ajoute la colonne `notion_synced` sur `public.waitlist`.
   Le fichier existe déjà : `supabase/migrations/20260704_notion_synced.sql`.
   - Si le CLI Supabase est configuré : `supabase db push` (ou `supabase migration up`).
   - Sinon, colle ce SQL dans **Supabase → SQL Editor** puis *Run* :
     ```sql
     ALTER TABLE public.waitlist
       ADD COLUMN IF NOT EXISTS notion_synced boolean NOT NULL DEFAULT false;
     ```
   C'est additif et idempotent (aucun risque sur les colonnes existantes).

2. **Notion** — dans la base **CRM Influenceurs**, vérifie que le champ **Statut**
   contient bien l'option **`Vient de rejoindre`** (sinon crée-la à l'identique,
   même casse). Vérifie aussi que le champ **Type** contient les options
   **`Ambassadeur`** et **`Influenceur`**.

---

## 1. Importer chaque workflow

Pour **chacun** des deux fichiers :

1. Ouvre n8n → menu **Workflows**.
2. Bouton **⋯** (ou *Add workflow*) → **Import from File**.
3. Choisis `radar-ambassadrices.json` (puis, séparément, `sync-supabase-notion.json`).
4. Le workflow s'ouvre. Il est **inactif** par défaut : c'est normal.

---

## 2. Re-sélectionner les credentials (obligatoire après import)

À l'import, n8n ne retrouve pas l'ID interne des credentials : il faut les
re-choisir dans chaque node concerné (un cadre rouge/orange le signale).

**Radar :**
- Node **Fiches CRM Influenceurs** (Notion) → champ *Credential* → choisir **Notion account**.
- Node **Envoi mail Radar** (Gmail) → *Credential* → choisir **Gmail account**.

**Sync :**
- Node **Waitlist non synchronisées** (Supabase) → *Credential* → **Supabase account**.
- Node **Créer fiche CRM** (Notion) → *Credential* → **Notion account**.
- Node **Marquer notion_synced** (Supabase) → *Credential* → **Supabase account**.

> Dans le node **Créer fiche CRM**, une fois le credential Notion sélectionné,
> ouvre chaque ligne de *Properties* et re-choisis la propriété dans la liste
> déroulante si elle n'apparaît pas déjà (Prénom, Email, Code promo, Type, Statut).
> Si **Statut** est de type *Select* (et non *Status*) dans ta base, sélectionne-le
> simplement dans la liste : n8n adapte le type tout seul.

Enregistre chaque workflow (**Save**).

---

## 3. Tester (avant activation)

### Radar
1. Ouvre le workflow **Radar ambassadrices**.
2. Clique **Execute workflow** (en bas).
3. Vérifie que le node Notion remonte des fiches, que le node Code produit un
   `subject` + `body`, et que **durandm@bellajour.com** et **lelonglg@bellajour.com**
   reçoivent le mail « 🎯 Radar Bellajour — {date} ».
   - Rappel logique : les fiches sans « 👉 Prochaine action » sont ignorées ;
     « Qui = À faire (toi) » → **✅ À FAIRE**, « Qui = À relancer (elle) » → **🔔 À RELANCER**,
     triées par « Dernière action le » (plus ancien en haut). Liste vide → « Rien aujourd'hui ✨ ».
4. Si OK → **Active** le workflow (toggle en haut à droite). Il tournera tous les
   jours à **08:00 (Europe/Lisbon)**.

### Sync
1. Assure-toi que la migration `notion_synced` est bien passée (étape 0).
2. Ouvre le workflow **Sync Supabase → Notion**.
3. Clique **Execute workflow**.
   - Le node Supabase récupère les lignes `notion_synced = false`.
   - Le node **Filter** ne garde que `is_ambassadeur = true` OU `offer_type = 'influencer'`.
   - Le node Notion crée la fiche, puis Supabase repasse `notion_synced = true`.
4. Vérifie dans Notion que les nouvelles fiches apparaissent (Compte Instagram = prénom,
   Prénom, Email, Code promo, Type, Statut = *Vient de rejoindre*).
5. **Relance** *Execute workflow* une 2e fois : **aucune fiche ne doit être recréée**
   (c'est l'anti-doublon via `notion_synced`). Si c'est bon → **Active** le workflow.

> Ordre conseillé : active **le Radar d'abord**, teste, puis active **le Sync**.

---

## 4. Notes de conception

- **Idempotence du Sync** : reposée à 100 % sur `notion_synced`. Une ligne déjà
  copiée (`notion_synced = true`) est exclue par le filtre Supabase → jamais de doublon.
- **Filtre en deux temps** : le node Supabase filtre `notion_synced = false` (garde-fou
  d'idempotence) et le node **Filter** applique le `OR` (ambassadrice / influenceuse),
  car le node Supabase gère mal un OR. Résultat identique à
  `(is_ambassadeur = true OR offer_type = 'influencer') AND notion_synced IS NOT TRUE`.
- **Formule Notion** : le tri/filtre sur « 👉 Prochaine action » se fait dans le **Code node**
  (les champs formule sont peu fiables côté node Notion).
- **Aucun secret en dur** : les credentials sont référencés par nom, jamais recréés.

---

## 5. Fallback — build manuel node par node (si un JSON n'importe pas)

Les versions de nodes peuvent différer d'une instance à l'autre. Si un import
échoue, recrée le workflow à la main avec ces réglages.

### Radar ambassadrices
1. **Schedule Trigger** — *Trigger Interval* = **Days**, *Days Between Triggers* = 1,
   *Trigger at Hour* = **8**, minute 0. (Workflow *Settings → Timezone* = **Europe/Lisbon**.)
2. **Notion** — *Resource* = **Database Page**, *Operation* = **Get Many**,
   *Database* = ID `a1f80a0ffa6749a69af6b600cbf094b1` (CRM Influenceurs),
   *Return All* = ON, *Simplify* = ON. Credential = **Notion account**.
3. **Code** (JavaScript) — colle le contenu du champ `jsCode` du node
   « Trie actions et relances » depuis `radar-ambassadrices.json`.
   (Ignore les fiches sans « 👉 Prochaine action » ; sépare en ✅ À FAIRE / 🔔 À RELANCER
   selon « Qui » ; trie par « Dernière action le » ; sort `{ subject, body }`.)
4. **Gmail** — *Operation* = **Send** :
   - *To* : `durandm@bellajour.com, lelonglg@bellajour.com`
   - *Subject* : `={{ $json.subject }}`
   - *Email Type* : **Text**
   - *Message* : `={{ $json.body }}`
   - Credential = **Gmail account**.
5. Relie : Schedule → Notion → Code → Gmail.

### Sync Supabase → Notion
1. **Schedule Trigger** — *Trigger Interval* = **Hours**, toutes les **1** heure.
2. **Supabase** — *Operation* = **Get Rows**, *Table* = `waitlist`, *Return All* = ON,
   *Filter* : `notion_synced` **eq** `false`. Credential = **Supabase account**.
3. **Filter** — *Combinator* = **OR** :
   - `{{ $json.is_ambassadeur }}` est **true** (booléen)
   - `{{ $json.offer_type }}` **equals** `influencer`
4. **Notion** — *Resource* = **Database Page**, *Operation* = **Create**,
   *Database* = `a1f80a0ffa6749a69af6b600cbf094b1`, *Title* = `={{ $json.prenom }}`,
   puis *Properties* :
   - **Prénom** (Text) = `={{ $json.prenom }}`
   - **Email** (Email) = `={{ $json.email }}`
   - **Code promo** (Text) = `={{ $json.ref_code }}`
   - **Type** (Select) = `={{ $json.is_ambassadeur === true ? 'Ambassadeur' : 'Influenceur' }}`
   - **Statut** (Status/Select) = `Vient de rejoindre`
   Credential = **Notion account**.
5. **Supabase** — *Operation* = **Update**, *Table* = `waitlist`,
   *Filter* : `id` **eq** `={{ $('Ambassadrice ou influenceuse').item.json.id }}`,
   *Fields to Send* : `notion_synced` = `={{ true }}`. Credential = **Supabase account**.
6. Relie : Schedule → Supabase (Get) → Filter → Notion (Create) → Supabase (Update).
