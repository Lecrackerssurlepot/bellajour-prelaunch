# Prompt total — à coller dans Claude Code (repo bellajour-prelaunch)

```
# feat(noel) — Noël 2026 B2C : cartes cadeau, 2ᵉ exemplaire, visuels, mails

Contexte:
Lis d'abord CLAUDE.md, src/app/CLAUDE.md, src/lib/atelier/CLAUDE.md, supabase/CLAUDE.md,
docs/noel-2026/*.md (STRATEGIE, TARIFICATION, PARCOURS-ACHAT, MAILS). La charte à respecter est
CELLE DU REPO (monde sombre /, /magazine ; Cormorant Garamond + DM Sans ; dvh interdit ; <img>
brut ; CSS vanilla scopé), PAS celle d'un vieux skill. Règles produit figées : seule promo = 2ᵉ
exemplaire France (-40 % même couv., -20 % autre couv., max 2, même colis/adresse) ; carte
cadeau usage unique, 12 mois, reliquat crédité, aucune remise ; pas de parrainage ; pas de
prix par page ; tagline « On vous attend à l'intérieur. ».

══ ÉTAPE 1 — DIAGNOSTIC (NE RIEN MODIFIER) ══
- Branche : crée `noel-2026` depuis main. Jamais de commit sur main.
- Lis exemplaires.ts, prix.ts, paiement.ts, le webhook Stripe, /compte, mails.ts, pages_credits.
- Liste ce qui existe pour : crédits, panier/bon de commande, adresse FR, couvertures, Brevo.
- ÉCRIRE EN CHAT : état, risques, plan en 4 lots (prompts 1→4 de STRATEGIE.md §6). Plan Mode.

══ ÉTAPE 2 — FAIRE ══
A. VISUELS D'ABORD, derrière un flag `NEXT_PUBLIC_GIFT_CARD_ENABLED` : page `/noel-preview`
   (noindex, protégée comme l'admin) montrant, pour CHAQUE partie, un visuel et sous lui une
   « checklist charte » (cases cochées par toi après vérification réelle) :
   1. Carte cadeau en 3 variantes (sobre sombre / crème éditoriale / typographique), A6 paysage,
      infos dessus (montant, code, validité 12 mois, « On vous attend à l'intérieur. », prénom,
      message). Animation au survol et au défilement : transform/opacity seulement, respect de
      prefers-reduced-motion, rien qui déborde ni coupe les bords.
   2. Section « Offrir » sur / et /magazine ; page /offrir (montant, prénom, message, date, e-mail
      ou impression).
   3. Bloc panier « Offrir aussi une carte ? » (Ajouter / Non merci).
   4. Bloc 2ᵉ exemplaire (même couverture / autre couverture + sélecteur de couvertures) FR seulement.
   5. Compteur de places (valeur lue en base, jamais en dur) + bandeau date limite 7 déc.
   6. Aperçus de chaque mail de MAILS.md en 2 tons (HTML dans le gabarit du mail 24).
   Chaque visuel : 375 px ET desktop, aucun bouton superposé/inutilisable/superflu, aucun texte
   inutile, captures dans docs/noel-2026/captures/.
B. MÉCANIQUE (lots 2 à 4 de STRATEGIE.md §6) : achat par Stripe Checkout (MODE TEST), webhook
   idempotent générant BJ-CADEAU-XXXXXX (alphabet sans ambiguïté), usage unique, reliquat dans
   le crédit, total = 0 € hors Stripe, page /carte/[token] imprimable (noindex), cartes visibles
   dans /compte ; règle 2ᵉ exemplaire côté serveur (France seulement, max 2) en REMPLAÇANT
   exemplaires.ts (-30 %/-50 %) et en adaptant scripts/verif-atelier.ts ; retrait/archivage dans
   archive/ (avec README) des anciennes mécaniques devenues mortes.
C. MAILS : modèles en BROUILLON Brevo (sur le compte « Bellajour »), tests seulement vers
   l'adresse de Mathias.

CONSERVER strictement : parcours /composer → /numero → /admin/atelier (PARCOURS-INVARIANTS.md),
tokens d'URL, tarifs existants des formats, textes légaux.

══ CONTRAINTES ══
- INTERDITS du CLAUDE.md : pas d'envoi de mail réel, pas de migration appliquée en production
  (écris le .sql dans supabase/migrations, ne l'applique pas), pas de commande d'impression, pas
  d'écriture InvoiceXpress, pas de texte légal modifié, jamais de chiffre inventé.
- Aucune ombre sombre/ coins/ couleur hors tokens du monde concerné ; pas de vocabulaire
  « simple, exclusif, incroyable, révolutionnaire » ; vouvoiement, pas de « ! », pas d'emoji.
- TVA ignorée pour ces tests.

══ LIVRAISON ══
- Un commit par lot, `type(scope): description`, branche noel-2026, push de la BRANCHE (preview
  Vercel). Jamais main.
- npx tsc --noEmit && npm run lint && npm run build ; npx tsx --tsconfig tsconfig.json scripts/verif-atelier.ts
- Avant chaque commit, écrire en chat : ce qui change, 3 edge cases possibles, comment tester.
- Terminer par STATUS: DONE + rapport (voir LOOP.md).
```

## Version « visuels seulement » (à envoyer en premier, 13/11)
Même prompt, mais : ne faire QUE l'ÉTAPE 2.A (page /noel-preview, branche noel-2026, flag désactivé par défaut). Aucune mécanique (B), aucun brouillon Brevo (C). Charte = celle du repo (monde sombre) ; la palette #B8834A est abandonnée ; signature des mails « L'atelier Bellajour ». Une erreur de charte n'est pas grave : ce sont des artefacts à juger. Fin : STATUS DONE + liste des captures.
