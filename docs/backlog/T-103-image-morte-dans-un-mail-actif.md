---
id: T-103
titre: Un template de mail actif affiche une image qui répond 404
domaine: contenu
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-08
---

## Ce que j'ai vérifié (08/09/2026)

En interrogeant l'API Brevo pour le ménage de T-102, j'ai croisé toutes les URL d'images en
`bellajour.fr` citées par les 39 templates avec ce que sert vraiment la production :

| URL citée par un template | Réponse de la production |
|---|---|
| `/images/Bellajour_bleu.png` | **404** |
| `/images/decor-album-email.jpg` | 200 (276 Ko) |
| `/images/instagram.png` | 200 (15 Ko) |
| `/logo-mail-blanc.png` | 200 (39 Ko) |
| `/logo-mail-cuivre.png` | 200 (39 Ko) |
| `/logo-mail.png` | 200 (43 Ko) |

**Le template fautif est le nº 13, « Waitlist - Séquence W2 W3_step_#5 », et il est ACTIF.**
Quiconque le reçoit voit un cadre vide à la place de l'image.

Le fichier n'existe nulle part dans le dépôt : il n'a pas été déplacé par erreur, il n'a
jamais été déployé sous ce nom. La casse compte (`Bellajour_bleu.png`), et Vercel sert un
système de fichiers sensible à la casse.

## Ce que je remarque, sans trancher

Le template **14** porte **le même nom** (« Waitlist - Séquence W2 W3_step_#5 ») et appelle,
lui, `decor-album-email.jpg` qui répond 200. Tout laisse penser que **13 est l'ancienne
version, remplacée par 14** et jamais désactivée. Mais je ne peux pas le prouver depuis le
dépôt : c'est l'historique Brevo qui le dirait.

Deux détails relevés au passage, sans gravité : `logo-mail-blanc.png` et `logo-mail-cuivre.png`
pèsent exactement le même nombre d'octets (39 012) — probablement le même fichier sous deux
noms. Et ces templates appartiennent à la séquence waitlist/prévente, close depuis le 01/09.

## Ce qu'il faut trancher (Mathias)

Modifier un template Brevo, c'est toucher un mail qui part chez de vraies clientes : je ne le
fais pas sans ton accord. Trois issues possibles, à ton choix :

1. **désactiver le template 13** s'il est bien le doublon périmé de 14 (le plus probable) ;
2. **corriger son image** en pointant `decor-album-email.jpg`, comme le fait 14 ;
3. **déployer une image** à `/images/Bellajour_bleu.png` si ce visuel-là existe et compte.

Rien ne presse tant que la séquence waitlist ne tourne pas, mais tant que le template est actif,
un envoi reste possible.

## État

`nouveau` — constat prouvé contre la production et contre l'API Brevo, correctif en attente
d'un accord (geste sur un mail réel).
