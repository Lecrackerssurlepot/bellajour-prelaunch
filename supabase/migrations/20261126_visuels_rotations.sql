-- 20261126_visuels_rotations.sql : les visuels datés du site, réglés depuis l'admin (Site · Visuels).
--
-- ADDITIVE : une table neuve et un panier de stockage public neuf. Aucune table existante n'est touchée.
-- Accord explicite de Mathias le 26/11/2026 (« Un, tu as mon accord »), appliquée via le MCP Supabase.
--
-- Le code (src/content/media.ts) garde la LISTE des emplacements et leur visuel par défaut ; cette table
-- ne porte que les ROTATIONS ajoutées depuis l'admin. Sans elle, le site montre les défauts (repli, rien
-- ne casse) et l'admin répond 503 `migration_visuels_absente`.
--
-- Vérification après application :
--   select count(*) from public.visuels_rotations;                                  -- 0, sans erreur
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'visuels-site';
--   select relrowsecurity from pg_class where relname = 'visuels_rotations';        -- true

create table if not exists public.visuels_rotations (
  id uuid primary key default gen_random_uuid(),
  -- Le nom de l'emplacement (« accueil.hero »). Pas de check : la liste vit dans le code,
  -- et un emplacement ajouté ne doit pas demander de migration. La route le relit contre MEDIA.
  emplacement text not null,
  du date not null,
  au date not null,
  -- true : l'emplacement ne montre RIEN sur la période (un fond présent certains jours seulement).
  vide boolean not null default false,
  -- L'adresse publique de l'image (ou du poster d'une vidéo). Nulle seulement pour une rotation vide.
  fichier text,
  alt text not null default '',
  video_mp4 text,
  video_webm text,
  -- Seule une rotation validée passe en ligne ; un brouillon ne se voit que dans l'aperçu de l'admin.
  valide boolean not null default false,
  -- Départage de deux rotations qui se chevauchent : la plus petite gagne, puis la plus récente.
  ordre integer not null default 0,
  cree_le timestamptz not null default now(),
  cree_par text,
  modifie_le timestamptz not null default now(),
  modifie_par text,
  constraint visuels_rotations_periode check (du <= au),
  constraint visuels_rotations_contenu check (vide or fichier is not null),
  constraint visuels_rotations_video check (video_webm is null or video_mp4 is not null)
);

create index if not exists visuels_rotations_emplacement on public.visuels_rotations (emplacement, du);

-- RLS sans policy : seule la service key (côté serveur) lit et écrit, comme le reste de la base.
alter table public.visuels_rotations enable row level security;

-- Le panier des images du site : PUBLIC (ce sont des visuels de vitrine, jamais une photo de client).
-- Le dépôt passe par une URL d'envoi signée fabriquée côté serveur après vérification du cookie admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'visuels-site',
  'visuels-site',
  true,
  52428800,
  array['image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'video/webm']
)
on conflict (id) do nothing;
