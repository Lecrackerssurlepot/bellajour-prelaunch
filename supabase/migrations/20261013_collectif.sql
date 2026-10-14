-- ════════════════════════════════════════════════════════════════════════
-- L'ÉDITION COLLECTIVE (espace pro B2B) — le socle de données, phase 0.
-- PRD : docs/produit/PRD-edition-collective.md §9. Écrite le 13/10/2026.
--
-- ⚠️ À ROULER PAR MATHIAS, ET PAR LUI SEUL. Personne d'autre n'applique une
-- migration sur la production (supabase/CLAUDE.md). Tant qu'elle n'est pas
-- passée, tout le B2B le DIT : les routes répondent 503
-- `migration_collectif_absente`, les pages affichent « Migration collectif
-- absente », et /admin/collectif nomme les tables qui manquent.
--
-- STRICTEMENT ADDITIVE. Treize tables neuves `collectif_*`, deux fonctions de
-- trigger. AUCUNE table existante n'est touchée : `numeros`, `photos`,
-- `evenements`, `mails_envoyes` restent exactement ce qu'elles sont.
--
-- POURQUOI DES TABLES À PART
-- `photos`, `evenements` et `mails_envoyes` portent une clé étrangère vers
-- `numeros(id)`. Écrire une ligne d'édition collective dedans échouerait sur
-- la contrainte. Le B2B a donc son journal, son verrou de mails et sa table
-- de photos, sur le même patron que le B2C.
--
-- POURQUOI UNE TRANSACTION
-- Tout passe ou rien ne passe. Le code ne prévoit aucun repli « table par
-- table » : une migration à moitié appliquée serait le seul état qu'il ne
-- saurait pas lire. Si une instruction échoue, rien n'est créé, et l'on
-- relance le fichier entier (il est idempotent : `if not exists` partout).
--
-- ⚠️ AUCUN CHIFFRE PAR DÉFAUT. Plafonds, tirage, tours inclus, propositions
-- de couverture, pagination : `null` tant que l'atelier ne les a pas saisis
-- (PRD §0.3, §12). Le code refuse un dépôt dont le plafond n'est pas réglé
-- plutôt que d'en inventer un.
--
-- RLS activée sans policy, comme toutes les tables du projet : accès réservé
-- au service role, aucun client Supabase dans le navigateur.
-- ════════════════════════════════════════════════════════════════════════

begin;

-- ------------------------------------------------------------ collectif_styles
-- Un univers créé par les fondateurs (PRD §1). N'appartient à aucune édition :
-- le mur d'une édition FILTRE les styles publiés par segment.
create table if not exists public.collectif_styles (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique
               check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  nom          text not null,
  description  text,
  segment      text not null default 'tous'
               check (segment in ('entreprise', 'ecole', 'tous')),
  -- [{ cle, nom, couleurs: [4 hex] }]
  palettes     jsonb not null default '[]'::jsonb,
  -- { titres, texte, echantillon }
  typos        jsonb not null default '{}'::jsonb,
  -- [{ cle, image_key, legende }]
  couvertures  jsonb not null default '[]'::jsonb,
  -- les cinq doubles pages types : [{ cle, image_key, legende }]
  doubles      jsonb not null default '[]'::jsonb,
  publie       boolean not null default false,
  -- l'ordre sur le mur, croissant
  ordre        integer not null default 0,
  created_at   timestamptz not null default now(),
  maj_le       timestamptz not null default now(),
  cree_par     text not null
);

