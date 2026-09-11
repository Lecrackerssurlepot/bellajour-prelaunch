---
id: T-111
titre: La table de travail recharge tout, tout le temps
domaine: admin
gravite: confort
autonomie: libre
ouvert: 2026-09-11
etat: nouveau
---
## Ce que j'ai vérifié
Quatre constats de lecture du code, faits le 11/09 en préparant T-109. Le premier a été corrigé
dans la foulée ; les trois autres restent.

1. ~~`chargerListe()` enchaînait cinq lectures Supabase l'une après l'autre.~~ **Fait**
   (PR #128) : les quatre lectures indépendantes partent ensemble. Seul `lireNumeros` reste
   d'abord, tout le reste dépend de ses ids.
2. **Tout est rejoué chaque minute.** `Rafraichissement.tsx` redemande la page ENTIÈRE, avec
   toutes ses lectures, même quand rien n'a bougé. Il s'arrête déjà quand l'onglet est caché —
   c'est la bonne moitié du travail. L'autre moitié serait de ne redemander que ce qui change.
3. **Une action recharge vingt lignes pour en changer une.** `ActionRapide` et `Relance`
   appellent `router.refresh()` après un succès : toute la page repart du serveur. La ligne
   pourrait se mettre à jour seule.
4. **Ouvrir un dossier reste une navigation serveur complète.** La silhouette d'attente
   (`loading.tsx`) fait très bien son travail, mais le contenu attend le serveur. C'est le seul
   point où la « piste II » (liste et dossier en deux volets, cf. le canevas du 11/09) apporte
   quelque chose que la piste I ne peut pas donner.

## La règle, et elle vaut plus que les quatre constats
⚠️ **Ne rien annoncer avant d'avoir mesuré entre deux déploiements.** Le 09/09, trois causes de
lenteur ont été livrées puis démenties par la mesure. Corriger ce qui est visiblement en trop est
légitime ; promettre un gain ne l'est pas. L'A/B entre deux déploiements Vercel est ce qui
tranche, pas l'onglet local (les minuteurs y sont bridés quand l'onglet n'est pas au premier
plan).
