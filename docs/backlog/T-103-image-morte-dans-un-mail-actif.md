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

## Tentative de désactivation (08/09/2026) — l'API la refuse

Mathias a demandé de désactiver le template 13. **Ça n'a pas marché, et il faut savoir pourquoi
avant de recommencer.**

    GET  /v3/smtp/templates/13  → 200, le template est là
    PUT  /v3/smtp/templates/13  {"isActive": false}
                                → 404 {"code":"document_not_found",
                                       "message":"Template id does not exist"}

Le même id est trouvé en lecture et introuvable en écriture. L'explication tient à son nom :
**« Waitlist - Séquence W2 W3_step_#5 » est une étape d'une AUTOMATION**, pas un template
transactionnel. La documentation de l'endpoint de liste le dit à demi-mot (« including
automation templates ») ; ces templates-là se lisent par l'API et ne se modifient que dans
l'interface de l'automation. Les seuls autres du dépôt à porter ce nom sont **12, 13 et 14** —
tous les nôtres (W1 à W6, P, A, F, S, M0 à M10, C1, C2) sont transactionnels et créés par
`scripts/mails-atelier.mjs`.

**Correction d'une hypothèse trop rapide.** J'avais écrit que 13 était l'ancienne version de 14.
C'est faux : ils partagent le NOM, pas l'objet.

| id | objet réel | ce que c'est vraiment |
|---|---|---|
| 14 | « Ce que vous allez tenir entre les mains » | le propos de **W3** (template 7) |
| 13 | « {{ params.PRENOM }}, les préventes ouvrent demain ! » | le propos de **W5** (template 8) |

Donc 13 n'est pas un doublon de 14 : c'est un mail « les préventes ouvrent demain » enregistré
sous un nom qui n'est pas le sien, et dont le vrai jumeau est le template 8.

### La vraie question, qui décide de tout

Aucun de ces trois templates n'est appelé par un id dans `src/` ni `scripts/` : ils
n'appartiennent pas à notre code, ils appartiennent à une automation Brevo. Donc :

- **si l'automation « Waitlist - Séquence W2 W3 » est arrêtée**, le mail ne peut plus partir et
  l'image 404 ne sera jamais vue : le ticket se ferme sans rien toucher ;
- **si elle tourne encore**, il faut l'arrêter — et c'est bien plus important que l'image, parce
  qu'elle enverrait des mails annonçant des préventes **closes depuis le 01/09**.

Cette réponse ne se lit pas depuis le dépôt : l'API v3 n'expose pas les workflows d'automation.
Elle se lit dans Brevo, sous Automations.

## État

`nouveau` → la correction demandée est **impossible par l'API**. Elle demande un geste dans
l'interface Brevo, et surtout une réponse à la question ci-dessus.