-- ---------------------------------------------------------- collectif_editions
-- Le projet d'un client B2B. Trois liens, trois tokens au porteur (PRD §2).
create table if not exists public.collectif_editions (
  id                          uuid primary key default gen_random_uuid(),
  token_responsable           text not null unique,
  token_equipe                text not null unique,
  token_depot                 text not null unique,
  organisation                text not null,
  evenement                   text not null,
  dates_texte                 text,
  registre                    text not null
                              check (registre in ('entreprise_vous', 'ecole_tu')),
  -- L'état STOCKÉ. La clôture se calcule à la lecture (etats.ts) : une
  -- édition `preparation` dont la date est passée EST en composition.
  -- Un texte et non un enum : il évolue sans ALTER TYPE.
  etat                        text not null default 'preparation'
                              check (etat in ('preparation', 'composition', 'bat',
                                              'bat_valide', 'impression', 'expediee', 'livree')),
  etat_maj_le                 timestamptz not null default now(),
  cloture_le                  timestamptz,
  plafond_participant_atelier integer check (plafond_participant_atelier > 0),
  plafond_participant_client  integer check (plafond_participant_client > 0),
  plafond_total               integer check (plafond_total > 0),
  preselection_max            integer check (preselection_max >= 0),
  -- indicative : la pagination réelle est lue dans chaque PDF déposé
  pagination_prevue           integer check (pagination_prevue > 0),
  tirage                      integer check (tirage > 0),
  tours_inclus                integer check (tours_inclus >= 1),
  nb_propositions_couverture  integer check (nb_propositions_couverture >= 1),
  couvertures_aimees_max      integer check (couvertures_aimees_max >= 0),
  styles_segment              text not null default 'tous'
                              check (styles_segment in ('entreprise', 'ecole', 'tous')),
  -- ["logo", "programme", "mot", "liste", "rubrique"] : ce qu'on demande au client
  contenus_demandes           jsonb not null default '[]'::jsonb,
  -- la phrase d'invitation du lien participants, réglée par l'atelier (PRD §0.5)
  invitation_texte            text,
  responsable_email           text not null,
  responsable_nom             text,
  -- la page de rendez-vous Google, ouverte dans un nouvel onglet (PRD §0.5)
  rdv_url                     text,
  -- { adresse, transporteur, code, url, expediee_le, livree_le }
  livraison                   jsonb not null default '{}'::jsonb,
  -- phase 7 : édition de démonstration (photos et notes fictives, hors chiffres)
  demo                        boolean not null default false,
  -- un MARQUEUR, pas un état (patron de numeros.archive_le)
  archive_le                  timestamptz,
  photos_supprimees_le        timestamptz,
  created_at                  timestamptz not null default now(),
  cree_par                    text not null,

  -- Même forme que numeros.token (24 octets en base64url, tokenForme.ts) :
  -- le code filtre la forme avant toute requête, la base le garantit.
  constraint collectif_editions_tokens_forme check (
    token_responsable ~ '^[A-Za-z0-9_-]{32}$'
    and token_equipe ~ '^[A-Za-z0-9_-]{32}$'
    and token_depot ~ '^[A-Za-z0-9_-]{32}$'
  ),
  constraint collectif_editions_tokens_distincts check (
    token_responsable <> token_equipe
    and token_responsable <> token_depot
    and token_equipe <> token_depot
  ),
  -- Le curseur du responsable ne dépasse jamais le plafond de l'atelier, et
  -- n'existe pas sans lui. Quand l'atelier baisse le sien, le code ramène le
  -- curseur dans la même écriture (plafonds.ts, reglerPlafondAtelier).
  constraint collectif_editions_plafond_client check (
    plafond_participant_client is null
    or (plafond_participant_atelier is not null
        and plafond_participant_client <= plafond_participant_atelier)
  )
);

create index if not exists collectif_editions_actives_idx
  on public.collectif_editions (created_at desc)
  where archive_le is null;

