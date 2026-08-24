-- ════════════════════════════════════════════════════════════════════════
-- L'ATELIER — marqueur de lecture par personne (lot 7).
--
-- À rouler par Mathias sur le projet Supabase de production.
-- Strictement additive : une table neuve, aucune table existante altérée.
--
-- POURQUOI PAS `admin_last_seen`
-- La table existante est un SINGLETON (`id = true`) : une seule date de
-- « dernière visite » pour tout le monde. Elle convenait à un tableau de bord
-- de prévente consulté par une personne. Avec deux comptes nominatifs, elle
-- se retourne contre nous : Louis ouvre /admin à 8 h, et les dossiers arrivés
-- dans la nuit cessent d'être « nouveaux » pour Mathias, qui ne les a jamais
-- vus. Le compteur du matin devient un mensonge, donc on cesse de le croire.
--
-- POURQUOI UNE LIGNE PAR DOSSIER ET PAS UNE DATE PAR PERSONNE
-- Une date de dernière visite s'avance à chaque rechargement : on regarde la
-- liste, on rafraîchit, les marques disparaissent. Ici, un dossier reste
-- nouveau tant que la personne n'a pas OUVERT sa fiche. C'est précis, ça
-- survit à un rechargement, et ça correspond au geste réel de triage : je
-- vois une demande, je l'ouvre, elle cesse d'être nouvelle.
--
-- Le coût est une ligne par (personne × dossier consulté). À raison de
-- quelques dossiers par jour et deux personnes, c'est négligeable, et la
-- table se purge sans dommage : tout redeviendrait simplement « nouveau ».
--
-- RLS activé sans policy, comme toutes les autres tables du projet : accès
-- réservé au service role.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.dossiers_vus (
  -- L'identifiant du compte ('mathias', 'louis'), pas le prénom d'affichage :
  -- il vient du cookie signé et ne change pas si on change la casse à l'écran.
  qui        text not null,
  numero_id  uuid not null references public.numeros(id) on delete cascade,
  vu_le      timestamptz not null default now(),
  primary key (qui, numero_id)
);

-- La question posée à chaque chargement de la liste : « qu'est-ce que CETTE
-- personne a déjà vu ». L'index de la clé primaire y répond déjà, mais
-- seulement si `qui` est en tête — ce qui est le cas ci-dessus, volontairement.

alter table public.dossiers_vus enable row level security;
