# Recette visuelle — ce que Mathias peut vérifier à l'œil

Aucune connaissance technique requise. Chaque vérification dit **ce qu'il faut voir**, pas ce
qu'il faut penser. Si ce n'est pas ce qui est décrit, c'est un ticket — pas une hésitation.

Règle de mon côté : je ne demande jamais de vérifier ce que je pouvais vérifier moi-même.
Ce qui est ici demande un œil humain, un vrai appareil, un vrai paiement ou une vraie boîte mail.

---

## Le parcours complet, dans l'ordre où une cliente le vit

**1. L'accueil — `/`**
La couverture se pose, puis s'ouvre en plein écran. Sept pages s'enchaînent ensuite.
✅ Bon : chaque page arrive composée, le texte se pose, rien ne clignote. La barre du haut reste
visible en permanence.
❌ Défaut à signaler : une page **vide** au défilement (le séquenceur n'a pas joué), ou la barre
du haut qui **accroche** quand on fait défiler (c'est le défaut Android connu, T-019).
⚠️ À faire sur un vrai téléphone Android : c'est le seul cas qu'on n'a jamais pu tester.

**2. La page produit — `/magazine`**
✅ Bon : au premier écran, **on voit le bouton sans faire défiler**. Sur toutes les tailles.
❌ Défaut : le mot géant « MAGAZINE » coupé au milieu, ou le chapeau caché derrière la barre.
À vérifier en particulier sur un téléphone tenu à la verticale.

**3. Le questionnaire — `/composer`**
Six questions, aucune facultative : occasion, histoire, titre, prénom, mail, téléphone.
✅ Bon : impossible de passer un écran sans répondre. L'écran des coordonnées annonce
« Il reste une étape après celle-ci : vos photos », et le bouton dit « Passer à mes photos ».
❌ Défaut : un bouton qui dit « Continuer », ou un écran qu'on peut sauter.

**4. Le dépôt des photos**
✅ Bon : après le choix des photos, l'écran tient **d'un seul bloc** — cinq grandes vignettes,
une case « + N », et le bouton « Envoyer à l'atelier » visible sans faire défiler.
❌ Défaut : le bouton enterré sous une planche de vignettes. C'est la cause exacte du dossier
abandonné du 27/08.

**5. Le mail d'accusé (M0)**
Il part dans la seconde qui suit la création du dossier.
✅ Bon : il dit ce qui **manque** (les photos), il ne remercie pas. Il porte le lien permanent.
❌ Défaut à signaler tout de suite : il arrive dans l'onglet **Promotions** de Gmail (T-022),
ou il n'arrive pas du tout.

**6. La page du numéro — `/numero/<token>`**
✅ Bon : elle dit **de qui c'est le tour** (« C'est à nous » / « C'est à vous »), et le lien
permanent est rappelé en pied de page.
❌ Défaut : un dossier de 55 photos qui s'affiche comme terminé alors que le bouton d'envoi n'a
jamais été cliqué.

---

## Les vérifications qu'on n'a jamais faites

Elles demandent un vrai dossier, un vrai paiement ou un vrai appareil. Ce sont celles qui comptent.

| À faire | Ce qu'on saura | Ticket |
|---|---|---|
| Reprendre un dépôt : `/numero/<token>` → « reprendre » → `/composer?reprendre=<token>` | que la cliente retrouve son dossier, et pas un dépôt vide | — |
| Ouvrir `/` sur un vrai téléphone Android | si la barre du haut accroche au défilement | T-019 |
| Envoyer M3b et M9 en vrai, et les lire dans Gmail | s'ils arrivent, et dans quel onglet | T-025, T-022 |
| Laisser un dossier en état 4 pendant sept jours | si l'auto-validation part bien | T-025 |
| Une expédition réelle avec numéro de suivi | si le suivi s'affiche vraiment | T-001 |
| Un paiement réel de bout en bout | si le mail M4 et l'impression suivent | — |

---

## Quand je change quelque chose

Je joins une capture. Si je ne peux pas la faire, je le dis et j'explique ce qui m'en empêche.
Si une modification touche le mobile, je la montre en 375 px de large — c'est la taille d'un
iPhone, et le trafic vient d'Instagram.

---

## Ajouts du 30/08 au soir — la nuit autonome

**A. Le dashboard métriques — `/admin/atelier/metriques`**
✅ Bon : un entonnoir en barres (création → dépôt → aperçu → checkout → payé → validée →
livrée), la durée médiane de **chaque** étape avec son effectif « n= », une section
« Répondre vite fait-il vendre ? » à trois lignes, un bloc « Lecture » en phrases, et un lien
« Télécharger le rapport (CSV) » qui donne un fichier ouvrable dans Excel/Numbers.
❌ Défaut : une barre qui déborde, un chiffre sans son « n= », ou un CSV illisible.

**B. La fiche d'un dossier qui a des PDF d'impression déposés**
✅ Bon : une carte « Les fichiers d'impression » avec, par fichier, « Ouvrir » et un aperçu
repliable ; le bouton « Contrôler les fichiers » rend pages, format en mm et verdict.
❌ Défaut : une fiche qui plante, ou un contrôle qui tourne sans fin.

**C. La fiche d'un dossier fondateur**
✅ Bon : dans le bloc fondateur, un bouton « Créer le code de 30 € » ; après clic, un code
`FONDATEUR-…` copiable avec sa date. Un second clic redonne LE MÊME code.
⚠️ Le premier clic crée réellement le code chez Stripe — le faire d'abord sur un dossier test.

**D. Les mails, après déploiement ET après le `--pousser` (avec ton accord)**
✅ Bon : le logo du mail est lisible **aussi** dans Gmail téléphone en mode sombre (il repose
désormais sur son propre cartouche sombre, cuit dans l'image).
❌ Défaut : un logo invisible ou un rectangle vide à la place.

**E. L'accueil et le récit, après les corrections de performance**
✅ Bon : rien n'a changé à l'œil — la couverture s'ouvre pareil, les sept pages s'enchaînent
pareil, l'italique de l'écran 2 du questionnaire est toujours penchée, l'écran 4 toujours droit.
❌ Défaut : toute différence visuelle. Ces corrections ne devaient toucher que le coût, jamais
le rendu. À regarder surtout sur téléphone (375 px).