-- --------------------------------------------------------- collectif_magazines
-- Un livre de l'édition, avec son brief (PRD §1, §9.2).
create table if not exists public.collectif_magazines (
  id                          uuid primary key default gen_random_uuid(),
  edition_id                  uuid not null references public.collectif_editions(id) on delete cascade,
  rang                        integer not null check (rang >= 1),
  nom                         text not null,
  -- le brief : un style, une palette, 1 à 5 doubles pages, la part de texte,
  -- les couvertures aimées (de n'importe quel style)
  style_id                    uuid references public.collectif_styles(id) on delete restrict,
  palette_cle                 text,
  doubles                     text[] not null default '{}',
  texte                       text,
  -- [{ style_id, couverture }]
  couvertures_aimees          jsonb not null default '[]'::jsonb,
  brief_valide_le             timestamptz,
  -- La couverture choisie dans le panneau du BAT. Écart avec le PRD §9.2
  -- (un texte « id ou sans ») : une vraie clé étrangère, posée plus bas une
  -- fois collectif_couvertures créée, plus un booléen pour « Sans préférence ».
  couverture_choisie_id       uuid,
  couverture_sans_preference  boolean not null default false,
  couverture_note             text,
  bat_valide_le               timestamptz,
  bat_valide_par              text,
  created_at                  timestamptz not null default now(),

  constraint collectif_magazines_rang_unique unique (edition_id, rang),
  constraint collectif_magazines_un_choix check (
    not (couverture_sans_preference and couverture_choisie_id is not null)
  )
);

-- ------------------------------------------------------ collectif_provenances
-- Une provenance NOMMÉE : un lien de dépôt sans plafond par personne pour le
-- photographe, par exemple (`/depot/<token_depot>?p=<cle>`, PRD §5.2).
-- ⚠️ La clé lève le plafond : elle est ALÉATOIRE (22 caractères au moins,
-- 128 bits), jamais un mot qu'un participant devinerait.
create table if not exists public.collectif_provenances (
  id            uuid primary key default gen_random_uuid(),
  edition_id    uuid not null references public.collectif_editions(id) on delete cascade,
  cle           text not null unique check (cle ~ '^[A-Za-z0-9_-]{22,64}$'),
  type          text not null check (type in ('organisateur', 'photographe', 'participant', 'autre')),
  libelle       text,
  sans_plafond  boolean not null default false,
  created_at    timestamptz not null default now(),
  cree_par      text not null
);

create index if not exists collectif_provenances_edition_idx
  on public.collectif_provenances (edition_id);

-- ------------------------------------------------------------ collectif_photos
-- Une ligne par photo, sur le modèle de `photos` (B2C). Volumes visés : 1 000
-- à 2 000 par édition (PRD §5.3).
create table if not exists public.collectif_photos (
  id                uuid primary key default gen_random_uuid(),
  edition_id        uuid not null references public.collectif_editions(id) on delete cascade,
  r2_key            text not null unique,
  vignette_key      text,
  -- nom|taille|date de modification, calculé par le navigateur. C'est ce qui
  -- rend une REPRISE sans doublon : re-sélectionner le même dossier après une
  -- coupure retrouve la ligne au lieu d'en créer une seconde. Le pHash, lui,
  -- se calcule après l'arrivée : il SIGNALE les doublons, il n'écarte rien.
  cle_fichier       text not null,
  nom_origine       text,
  mime              text,
  -- null = déclarée, pas encore arrivée sur R2 (même convention que photos)
  taille            bigint check (taille is null or taille > 0),
  ordre             integer,
  provenance_id     uuid references public.collectif_provenances(id) on delete set null,
  provenance_type   text not null check (provenance_type in ('organisateur', 'photographe', 'participant', 'autre')),
  -- qui a déposé, au sens des droits : c'est ce qui décide du plafond
  role_deposant     text not null check (role_deposant in ('atelier', 'responsable', 'participant')),
  -- le nom saisi (« Camille »), ou le libellé de la provenance
  deposant          text,
  -- l'identifiant aléatoire du cookie httpOnly : le plafond PAR APPAREIL
  appareil_id       text,
  confirmee_le      timestamptz,
  -- ce que la photo sait d'elle-même : les noms EXACTS de photos (20260921)
  largeur           integer,
  hauteur           integer,
  prise_le          timestamp without time zone,
  appareil          text,
  gps_lat           double precision,
  gps_lon           double precision,
  empreinte         text,
  luminance         real,
  metadonnees_le    timestamptz,
  lieu_ville        text,
  lieu_pays         text,
  lieu_code_pays    text,
  lieu_le           timestamptz,
  preselection      boolean not null default false,
  signalee          boolean not null default false,
  signalement_motif text,
  created_at        timestamptz not null default now(),

  constraint collectif_photos_fichier_unique unique (edition_id, cle_fichier)
);

create index if not exists collectif_photos_edition_idx
  on public.collectif_photos (edition_id, created_at);
create index if not exists collectif_photos_appareil_idx
  on public.collectif_photos (edition_id, appareil_id);
create index if not exists collectif_photos_provenance_idx
  on public.collectif_photos (edition_id, provenance_id);
create index if not exists collectif_photos_metadonnees_idx
  on public.collectif_photos (metadonnees_le) where metadonnees_le is null;

-- ---------------------------------------------------------- collectif_contenus
-- Ce que le client envoie à l'atelier : un fichier (logo, programme, liste) ou
-- des réponses (le mot du dirigeant, par questionnaire).
create table if not exists public.collectif_contenus (
  id           uuid primary key default gen_random_uuid(),
  edition_id   uuid not null references public.collectif_editions(id) on delete cascade,
  type         text not null check (type in ('logo', 'programme', 'mot', 'liste', 'rubrique')),
  r2_key       text,
  nom_origine  text,
  reponses     jsonb,
  recu_le      timestamptz not null default now(),
  depose_par   text,

  constraint collectif_contenus_quelque_chose check (r2_key is not null or reponses is not null)
);

create index if not exists collectif_contenus_edition_idx
  on public.collectif_contenus (edition_id, recu_le desc);

-- ------------------------------------------------------------ collectif_tours
-- Une version du BAT d'un magazine. FIGÉE à sa publication (trigger plus bas).
create table if not exists public.collectif_tours (
  id                uuid primary key default gen_random_uuid(),
  magazine_id       uuid not null references public.collectif_magazines(id) on delete cascade,
  numero            integer not null check (numero >= 1),
  -- le PDF d'Affinity, au coffre, JAMAIS servi au client
  pdf_key           text,
  nb_pages          integer check (nb_pages > 0),
  -- [{ index, image_key, empreinte, apparie_a, zones: [{ x, y, l, h }] }]
  pages             jsonb not null default '[]'::jsonb,
  echeance_retours  timestamptz,
  publie_le         timestamptz,
  publie_par        text,
  created_at        timestamptz not null default now(),
  cree_par          text not null,

  constraint collectif_tours_numero_unique unique (magazine_id, numero),
  constraint collectif_tours_publie_complet check (
    publie_le is null or (pdf_key is not null and nb_pages is not null)
  )
);

-- ------------------------------------------------------- collectif_couvertures
-- Les propositions livrées avec le tour 1, chacune avec sa 2e et sa 3e.
create table if not exists public.collectif_couvertures (
  id              uuid primary key default gen_random_uuid(),
  tour_id         uuid not null references public.collectif_tours(id) on delete cascade,
  rang            integer not null check (rang >= 1),
  image_key       text not null,
  interieur2_key  text,
  interieur3_key  text,
  legende         text,
  created_at      timestamptz not null default now(),

  constraint collectif_couvertures_rang_unique unique (tour_id, rang)
);

-- La clé étrangère du choix de couverture, maintenant que la table existe.
-- `do` + pg_constraint : `add constraint` n'a pas de `if not exists`.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'collectif_magazines_couverture_fk'
  ) then
    alter table public.collectif_magazines
      add constraint collectif_magazines_couverture_fk
      foreign key (couverture_choisie_id)
      references public.collectif_couvertures(id) on delete set null;
  end if;
