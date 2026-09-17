-- LE COCKPIT DE DÉCISION (17/09/2026) : deux tables neuves et une colonne.
--
-- POURQUOI. Le cockpit répond à une seule question : « à quelle semaine faut-il
-- avoir lancé le développement pour ne pas saturer l'atelier ? ». Il lit un
-- AGRÉGAT hebdomadaire (`weekly_metrics`), jamais les commandes brutes : la
-- page ne recalcule rien, c'est le job du lundi qui écrit une ligne par
-- semaine. Les hypothèses (capacité, durée du dev, marge de sécurité, coût,
-- part réinvestie) vivent dans `cockpit_settings`, une ligne, réglée par les
-- curseurs de l'écran. Le modèle est dans src/lib/cockpit/modele.ts.
--
-- `numeros.origine` dit d'où vient la commande : `chaud` (réseau, bouche à
-- oreille, fondateurs) ou `froid` (inconnus). Posée à la main depuis la fiche
-- admin ; les dossiers de fondateurs sont reconnus chauds par le journal sans
-- qu'on ait à cliquer. Une commande sans origine n'est comptée NI chaude NI
-- froide : elle est comptée à part, et le cockpit le dit.
--
-- ⚠️ LA RÈGLE DES DEUX CODES (cf. 20260910). Mathias applique lui-même : le
-- code doit marcher avant et après. Lecture d'une table absente : PGRST205 ;
-- lecture d'une colonne absente : 42703 ; écriture : PGRST204. Les lecteurs
-- (job, page, fiche) se replient ; les écritures répondent 503 en nommant
-- cette migration.
--
-- Additive et idempotente : aucune colonne existante n'est touchée.

-- ------------------------------------------------------------ weekly_metrics
-- Une ligne par semaine ISO, du lundi 00:00 (heure de Paris) au lundi suivant.
-- `semaine` = AAAASS (202638 = 38e semaine ISO de 2026) : unique, triable,
-- lisible. `date_debut` est le lundi.
create table if not exists public.weekly_metrics (
  semaine                 integer primary key,
  date_debut              date not null unique,
  -- les commandes = les dossiers passés à `payee` dans la semaine (journal
  -- `etat_change`, écrit par le webhook Stripe). Un fondateur dont le crédit
  -- couvre tout le prix est une commande aussi.
  commandes_totales       integer not null default 0 check (commandes_totales >= 0),
  commandes_froides       integer not null default 0 check (commandes_froides >= 0),
  commandes_chaudes       integer not null default 0 check (commandes_chaudes >= 0),
  -- ni chaud ni froid : origine jamais posée. Compté à part, jamais deviné.
  commandes_sans_origine  integer not null default 0 check (commandes_sans_origine >= 0),
  -- pagination moyenne des commandes de la semaine (nb_pages), null sans commande
  pages_moy               numeric(6, 2) null,
  -- marge moyenne par commande, en euros. NULL TANT QU'AUCUN COÛT D'IMPRESSION
  -- PAR COMMANDE N'EST ENREGISTRÉ (le devis Cloudprinter journalisé ne porte
  -- que le port). Le cockpit lit alors `cockpit_settings.marge_defaut`.
  marge_moy               numeric(8, 2) null,
  -- délai moyen dépôt terminé → livré, en jours, sur les dossiers LIVRÉS dans
  -- la semaine (une commande de la semaine n'est pas encore livrée).
  delai_moy_jours         numeric(6, 2) null,
  calcule_le              timestamptz not null default now()
);

alter table public.weekly_metrics enable row level security;

comment on table public.weekly_metrics is
  'Agrégat hebdomadaire du cockpit (src/lib/cockpit/job.ts). Une ligne par semaine ISO, réécrite à chaque passage du job : idempotent.';

-- ---------------------------------------------------------- cockpit_settings
-- SINGLETON, même patron que admin_last_seen. Les valeurs par défaut sont des
-- POINTS DE DÉPART pour les curseurs, pas des chiffres du produit : tant que
-- `regle_le` est null, l'écran dit que rien n'a été réglé.
create table if not exists public.cockpit_settings (
  id              boolean primary key default true,
  -- commandes froides par semaine que l'atelier absorbe sans le dev
  capacite        integer not null default 10 check (capacite between 1 and 1000),
  -- durée du développement, en semaines
  t_dev           integer not null default 8 check (t_dev between 0 and 104),
  -- marge de sécurité, en semaines
  buffer          integer not null default 2 check (buffer between 0 and 52),
  -- coût du développement, en euros
  cout_dev        integer not null default 10000 check (cout_dev >= 0),
  -- part de la marge réinvestie dans le dev, en %
  reinvesti_pct   integer not null default 50 check (reinvesti_pct between 0 and 100),
  -- marge par commande retenue quand weekly_metrics.marge_moy est null, en euros
  marge_defaut    numeric(8, 2) not null default 20 check (marge_defaut >= 0),
  -- volume mensuel retenu pour la capacité de financement
  volume_mensuel  integer not null default 20 check (volume_mensuel >= 0),
  regle_le        timestamptz null,
  regle_par       text null,
  constraint cockpit_settings_singleton check (id = true)
);

insert into public.cockpit_settings (id) values (true)
  on conflict (id) do nothing;

alter table public.cockpit_settings enable row level security;

-- ------------------------------------------------------------ numeros.origine
alter table public.numeros
  add column if not exists origine text null
    check (origine is null or origine in ('chaud', 'froid'));

comment on column public.numeros.origine is
  'D''où vient la commande : chaud (réseau, fondateurs, bouche à oreille) ou froid (inconnus). Posée depuis la fiche admin ; null = jamais renseignée, comptée à part par le cockpit.';
