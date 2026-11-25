# A. Fondations et ton

**Source des règles d'écriture** : `docs/marque/TON.md` et `docs/marque/STRUCTURE-INFO.md`, déjà
tranchés par Mathias (dates dans ces fichiers). Cette fiche les résume. Pour le détail des mails
et du récapitulatif, ces deux fichiers restent la référence. Ils seront fondus ici en phase 7.

## Promesse et positionnement

- **Ce qu'on est** : une maison d'édition du souvenir.
- **Comment ça marche** : le client dépose ses photos et son histoire ; l'atelier compose un magazine ; on imprime et on livre.
- **La promesse**, en signature Interlope : **« Vivez. Nous composons. »**
- **Le registre** : premium, jamais solennel. Un artisan qui travaille pendant que l'on vit, pas une application qui réclame de l'attention.

## Valeurs

| Valeur | Ce qu'elle veut dire |
|---|---|
| Le soin | L'atelier compose. Le client ne fait pas de mise en page. |
| La vérité | Aucun chiffre inventé : un prix, un délai ou un grammage sans source est un mensonge au client. |
| La simplicité | Moins de boutons. Un bouton qui peut être remplacé, déplacé, ou qui ajoute une étape n'a pas sa place. |

## Ton par canal

| Canal | Ton | ✅ | ❌ |
|---|---|---|---|
| Site | Vouvoiement chaleureux, ni « ! » ni emoji | « Composer mon numéro » | « Profitez-en vite ! » |
| Parcours (`/composer`, `/numero`, `/compte`) | Titre de 1 à 4 mots, état de 2 à 6 mots | « Vos photos sont là » | « Le système a bien reçu vos fichiers » |
| Mail | Ouvrir par une vie, une idée par bloc, un seul bouton avec un verbe, emoji libres, un « ! » au plus, aucun tiret, signé « L'atelier Bellajour » | « Votre sœur rêve de garder son dernier voyage ? » | « Une carte cadeau, valable douze mois… » |
| Instagram | La photo du numéro parle, une ligne courte | « Un numéro composé par l'atelier » | Hashtags en série |
| B2B (écoles, entreprises) | Clair et concret. L'Édition collective suit le registre de l'édition (vous ou tu). | « Un magazine pour chaque moment » | Le jargon commercial |

## Règles d'écriture (toutes tranchées)

- **Masculin générique** : le client, le fondateur, il. Jamais « cliente », « fondatrice » ou « elle ». On ne touche pas ce qui ne se voit pas (clés, fichiers, textes légaux portugais).
- **Pas de tiret cadratin comme ponctuation** :
  - deux-points pour une énumération ou une explication ;
  - point entre deux phrases ;
  - virgule pour une continuation.
  - Jamais dans un bouton ni un message d'état. Aucun tiret du tout dans les mails.
- **Textes courts** : on coupe jusqu'à ce que plus un mot ne puisse partir. Une ligne d'aide seulement si l'écran ne se comprend pas sans elle.
- **Un geste de texte n'est jamais souligné** : c'est une petite pilule douce (voir H).
- **Les phrases du questionnaire `/composer` sont des correctifs mesurés** : on ne les réécrit pas sans Mathias.
- **Majuscules** : en début de phrase et pour les noms propres. Les étiquettes passent en capitales par le CSS, jamais tapées en capitales.
- **Ponctuation française** : espace insécable avant `: ; ! ?` et dans `« »`, apostrophe typographique `’`.
- **Un texte légal ne change pas** sans l'accord explicite de Mathias.

## Nombres, prix, dates (`STRUCTURE-INFO.md`)

- **Une ligne par information**, jamais une phrase qui en porte trois. Plusieurs données se montrent en récapitulatif : le libellé à gauche, la valeur à droite, un filet fin entre les lignes.
- **Un montant est formaté par le code** (`formaterCentimes`, `src/lib/atelier/prix.ts`) : « 12 € », « 12,50 € », jamais « 12,00 € ». Une déduction prend le vrai signe moins : « −38 € ».
- **Un nombre vient du code** : un délai de `urgence.ts`, un prix de `grille.ts`, un seuil de `livraison.ts`.
- **Les dates** s'écrivent en toutes lettres, sans l'année quand elle est évidente (« le 24 décembre au matin »). Toujours à l'heure de Paris. Une heure précise ne se promet pas.
- **Numéro** : « N° 01 ».

## Vocabulaire

| On dit | On ne dit jamais |
|---|---|
| magazine, numéro, composer, confier | album, profitez, cliquez ici, magique |
| l'atelier compose | l'IA génère |
| la couverture (toujours une vraie photo) | une illustration, une couverture peinte |
| ce que la carte a fait (« La carte de Léa a offert votre numéro ») | « Votre carte a servi » |