end $$;

-- ------------------------------------------------------------ collectif_notes
-- Une remarque sur une page d'un tour (ou générale), typée. Le type est un
-- TEXTE LIBRE : la liste est extensible côté code (TYPES_NOTE, types.ts).
create table if not exists public.collectif_notes (
  id               uuid primary key default gen_random_uuid(),
  tour_id          uuid not null references public.collectif_tours(id) on delete cascade,
  -- null = note générale, sans position
  page_index       integer check (page_index >= 0),
  x_pct            numeric(5,2) check (x_pct >= 0 and x_pct <= 100),
  y_pct            numeric(5,2) check (y_pct >= 0 and y_pct <= 100),
  type             text not null,
  contenu          jsonb not null default '{}'::jsonb,
  -- brouillon tant que null ; « Envoyer mes notes » pose la date en lot
  envoyee_le       timestamptz,
  resolue_le       timestamptz,
  reponse_atelier  text,
  reponse_le       timestamptz,
  -- un brouillon retiré reste en base : rien ne s'efface
  retiree_le       timestamptz,
  created_at       timestamptz not null default now(),
  maj_le           timestamptz not null default now(),

  constraint collectif_notes_position check (
    page_index is not null or (x_pct is null and y_pct is null)
  )
);

create index if not exists collectif_notes_tour_idx
  on public.collectif_notes (tour_id, created_at);

