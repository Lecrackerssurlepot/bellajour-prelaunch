-- LE PRIX HORS TAXES GELÉ ET LE NOMBRE D'EXEMPLAIRES (16/09/2026).
--
-- POURQUOI DEUX COLONNES. Le 15/09, Mathias a livré le modèle de prix v3 :
-- la grille est HORS TAXES, et ce qu'un client paie est HT × (1 + TVA du pays
-- de livraison), arrondi à l'euro. Le prix TTC gelé (`prix_centimes`, 20260910)
-- reste ce qu'on lit et ce que Stripe débite ; mais quand le client change de
-- pays sur son bon de commande, le TTC doit se RECALCULER depuis un HT qui, lui,
-- ne bouge pas avec la grille. D'où `prix_ht_centimes` : le HT promis, gelé à
-- la publication de l'aperçu, source de tout recalcul.
--
-- Et le même jour, T-073 est levé : un client peut commander de 1 à 10
-- exemplaires du même numéro (le 2e à −30 %, les suivants à −50 %). La
-- quantité est un paramètre de COMMANDE, comme la finition (20260911) : elle
-- part dans `count` chez Cloudprinter et dans les lignes Stripe. Elle se lit
-- dans le même SELECT que le reste du dossier, pas dans le journal.
--
-- ⚠️ CETTE MIGRATION DOIT ÊTRE APPLIQUÉE AVANT LE DÉPLOIEMENT, comme
-- 20260911. L'ÉCRITURE de `quantite` NE SE REPLIE PAS, et c'est délibéré : un
-- repli ferait payer trois exemplaires (Stripe lit la quantité au moment du
-- checkout) et en imprimer un seul, ou l'inverse, sans que personne ne le
-- sache. La route rend un 500 franc qui nomme la migration dans les logs. La
-- LECTURE, elle, se replie partout : sans les colonnes, un dossier vaut un
-- exemplaire et son TTC gelé, exactement comme avant.
--
-- Additive et idempotente. Les dossiers existants gardent leur TTC gelé
-- (`prix_ht_centimes` à null : le code lit `prix_centimes` d'abord) et passent
-- à un exemplaire.

alter table public.numeros
  add column if not exists prix_ht_centimes integer null
    check (prix_ht_centimes is null or prix_ht_centimes > 0),
  add column if not exists quantite integer not null default 1
    check (quantite between 1 and 10);

comment on column public.numeros.prix_ht_centimes is
  'Prix HORS TAXES d''un exemplaire, gelé à la publication de l''aperçu (grille du 15/09/2026). Le TTC (prix_centimes) s''en déduit au taux du pays de livraison, arrondi à l''euro (src/lib/atelier/grille.ts, ttcDepuisHtArrondi). null = dossier d''avant le gel HT : prix_centimes fait foi.';

comment on column public.numeros.quantite is
  'Nombre d''exemplaires commandés (1 à 10), choisi par le client sur son bon de commande. Le 1er plein tarif, le 2e à −30 %, les suivants à −50 % (src/lib/atelier/exemplaires.ts). Part dans count chez Cloudprinter.';
