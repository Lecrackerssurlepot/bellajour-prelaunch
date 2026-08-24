-- ════════════════════════════════════════════════════════════════════════
-- L'ATELIER — verrou d'envoi des mails M1 → M9 (PRD-ATELIER §10, lot 8).
--
-- À rouler par Mathias sur le projet Supabase de production.
--
-- Strictement additive : une table neuve, aucune table existante altérée.
--
-- POURQUOI UNE TABLE ET PAS UNE COLONNE PAR MAIL
-- Le PRD prévoit neuf mails. Neuf colonnes `mX_envoye_le` sur `numeros`, ce
-- sont neuf migrations et neuf conditions à ne pas oublier. Ici, la contrainte
-- d'unicité EST le verrou : l'insertion réussit une fois, la seconde renvoie
-- 23505 et le mail n'est pas renvoyé. Ajouter M2 ou M3b ne demandera rien.
--
-- POURQUOI PAS `evenements`
-- Le journal reste le RÉCIT du dossier et continue de recevoir une ligne
-- `mail_envoye` à chaque départ (invariant nº6). Mais il est append-only : on
-- n'y supprime rien. Or un verrou doit pouvoir sauter — le jour où une cliente
-- n'a jamais reçu son M3 et qu'il faut le relancer, on supprime SA ligne ici,
-- et l'histoire du dossier reste intacte à côté.
--
-- RLS activé sans policy, comme toutes les autres tables du projet : accès
-- réservé au service role.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.mails_envoyes (
  id          uuid primary key default gen_random_uuid(),
  numero_id   uuid not null references public.numeros(id) on delete cascade,
  -- 'M1', 'M3', 'M4'… le code du PRD §10, pas le nom du template Brevo :
  -- un template peut être remplacé, le code du mail ne bouge pas.
  code        text not null,
  -- Ce qui est REELLEMENT parti, pour retrouver le rendu exact plus tard.
  template_id integer,
  envoye_le   timestamptz not null default now()
);

-- Le verrou. Une seule ligne par (dossier, mail) — l'unicité fait le travail
-- d'un lock sans transaction explicite, y compris entre deux instances Vercel.
create unique index if not exists mails_envoyes_numero_code_idx
  on public.mails_envoyes (numero_id, code);

-- /admin (lot 7) lira « quels mails sont partis » pour un dossier.
create index if not exists mails_envoyes_numero_idx
  on public.mails_envoyes (numero_id, envoye_le desc);

alter table public.mails_envoyes enable row level security;

-- ---------------------------------------------------------------- balayage
-- La relève de M3 cherche les dossiers en état 2 (PRD §10 : « M3 · état 2 »).
-- Index partiel : il ne pèse que le temps où un dossier attend son paiement,
-- et il servira tel quel à M3b (relance J+3), qui balaie la même population.
create index if not exists numeros_apercu_pret_idx
  on public.numeros (etat_maj_le)
  where etat = 'apercu_pret';
