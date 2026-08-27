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

D5 (27/08/2026) — L'accueil est fusionné dans `main` SANS que la barre de tête ait été
vue sur un Android réel : aucun appareil sous la main, et l'émulation ne reproduit pas
le défaut (le coût est une rastérisation sur le GPU du téléphone, pas sur celui du Mac).
Le repli anti-jank n'est donc PAS posé : `.at-nav` reste en `backdrop-filter: blur(20px)`
sur un `position: fixed`, la construction exacte diagnostiquée sur `/preventes/prix` en
juin (commit 246d8e5), avec un flou plus lourd de 2 px. La règle de CLAUDE.md ne dit pas
« risque » mais « jank garanti ». Risque accepté en connaissance de cause. Ceci lève la
réserve de D3, sans la satisfaire.
**Conséquence :** la correction est écrite d'avance, il n'y a qu'à la poser — le patron
`.pv-nav--flat` (détection UA scopée à la page, fond quasi-opaque, blur retiré sur
Android SEUL, desktop et Safari iOS pixel-identiques), déjà en place à trois endroits.
À poser dès qu'un Android passe à portée, ou au premier signalement d'une barre qui
accroche au défilement. ⚠️ Web Analytics n'est pas activé sur le projet : on n'a
aujourd'hui AUCUN moyen de voir un décrochage Android. Une visiteuse qui subit le jank
ne le signale pas, elle part. L'activer est le préalable pour que cette décision soit
surveillable autrement qu'au hasard d'un prêt de téléphone.