-- --------------------------------------------------------- collectif_messages
-- La messagerie client ↔ atelier (PRD §7). Interrogée toutes les 3 à 4 s
-- quand l'onglet est visible : l'index sert ce balayage.
create table if not exists public.collectif_messages (
  id             uuid primary key default gen_random_uuid(),
  edition_id     uuid not null references public.collectif_editions(id) on delete cascade,
  auteur         text not null check (auteur in ('client', 'atelier')),
  qui            text,
  texte          text not null check (length(btrim(texte)) > 0),
  created_at     timestamptz not null default now(),
  lu_client_le   timestamptz,
  lu_atelier_le  timestamptz
);

create index if not exists collectif_messages_edition_idx
  on public.collectif_messages (edition_id, created_at);

-- -------------------------------------------------------- collectif_documents
-- Ce que l'atelier pose dans « Votre dossier » : devis signé, factures,
-- proposition complémentaire…
create table if not exists public.collectif_documents (
  id            uuid primary key default gen_random_uuid(),
  edition_id    uuid not null references public.collectif_editions(id) on delete cascade,
  type          text not null,
  libelle       text not null,
  r2_key        text,
  statut_texte  text,
  created_at    timestamptz not null default now(),
  cree_par      text
);

create index if not exists collectif_documents_edition_idx
  on public.collectif_documents (edition_id, created_at desc);

-- ------------------------------------------------------- collectif_evenements
-- Le journal, append-only. TOUTE écriture y laisse une ligne (règle du dépôt).
-- Écart avec le PRD §9.2 : `edition_id` peut être null et `style_id` existe,
-- parce que l'éditeur de styles journalise aussi, et qu'un style n'appartient
-- à aucune édition.
create table if not exists public.collectif_evenements (
  id          uuid primary key default gen_random_uuid(),
  edition_id  uuid references public.collectif_editions(id) on delete cascade,
  style_id    uuid references public.collectif_styles(id) on delete cascade,
  type        text not null,
  payload     jsonb not null default '{}'::jsonb,
  qui         text,
  created_at  timestamptz not null default now(),

  constraint collectif_evenements_sujet check (edition_id is not null or style_id is not null)
);

create index if not exists collectif_evenements_edition_idx
  on public.collectif_evenements (edition_id, created_at desc);
create index if not exists collectif_evenements_style_idx
  on public.collectif_evenements (style_id, created_at desc);

-- ------------------------------------------------------------ collectif_mails
-- Le verrou anti-doublon des mails E1… / A1… (PRD §11, phase 7). Créé dès
-- maintenant pour que la phase 7 n'ait rien à migrer. Même mécanique que
-- mails_envoyes : l'insertion EST le verrou, posée AVANT l'appel Brevo, et
-- retirée si Brevo refuse. Un mail qui doit pouvoir repartir (E8 regroupé)
-- porte son rang dans le code.
create table if not exists public.collectif_mails (
  id           uuid primary key default gen_random_uuid(),
  edition_id   uuid not null references public.collectif_editions(id) on delete cascade,
  code         text not null,
  template_id  integer,
  envoye_le    timestamptz not null default now(),

  constraint collectif_mails_verrou unique (edition_id, code)
);

