# Structure du site : diagnostic et propositions

Écrit le 21/11/2026. Trois structures proposées, une recommandée. Rien n'est tranché.

## 1. L'existant, relevé dans le code de `main`

| Adresse | Ce qu'elle montre | Ce qui ne va pas |
|---|---|---|
| `/` | une couverture qui s'ouvre en plein écran (`Ouverture`), puis « l'univers » en sept pages de récit (`Univers`), le bandeau et le chapitre de Noël par-dessus | le récit parle de la marque, pas du produit : on lit sept pages sans voir un vrai magazine ouvert ; Noël est posé sur la page, pas dedans |
| `/magazine` | la page produit : kiosque, prix, parcours en trois gestes, FAQ, bloc de Noël | longue colonne qu'on fait défiler ; le produit est montré en vignettes, jamais en grand ni en mouvement |
| `/offrir` | la carte cadeau | un monde visuel à part (`noel.css`) |
| `/partenaires` | l'Édition collective pour les entreprises et les écoles | autre gabarit, autres codes |
| `/composer` | le questionnaire et le dépôt | hors refonte visuelle : ses phrases sont des correctifs mesurés (`src/app/CLAUDE.md`) |

Ce qui marche et qu'on garde : un seul bouton d'achat par écran, le libellé qui suit la
destination (`content.ts`), le prix dérivé de la grille, le premier aperçu gratuit comme argument.

## 2. Ce que la page doit faire, dans l'ordre

Un visiteur arrive d'Instagram, au téléphone, sans savoir ce qu'est Bellajour. En moins de dix
secondes il doit voir **un vrai magazine ouvert**. Puis, dans cet ordre :

1. **Désirer** : le produit en grand, en mouvement, avec de vraies photos de vraies vies.
2. **Comprendre** : trois gestes, et ce qu'il n'a pas à faire (la mise en page, c'est nous).
3. **Se projeter** : son occasion à lui (un voyage, un mariage, une naissance, une année).
4. **Être rassuré** : le papier, la fabrication, l'aperçu gratuit, les délais, les avis.
5. **Connaître le prix** : une ligne, sans arbitrage à rendre.
6. **Agir** : un bouton, toujours le même.

Chaque section répond à une seule de ces six questions. Une section qui n'en sert aucune part.

## 3. Arborescence proposée

| Adresse | Rôle | Note |
|---|---|---|
| `/` | le récit et la vente | une seule page qui suffit à acheter |
| `/magazine` | la fiche produit complète | formats, papier, finitions, prix, FAQ |
| `/occasions/<nom>` | une page par occasion | voyage, mariage, naissance, anniversaire, année de famille ; utile au référencement et aux publicités ciblées ; **à valider : quelles occasions on assume** |
| `/atelier` | la maison : qui compose, comment, avec quel soin | la preuve humaine ; **à écrire avec Mathias, aucun fait inventé** |
| `/offrir` | la carte cadeau | toute l'année, pas seulement à Noël |
| `/partenaires` | l'Édition collective | même charte, autre public |
| `/composer`, `/numero`, `/compte` | le service | reprennent la charte sans toucher aux textes du questionnaire |

Les temps forts (Noël, fête des mères) deviennent **une variante du même gabarit** : une couverture
de saison, une ligne d'offre dans la section prix, jamais une bande ajoutée par-dessus.

## 4. Trois structures

### A. « Le numéro » : le site est un magazine

Toute la page d'accueil se lit comme un numéro Bellajour : une couverture, un sommaire, puis des
doubles pages qui se tournent au défilement (au téléphone, une page à la fois, glissée du doigt).
Chaque double page est une section : l'éditorial (la promesse), un reportage par occasion, les
coulisses de l'atelier, le papier en gros plan, le prix comme un « bulletin d'abonnement », la FAQ
comme un courrier des lecteurs, le colophon comme pied de page.

- Pour : l'immersion la plus forte ; le site **est** le produit, rien ne ressemble à un site généré.
- Contre : le plus cher à faire et à tenir ; une navigation inhabituelle peut perdre le visiteur
  pressé ; le référencement demande un vrai texte derrière chaque page tournée.

### B. « Le kiosque » : la boutique éditoriale

Une page marchande classique, très soignée, comme les maisons de beauté ou d'édition indépendante :
une vidéo plein écran de mains qui feuillettent, une bande de preuves (avis, presse si on en a),
les occasions en grandes cartes photo, les trois gestes, un feuilleteur où l'on tourne les pages
d'un vrai numéro, le prix, les avis, la FAQ.

- Pour : la conversion la plus sûre, des repères que tout le monde connaît, rapide à livrer.
- Contre : c'est la structure de tout le monde ; sans des images exceptionnelles elle redevient
  banale, et c'est exactement le reproche fait au site actuel.

### C. « Le récit tenu » (recommandée)

La structure B pour l'ordre et la clarté, avec les moments forts de A aux endroits où ils servent
la vente :

1. **Ouverture** : un vrai magazine, filmé, qui s'ouvre. Le titre et le bouton dessus, rien d'autre.
2. **La double page épinglée** : en défilant, on feuillette un numéro réel, page après page, à
   plein écran. C'est le cœur du site : la preuve avant tout discours.
3. **Les trois gestes** : racontez, déposez, recevez votre couverture. Une image par geste, prise
   sur un vrai téléphone.
4. **Les occasions** : une rangée de couvertures réelles (voyage, mariage, naissance…). Chacune
   ouvre sa page.
5. **La matière** : macro du papier, de la tranche, de la finition mate ou brillante. Le seul
   endroit où l'on parle fabrication, avec les données du code.
6. **L'atelier** : qui compose, en deux phrases et une photo de mains au travail.
7. **Les avis** : de vrais clients, vérifiés (voir `CADRE-LEGAL.md`).
8. **Le prix** : une ligne, l'aperçu gratuit, la livraison offerte au seuil du code.
9. **Les questions** : six au plus ; le reste vit sur `/magazine`.
10. **Le bouton**, puis le pied de page.

Au téléphone : sections 2 et 4 glissées du doigt à l'horizontale, le bouton d'achat fixe en bas
dès la section 2, jamais avant.

## 5. Règles communes aux trois

- **Mobile d'abord** : la maquette se dessine à 375 px, puis s'élargit.
- **Une idée par écran** : un titre de 1 à 4 mots, une phrase au plus, une image.
- **Le produit à chaque écran** : aucun écran sans un magazine visible.
- **Un seul bouton d'achat** par écran, toujours le même libellé.
- **Le mouvement raconte** : il ouvre, tourne, rapproche. Il ne décore pas (`docs/marque/MOTION.md`,
  coupé par `prefers-reduced-motion`).
- **Rapide** : l'ouverture s'affiche en moins de 2,5 s sur un téléphone en 4G ; les vidéos ne
  bloquent jamais le premier affichage.
- **Accessible** : contrastes AA, tailles de texte fixées par la charte, tout lisible sans le
  mouvement.

## 6. Ce qu'il faut pour la faire

- **Des images réelles**, sans quoi aucune des trois ne tient : couvertures, doubles pages à plat,
  mains qui feuillettent, tranche, papier en macro, numéros en situation (table, lit, valise),
  courtes vidéos de feuilletage. La liste précise viendra avec la structure choisie.
- Des numéros dont on a **le droit** de montrer les photos : ceux de Mathias, ou des clients qui
  l'ont accepté par écrit.
- Les avis clients réels et leur source.
