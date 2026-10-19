-- ════════════════════════════════════════════════════════════════════════════
-- Édition collective : l'accord du participant, enregistré avec chaque photo
-- (T-184, 19/10/2026).
-- ÉCRITE PAR CLAUDE CODE, APPLIQUÉE PAR MATHIAS (jamais d'ici).
--
-- Avant elle, la case d'accord de la page de dépôt ne faisait que débloquer le
-- bouton : rien ne prouvait, après coup, qu'un participant avait accepté le
-- texte choisi par Mathias le 17/10 (PR #245), qui engage sur le droit à
-- l'image des personnes photographiées.
--
-- Deux COLONNES sur `collectif_photos`, écrites dans la MÊME insertion que la
-- photo (route `api/collectif/depot/presign`) : la preuve voyage avec la photo,
-- sans jointure sur un cookie, et une photo de participant ne peut pas exister
-- sans elle. Le texte de chaque version vit dans `src/lib/collectif/accord.ts`
-- (`TEXTES_ACCORD`) ; une version ne se retire jamais.
--
-- Nulles pour le responsable et l'atelier (ils ne cochent rien) et pour les
-- photos déposées avant cette migration. Aucune valeur par défaut : on
-- n'invente pas un accord.
--
-- Atomique (begin / commit) et idempotente (`if not exists`) : la rejouer ne
-- change rien. Tant qu'elle n'est pas passée, la route refuse DÉJÀ un dépôt
-- sans accord, mais l'insertion se replie sans ces colonnes (`colonneAbsente`)
-- et le serveur le note : l'accord n'est alors pas enregistré.
--
-- Vérifier après l'avoir appliquée (lecture seule) :
--   select column_name, data_type from information_schema.columns
--    where table_name = 'collectif_photos' and column_name like 'accord_%';
-- puis, après un premier vrai dépôt de participant :
--   select accord_version, accord_le, created_at from public.collectif_photos
--    where role_deposant = 'participant' order by created_at desc limit 5;
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- La version du texte accepté (« 2026-10-17 »), envoyée par la page et
-- reconnue par le serveur.
alter table public.collectif_photos
  add column if not exists accord_version text;

-- L'heure du SERVEUR au moment de la déclaration (celle du navigateur ne
-- prouve rien).
alter table public.collectif_photos
  add column if not exists accord_le timestamptz;

comment on column public.collectif_photos.accord_version is
  'Version du texte d''accord accepté par le participant (src/lib/collectif/accord.ts). Nulle : responsable, atelier, ou photo d''avant T-184.';
comment on column public.collectif_photos.accord_le is
  'Heure du serveur à la déclaration de la photo, accord coché.';

-- PostgREST relit le schéma : sans cela, les nouvelles colonnes répondent
-- PGRST204 jusqu'au prochain rechargement.
notify pgrst, 'reload schema';

commit;
