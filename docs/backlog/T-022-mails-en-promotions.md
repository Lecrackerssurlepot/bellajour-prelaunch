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
31/08 — **le front 1 (DNS) est clos : tout est bon.** Relevé réel sur bellajour.com :
SPF `v=spf1 include:_spf.mail.hostinger.com include:spf.brevo.com ~all` ✓ ·
DKIM brevo1/brevo2 en CNAME vers Brevo, clés répondantes ✓ ·
DMARC `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` ✓.
Gmail authentifie donc parfaitement nos mails — le classement en Promotions vient du
**front 2 (contenu)** : la maquette (grande image, bouton, HTML soigné) ressemble à du
marketing pour son classifieur. Vérifié dans la boîte de Mathias : 5 fils en Promotions,
tous par ailleurs marqués « importants » et livrés.

Ce qui reste, par coût croissant :
a) **Le geste utilisateur** (fait faire à Mathias le 31/08) : glisser un mail Bellajour en
   Principale + « toujours faire cela » — règle SA boîte, et chaque cliente qui le fait
   entraîne Gmail globalement. On peut l'encourager dans l'écran 6 du questionnaire
   (« si notre mail est en Promotions, glissez-le en Principale ») — micro-copie à trancher.
b) **Durcir DMARC** `p=none` → `p=quarantine` quand on est sûrs que TOUT part via
   Brevo/Hostinger (protège du spam-spoofing, pas des onglets) — geste Cloudflare de Mathias.
c) **Schema.org dans les templates** (JSON-LD `ParcelDelivery` sur M7, `EmailMessage` sur les
   autres) : marque les mails comme transactionnels pour Gmail — gain plausible, pas garanti.
d) **Alléger les signaux promo** de la maquette (plus de texte, moins de bouton) — en tension
   directe avec la marque, à ne faire que si a-c ne suffisent pas.
Aucun de ces leviers n'est un interrupteur magique : les onglets Gmail sont un classement
appris par utilisateur, et le front 3 (réputation) se construit avec le volume.
