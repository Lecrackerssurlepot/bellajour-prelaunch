-- ════════════════════════════════════════════════════════════════════════
-- L'ATELIER — notes de l'éditeur et lien Canva de travail (lot 7B).
--
-- À rouler sur le projet Supabase de production.
-- Additive : une table neuve + une colonne NULLABLE. Rien n'est réécrit,
-- rien ne casse si la migration n'est pas encore passée (le code dégrade).
--
-- ── POURQUOI UNE TABLE DE NOTES ET PAS UN CHAMP TEXTE ──────────────────
-- Un champ unique sur `numeros`, c'est deux personnes qui s'écrasent
-- mutuellement et une histoire qu'on ne peut pas relire. Une note porte un
-- auteur et une date : « elle a écrit que le mariage était en Corse » et
-- « relancée par téléphone le 3, elle paie vendredi » sont deux faits
-- distincts, écrits par deux personnes, à deux moments.
--
-- ── POURQUOI UN SECOND LIEN CANVA ──────────────────────────────────────
-- Le PRD §11 est catégorique : la cliente reçoit un lien EN COMMENTAIRE,
-- jamais en édition — « en édition, elle casse les fonds perdus, écrase une
-- police ou insère une image en 72 dpi, et cela se découvre à la livraison ».
-- Or l'atelier travaille sur le lien d'édition. Ce sont deux liens
-- différents, et les garder dans le même champ, c'est attendre le jour où
-- l'on colle le mauvais dans le mail.
--   `canva_url`      = celui qui PART chez la cliente (existant, inchangé)
--   `canva_travail`  = le nôtre, INTERNE, jamais envoyé nulle part
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  numero_id  uuid not null references public.numeros(id) on delete cascade,
  -- L'identifiant du compte ('mathias', 'louis'), comme dossiers_vus :
  -- il vient du cookie signé, pas d'une saisie.
  qui        text not null,
  texte      text not null,
  created_at timestamptz not null default now()
);

-- La fiche lit « les notes de CE dossier, la plus récente d'abord ».
create index if not exists notes_numero_idx
  on public.notes (numero_id, created_at desc);

alter table public.notes enable row level security;

-- Le lien de travail. Nullable, sans valeur par défaut : un dossier sans
-- Canva ouvert n'a rien à déclarer.
alter table public.numeros add column if not exists canva_travail text;
