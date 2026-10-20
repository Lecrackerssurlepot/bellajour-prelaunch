---
id: T-194
titre: Une photo arrivée au coffre mais pas encore confirmée (page fermée, téléphone verrouillé) reste invisible pour toujours
etat: en cours
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-20
---
## Ce que Mathias a dit
« Il doit prendre en compte tout, prévoir toutes les étapes qui vont arriver, prévoir toutes les
failles qu'il peut y avoir, toutes les dispositions à prendre en avance. Il faut se projeter pour
ne pas être surpris. » (20/10/2026, à propos d'Audencia : 8 bateaux, 80 participants)

## Ce que j'ai vérifié
- La confirmation part du navigateur, groupée toutes les 15 s ou par 10 photos
  (`src/app/edition/_composants/depot/moteur.ts:80,785`). Si la page se ferme avant, l'objet est au
  coffre mais la ligne reste « déclarée » ; elle cesse de compter dans les plafonds après 2 h
  (`src/lib/collectif/depot.ts:43`) et n'apparaît nulle part.
- Elle ne revient que si le participant re-choisit la même photo (`depot.ts:131`). Aucune tâche
  ne rattrape ces photos (`vercel.json` : deux tâches, toutes deux des particuliers).
- Cas attendu à Audencia : on envoie depuis le port, on range le téléphone, l'écran se verrouille.

## Ce que je propose
À chaque ouverture de la fiche atelier ET une fois par jour : pour les lignes déclarées depuis
plus de 10 minutes, demander au coffre si l'objet existe (`HEAD`) et confirmer celles qui y sont,
avec le même contrôle de taille que `depot/complete`. Journaliser le nombre rattrapé. Harnais
sur la règle pure.

## Ce qui a été fait
20/10 (lot a1, branche de travail, non fusionné) :
- **La règle pure** `src/lib/collectif/rattrapage.ts` : une ligne déclarée depuis plus de 10 min
  (`DELAI_AVANT_RATTRAPAGE_MS`, dates lues par `lireInstant`, jamais `Date.parse` seul), au plus
  50 lignes une tête (HEAD) chacune, au-delà une LISTE du dossier du coffre d'abord (un wifi filtré
  laisse des centaines de lignes mortes), les plus récentes d'abord, 500 confirmations par passage.
  Le verdict (`issueTete`) et le patch (`patchConfirmation` : `taille`, `confirmee_le`,
  `vignette_key`, rien d'autre) sont LES MÊMES que `depot/complete`. Une photo trop lourde n'est
  pas effacée ici (on ne fait rien, comme demandé). L'accord et le participant ont été écrits à la
  déclaration : la confirmation n'y touche pas.
- **Une seule confirmation** : `confirmerArrivee` (`rattrapageCoffre.ts`) sert à `depot/complete`
  ET au rattrapage, avec la garde `.is("confirmee_le", null)` (idempotente par la base).
- **Le verrou au journal** (patron `souvenir_demarre`) : `rattrapage_demarre` (`payload.passage`,
  tiré par le serveur) puis `photos_rattrapees` (au moins une, lu sur la fiche) ou
  `rattrapage_fini` (aucune, caché par `JOURNAL_DE_LOT`). Fenêtre 60 s = `maxDuration` des trois
  appelants ; repos de 15 min entre deux passages ; deux démarrages croisés : le plus récent cède.
  Un passage qui n'a rien à faire n'écrit RIEN. Journal illisible : pas de passage.
- **Les déclencheurs, sans cron neuf** : la fiche de l'atelier et la page Photos du responsable
  (`after()`, module chargé seulement à ce moment-là ; le lien de l'équipe ne déclenche rien), et la
  relève quotidienne existante (`/api/atelier/mails/relever`, `after()` juste après le secret,
  échéance 50 s, éditions en collecte ou closes depuis moins de 2 jours, coupé sans
  `COLLECTIF_OUVERT`). Trois lignes dans la relève, rien d'autre n'y change.
- Harnais `verif-collectif.ts` : règles pures, puis le passage ENTIER joué contre une fausse base et
  un faux coffre (rien à faire, Audencia, repos, en cours, cession, trop lourde, panne, liste,
  journal illisible, échéance) : TOUT PASSE.

Reste : vérifier en production qu'un passage réel retrouve une photo (une ligne `photos_rattrapees`
et `confirmee_le` posé) ; je ne l'ai pas fait (base de production, aucune écriture permise).
