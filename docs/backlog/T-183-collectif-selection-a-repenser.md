---
id: T-183
titre: La sélection des photos n'est pas claire, et on ne sait pas encore comment les clients choisiront
etat: en pause
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Au niveau de la sélection des photos, bon déjà c'est pas très clair ce système de sélection,
je me demande en fait il faudrait comprendre comment vont fonctionner les gens, parce que quelles
photos ils ne vont pas sélectionner, c'est un peu, c'est un peu on, on verra plus tard, mais en
tout cas j'aimerais bien que ça reste dans le back-end en se disant il y a quelque chose à faire à
ce niveau-là. » (19/10/2026)

## Ce que j'ai vérifié (19/10)
- La sélection est une case par photo (`collectif_photos.preselection`), cochée par le
  responsable ou l'atelier, sans plafond appliqué (`preselection_max` n'est qu'affiché), sans
  garde d'état, sans usage en aval : l'atelier ne la voit pas (T-182).
- Historique : déjà discutée le 14/10 (T-151, point 7 ; T-152, « indécis ; gardée en dossier
  discret Ma sélection »).

## Ce que je propose
En pause VOLONTAIRE : observer les premières vraies éditions (combien de clients sélectionnent,
combien de photos, à quel moment) avant de redessiner. Le relevé se fait en SQL sur
`collectif_photos` et le journal (`collectif_evenements`, type de la présélection). T-182 rend
déjà la sélection utile à l'atelier ; ce ticket décide ensuite de sa forme.

## Ce qui a été fait
Rien : en attente de vraies éditions.
