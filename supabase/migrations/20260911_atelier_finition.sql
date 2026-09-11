-- LE PELLICULAGE CHOISI PAR LE CLIENT (11/09/2026).
--
-- POURQUOI. Les références produit Cloudprinter ont été arrêtées ce jour :
-- intérieur 130 g couché silk, couverture 250 g, et un PELLICULAGE laissé au
-- client — brillant ou mat. Le relevé `prices/lookup` du même jour prouve que
-- les deux coûtent la même chose (6,6667 € contre 6,6722 € HT sur un dos carré
-- de 32 pages) : il n'y a donc rien à facturer, rien à arbitrer, et aucune
-- raison de ne pas laisser choisir.
--
-- POURQUOI UNE COLONNE, ET PAS UNE LIGNE DE JOURNAL. Le choix de COUVERTURE
-- (`couverture_choisie`) vit dans `evenements`, sans colonne, et c'est le bon
-- endroit : c'est une préférence qu'un humain lit avant de composer. Le
-- pelliculage n'est pas de cette famille — il part tel quel dans le corps
-- d'`orders/add`, en option d'item, à côté du papier. Un paramètre de commande
-- doit se lire dans le même SELECT que le reste du dossier, au moment où la
-- commande se compose (`/api/admin/atelier/transition`). Le chercher dans un
-- journal append-only au moment d'engager une impression payante serait un
-- chemin de plus à ne jamais se tromper.
--
-- ⚠️ CETTE MIGRATION DOIT ÊTRE APPLIQUÉE AVANT LE DÉPLOIEMENT, et c'est la
-- première du dépôt dont le code NE SE REPLIE PAS. Ailleurs, un UPDATE qui
-- nomme une colonne inconnue retombe sur un UPDATE sans elle (42703 en
-- lecture, PGRST204 en écriture) pour que le geste survive à la fenêtre entre
-- le déploiement et la migration. Ici le repli serait pire que la panne : le
-- client cliquerait « mate », l'écran dirait oui, et l'atelier imprimerait
-- brillant sans que personne ne le sache jamais. La route rend donc un 500
-- franc, qui se voit dans les logs et à l'écran (cf. « le revers du repli »,
-- supabase/CLAUDE.md). La LECTURE, elle, se replie : un dossier sans colonne
-- part en brillant, exactement comme avant le 11/09.
--
-- Additive et idempotente. Les dossiers existants restent à null, ce que le
-- code lit comme « brillant » (FINITION_DEFAUT, src/lib/atelier/impression.ts) :
-- c'est le défaut Cloudprinter et ce qui a été imprimé jusqu'ici, donc aucun
-- dossier ne change d'objet.

alter table public.numeros
  add column if not exists finition text null check (finition is null or finition in ('gloss', 'matte'));

comment on column public.numeros.finition is
  'Pelliculage de couverture choisi par le client : gloss (brillant) ou matte (mat). null = jamais choisi, part en gloss. Traduit en référence Cloudprinter par FINITION_OPTION (src/lib/atelier/impression.ts).';
