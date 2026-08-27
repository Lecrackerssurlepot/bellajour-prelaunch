# Décisions

Une ligne par décision qui coûterait cher à redécouvrir. Ce qu'on a tranché, la date,
et la conséquence à respecter ensuite. Ce n'est pas un journal des changements :
si l'information est déjà dans le code ou dans l'historique git, elle n'a rien à faire ici.

Format : `D<n> (JJ/MM/AAAA) — la décision. **Conséquence :** ce qu'il faut faire ou vérifier après.`

---

D1 (27/08/2026) — Un skill utilisateur nommé `design` masquait le skill natif Claude Design ;
renommé en `claudekit-design` (dossier, frontmatter, chemins de scripts).
**Conséquence :** aucun skill utilisateur ne porte le nom d'une commande native.
À vérifier avant tout ajout de skill.

D2 (27/08/2026) — La bibliothèque typographique des numéros vit dans `assets/typo`, jamais
dans `public/` : le dépôt est PUBLIC, et committer une police, c'est la redistribuer.
60 polices en OFL ou Apache sont versionnées ; 76 dont la licence l'interdit, ou qui n'en
portent aucune, sont exclues par `assets/typo/.gitignore` et ne vivent que sur le disque.
**Conséquence :** avant d'ajouter une police, vérifier qu'un fichier de licence l'accompagne
ET qu'il autorise la redistribution. Sans ça, l'ajouter au `.gitignore`. Audit dans
`assets/typo/LICENCES.md`. Deux polices posent en plus un problème d'usage commercial
(Firty, non commercial ; Willing Race, dérivée d'un logo NBC) : à ne pas poser sur un
numéro vendu.

D3 (27/08/2026) — La page d'accueil est refondue : une couverture qui se pose puis
s'ouvre en plein écran, suivie du récit de marque en sept pages plein écran. Livrée
sur la branche `accueil-univers`, PAS sur `main` : remplacer l'accueil d'un site qui
vend, avec quatorze fondateurs aux droits ouverts, demande que la preview Vercel soit
vue avant la production.
**Conséquence :** `.at-accueil` scope entièrement les deux feuilles de style et porte
les états `pret`/`plein` — le retirer dépeint la page. Les composants S1Hero,
S2Collection, S3Method et S4Final restent sur le disque hors routage : leur contenu
part vers la page produit, ne pas les nettoyer.

D4 (27/08/2026) — Le prototype de référence (`design-explorations/`) et la
bibliothèque typographique (`assets/typo/`) ne sont TOUJOURS PAS versionnés. Ils
portent la direction artistique, le wording verrouillé et les 60 polices libres.
Un `git clean` les efface sans avertissement.
**Conséquence :** à trancher avant toute autre session. Voir D2 pour la règle des
licences.
