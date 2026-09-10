-- Le PRIX GELÉ sur le dossier (10/09/2026, chantier « grille par pages », lot 1).
--
-- POURQUOI. Aujourd'hui le montant débité se recalcule à chaque lecture,
-- depuis `palier` et la grille en dur (src/lib/atelier/grille.ts). Tant que la
-- grille ne bouge pas, personne ne le voit. Le jour où elle bouge, TOUS les
-- dossiers déjà chiffrés changent de prix rétroactivement : la page d'état 2
-- affiche un montant, le mail M3 en annonce un autre, Stripe en débite un
-- troisième. Le prix ANNONCÉ doit être le prix DÉBITÉ, sur ce dossier-là,
-- pour toujours. C'est ce que `prix_centimes` fige, au moment exact où
-- l'atelier publie l'aperçu — le premier instant où une cliente voit un
-- montant.
--
-- `livraison_centimes`, `pays_livraison` et `livraison_niveau` sont posées MAINTENANT et restent
-- vides : la livraison facturée en sus est décidée mais son tarif ne l'est pas
-- (interdit nº5, on n'invente jamais un montant). Les colonnes existent pour
-- que les lots suivants n'aient pas à refaire une migration, et parce que les
-- deux replis ci-dessous se paient une seule fois.
--
-- ⚠️ LA RÈGLE DES DEUX CODES. Mathias applique les migrations lui-même : le
-- code doit marcher AVANT et APRÈS celle-ci. Or PostgREST ne répond pas la
-- même chose des deux côtés (prouvé en prod le 03/09/2026) :
--   — un SELECT qui nomme une colonne inconnue rend `42703` ;
--   — un INSERT/UPDATE qui la nomme rend `PGRST204`.
-- Un repli borné à l'un des deux ne se déclenche jamais. Les lecteurs
-- (mails.ts, donnees.ts, /numero, /compte, métriques) attrapent 42703 ; la
-- route de transition attrape LES DEUX et CRIE ce qu'elle a perdu.
-- ⚠️ Et le revers, qui a déjà mordu : un repli fait disparaître le champ EN
-- SILENCE. Une fois cette migration passée, vérifier que `prix_centimes` se
-- remplit vraiment sur une publication d'aperçu — pas seulement que l'écran
-- s'affiche.
--
-- Additive et idempotente : aucune colonne existante n'est touchée, aucun
-- comportement ne change tant que le code ne lit pas les nouvelles colonnes.

alter table public.numeros
  add column if not exists prix_centimes      integer null check (prix_centimes is null or prix_centimes > 0),
  add column if not exists livraison_centimes integer null check (livraison_centimes is null or livraison_centimes >= 0),
  add column if not exists pays_livraison     text    null check (pays_livraison is null or pays_livraison ~ '^[A-Z]{2}$'),
  -- Le niveau d'expédition Cloudprinter retenu AU DEVIS (cp_ground, cp_saver…).
  -- Un vrai devis du 10/09 l'a montré : le niveau offert varie selon le pays et
  -- le produit (`cp_saver` n'était pas proposé pour la France). La commande
  -- doit partir avec exactement le niveau qui a été chiffré, pas une constante.
  add column if not exists livraison_niveau   text    null check (livraison_niveau is null or livraison_niveau ~ '^[a-z_]{2,32}$');

-- Backfill : ce qui a été ANNONCÉ, pas ce que la grille dira demain.
-- Grille close du 24/08 au 10/09/2026 : p30 = 30 €, p40 = 40 €, p45 = 45 €.
-- UNIQUEMENT les dossiers dont le prix a été montré à la cliente, c'est-à-dire
-- ceux dont l'aperçu est publié ou au-delà. Les deux états d'avant
-- (`photos_recues`, `photos_insuffisantes`) n'ont jamais rien affiché : leur
-- prix sera gelé à la publication, à la grille en vigueur ce jour-là.
update public.numeros set prix_centimes = case palier when 'p30' then 3000 when 'p40' then 4000 when 'p45' then 4500 end
 where prix_centimes is null and palier is not null and etat not in ('photos_recues', 'photos_insuffisantes');

-- Le pays des dossiers déjà payés : celui de l'adresse collectée par Stripe,
-- la seule que nous ayons (le questionnaire ne demande aucune adresse). Le
-- filtre sur la forme évite d'écrire un pays fantaisiste dans une colonne qui
-- porte un check.
update public.numeros set pays_livraison = upper(adresse_livraison->'address'->>'country')
 where pays_livraison is null and adresse_livraison->'address'->>'country' ~* '^[a-z]{2}$';
