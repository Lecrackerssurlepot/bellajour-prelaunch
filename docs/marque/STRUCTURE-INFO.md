# Poser une information

Comment une donnée se montre au client : un montant, une date, un état, une suite d'étapes.
Écrit le 16/11/2026 à partir de ce que Mathias a validé ou refusé à l'écran. Le modèle de données
(tables, colonnes) n'est pas ici : il est dans `supabase/CLAUDE.md`.

## La règle

**Une ligne par information, jamais une phrase qui en porte trois.**
Le 16/11, le bloc « payé » de `/numero` disait dans un même paragraphe le délai, la carte, le reste
et la facture : refusé (« beaucoup d'informations… il faut que ça soit beaucoup plus structuré »).
Refait en récapitulatif, validé.

## Le récapitulatif

Le motif à reprendre partout où plusieurs données se suivent (paiement, commande, carte, compte).

- Un titre court (« Merci. »), une phrase d'état de 2 à 6 mots dessous.
- Puis une liste : **le libellé à gauche, la valeur à droite**, un filet fin entre deux lignes.
- La ligne qui compte le plus (ce qui reste, ce qu'il faut payer) prend l'accent du monde.
- Une ligne absente vaut mieux qu'une ligne à zéro : on n'affiche pas « Crédit : 0 € ».
- Une note de fin, une seule, pour la suite (« Prévenu par mail. Un détail à changer ? Répondez-y. »).

Exemple en production sur la branche `noel-2026` (`src/app/numero/[token]/page.tsx`, classes `nu-recap`) :

| Libellé | Valeur |
|---|---|
| Votre numéro | Sous N jours ouvrés |
| Carte cadeau | −38 € |
| Reste sur votre compte | 12 € |
| Facture | Voir |

## Les nombres

- **Un montant se formate par le code** (`formaterCentimes`, `src/lib/atelier/prix.ts`), jamais à la main : « 12 € », « 12,50 € », jamais « 12,00 € ».
- Une déduction s'écrit avec le vrai signe moins (−), pas un tiret.
- Les chiffres alignés en colonne prennent des chiffres tabulaires (`tabular-nums`) ; les données de l'admin sont en DM Sans, jamais en serif.
- Aucun nombre inventé : un délai vient de `urgence.ts` (`DELAIS`), un prix de `grille.ts`, un seuil de `livraison.ts`.

## Les dates

- En toutes lettres, sans l'année quand elle est évidente : « le 24 décembre au matin ».
- Toujours à l'heure de Paris (`timeZone: 'Europe/Paris'`) ; la machine de dev est à l'heure de Lisbonne.
- Une heure précise ne se promet pas quand la relève tourne « dans l'heure » : on dit « au matin ».

## Où montrer quoi

- **Une information vit à un seul endroit**, là où le client la cherche ; ailleurs, un lien.
  Exemple : le crédit d'un compte se lit en tête de `/compte` et dans le récapitulatif de `/numero` après paiement, pas sur la carte.
- Le lien d'un numéro suffit toujours : le compte ne remplace jamais le token.
- Au téléphone, une information ne se répète pas sur chaque vignette ou chaque carte d'une liste.