-- ════════════════════════════════════════════════════════════════════════
-- UN TOUR PUBLIÉ EST FIGÉ (PRD §6.1, §10).
-- « Un PDF déposé ne peut jamais écraser un tour publié » : la route le
-- refuse, et la base aussi, pour le jour où une route l'oublierait.
-- Reste modifiable après publication : l'échéance des retours (l'atelier
-- peut accorder quelques jours). Tout le reste est gelé, et `publie_le` ne
-- revient jamais à null.
-- ⚠️ Conséquence voulue : une édition qui a un tour publié ne se supprime
-- pas (la cascade heurte ce trigger). On l'ARCHIVE.
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.collectif_tour_fige()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.publie_le is not null then
      raise exception 'collectif_tour_fige : le tour % est publié, il ne se supprime pas', old.id;
    end if;
    return old;
  end if;

  if old.publie_le is not null and (
       new.publie_le is distinct from old.publie_le
    or new.pdf_key is distinct from old.pdf_key
    or new.pages is distinct from old.pages
    or new.nb_pages is distinct from old.nb_pages
    or new.numero is distinct from old.numero
    or new.magazine_id is distinct from old.magazine_id
    or new.publie_par is distinct from old.publie_par
  ) then
    raise exception 'collectif_tour_fige : le tour % est publié, un nouveau PDF fait un nouveau tour', old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists collectif_tours_fige on public.collectif_tours;
create trigger collectif_tours_fige
  before update or delete on public.collectif_tours
  for each row execute function public.collectif_tour_fige();

-- Les propositions de couverture d'un tour publié sont figées avec lui.
create or replace function public.collectif_couverture_figee()
returns trigger
language plpgsql
as $$
declare
  publie timestamptz;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select t.publie_le into publie from public.collectif_tours t where t.id = old.tour_id;
    if publie is not null then
      raise exception 'collectif_couverture_figee : le tour % est publié, ses couvertures sont figées', old.tour_id;
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select t.publie_le into publie from public.collectif_tours t where t.id = new.tour_id;
    if publie is not null then
      raise exception 'collectif_couverture_figee : le tour % est publié, ses couvertures sont figées', new.tour_id;
    end if;
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists collectif_couvertures_figees on public.collectif_couvertures;
create trigger collectif_couvertures_figees
  before insert or update or delete on public.collectif_couvertures
  for each row execute function public.collectif_couverture_figee();

-- ════════════════════════════════════════════════════════════════════════
-- RLS : activée partout, aucune policy. Seule la service key lit et écrit.
-- ════════════════════════════════════════════════════════════════════════
alter table public.collectif_styles      enable row level security;
alter table public.collectif_editions    enable row level security;
alter table public.collectif_magazines   enable row level security;
alter table public.collectif_provenances enable row level security;
alter table public.collectif_photos      enable row level security;
alter table public.collectif_contenus    enable row level security;
alter table public.collectif_tours       enable row level security;
alter table public.collectif_couvertures enable row level security;
alter table public.collectif_notes       enable row level security;
alter table public.collectif_messages    enable row level security;
alter table public.collectif_documents   enable row level security;
alter table public.collectif_evenements  enable row level security;
alter table public.collectif_mails       enable row level security;

comment on table public.collectif_editions is
  'Édition collective (B2B) : le projet d''un client. Trois tokens au porteur. PRD-edition-collective §9.1.';
comment on table public.collectif_photos is
  'Photos d''une édition collective. cle_fichier = reprise sans doublon ; empreinte = remarque, jamais exclusion.';
comment on table public.collectif_tours is
  'Tours de BAT. Figés à la publication (trigger collectif_tours_fige).';
comment on table public.collectif_evenements is
  'Journal append-only de l''Édition collective (éditions et styles).';
comment on table public.collectif_mails is
  'Verrou anti-doublon des mails de l''Édition collective (phase 7).';

commit;
