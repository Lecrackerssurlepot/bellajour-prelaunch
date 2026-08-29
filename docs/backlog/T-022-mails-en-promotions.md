---
id: T-022
titre: Les mails tombent dans l'onglet Promotions de Gmail
domaine: exploitation
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
« Un M3 en Promotions est une vente perdue. Chantier à part : DNS, contenu, réputation. »
## Ce que j'ai vérifié
Repris de `docs/ATELIER-A-FAIRE.md`. Le DNS est chez Cloudflare (pas Hostinger) ; le SPF a été
réparé le 24/08 — Brevo n'y figurait pas.
M3 annonce la couverture : c'est le mail qui déclenche l'achat. S'il n'est pas vu, tout le
parcours s'arrête là, sans qu'aucune alerte ne se déclenche de notre côté.
## Ce que je propose
Trois fronts, dans cet ordre, parce qu'ils ne coûtent pas la même chose :
1. **DNS** — vérifier SPF, DKIM et DMARC réellement publiés et alignés sur le domaine d'envoi.
   C'est le seul levier purement technique, et le plus rentable.
2. **Contenu** — un mail transactionnel qui ressemble à une newsletter est classé comme telle :
   ratio texte/image, nombre de liens, absence de lien de désinscription sur du transactionnel.
3. **Réputation** — se construit dans le temps, rien à faire à court terme.
**Question pour Mathias** : as-tu accès au tableau de bord DNS Cloudflare pour que je te dise
quoi vérifier, ou veux-tu que je te prépare les enregistrements exacts à comparer ?
## Ce qui a été fait
—
