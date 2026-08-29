---
description: Prend le ticket suivant du backlog (ou celui donné en argument), le vérifie, le fait, le teste.
argument-hint: "[T-0xx]"
disable-model-invocation: true
---

Cible : **$ARGUMENTS** — si vide, prends dans `docs/backlog/INDEX.md` le premier ticket `nouveau`
ou `verifie` par ordre de gravité (bloquant, puis serieux, puis confort), en préférant à gravité
égale celui qui débloque le plus de choses.

Déroule, sans sauter d'étape :

**1. Vérifier avant de croire.** Lance l'agent `verificateur` sur l'affirmation du ticket. S'il
   l'INFIRME : passe le ticket en `etat: refuse`, écris la preuve dans « Ce que j'ai vérifié »,
   dis-le à Mathias en deux lignes, et **prends le suivant**. Un ticket infirmé est un gain, pas
   un échec.

**2. Décider.** Écris dans « Ce que je propose » ce que tu vas faire et pourquoi. Si le ticket est
   `avis-requis`, ou si tu découvres en vérifiant qu'il le devient : **tu prépares tout, tu
   n'exécutes pas le geste sensible**, tu passes le ticket en `a-valider` et tu poses à Mathias
   UNE question précise. Puis tu prends le ticket suivant — tu ne restes jamais bloqué à attendre.

**3. Faire.** Délègue à `front` (ce qui se voit) ou `backend` (la mécanique), ou fais-le
   toi-même si c'est court. Respecte les `CLAUDE.md` du dossier touché.

**4. Prouver.** Lance `recetteur`. Si c'est visible, regarde-le dans le navigateur, en 375 px
   ET en desktop. Ajoute au ticket, dans « Ce qui a été fait », ce que tu as changé et ce que tu
   as observé — pas ce que tu espérais.

**5. Classer.** Ajoute `ferme: <date>` à l'en-tête, déplace le fichier dans
   `docs/backlog/fermes/`, et marque la ligne de l'index `**fermé**` — **on ne la retire pas** :
   l'index doit garder la trace de ce qui a été traité, sinon deux sessions rouvrent le même sujet.
   ⚠️ **« Ce qui a été fait » ne se ferme JAMAIS sur un tiret.** Un ticket fermé sans compte rendu
   est un geste sans trace — c'est arrivé le 29/08 sur T-039, un ticket qui touchait la production.
   Si le compte rendu détaillé vit ailleurs (`ETAT-PRODUCTION.md` pour un fait daté), la section
   porte le lien et le résumé, pas le vide. Ajoute une ligne à
   `docs/journal/<AAAA-MM-JJ>.md` : le ticket, ce qui a changé, ce qui reste douteux.
   Si le ticket a produit un choix qui coûterait cher à redécouvrir, ajoute une entrée à
   `docs/DECISIONS.md`. Si l'état du système a changé, mets à jour
   `docs/reference/ETAT-PRODUCTION.md` — c'est le SEUL endroit où va un fait périssable.

**6. Commiter sur la branche**, jamais sur `main`, message en français à l'infinitif ou au présent,
   qui dit l'effet et pas le geste. Ne pousse pas.

Puis enchaîne sur le ticket suivant sans redemander, tant qu'il reste des tickets `libre`.
Arrête-toi pour parler à Mathias seulement quand il ne reste que des `avis-requis`, ou quand tu
découvres quelque chose qui change les priorités.
