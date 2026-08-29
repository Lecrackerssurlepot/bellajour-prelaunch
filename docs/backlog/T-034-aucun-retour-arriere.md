---
id: T-034
titre: Aucun plan de retour arrière si un déploiement casse la vente
domaine: exploitation
gravite: confort
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — angle mort identifié le 29/08 en revue de préparation au lancement.
## Ce que j'ai vérifié
Vercel sait revenir à un déploiement précédent en un clic, mais rien ne le documente, et surtout
rien ne dit **ce qui ne revient pas** : une migration de base appliquée, un template Brevo poussé,
une commande Cloudprinter passée. Revenir sur le code sans savoir ça peut aggraver la panne.
En mémoire, un piège déjà rencontré : le cache de Vercel peut servir l'ancienne version plusieurs
minutes après un envoi — donc « j'ai corrigé et c'est toujours cassé » n'est pas une preuve.
## Ce que je propose
Une page courte `docs/reference/RUNBOOK.md` : comment revenir en arrière, ce qui ne revient pas,
comment vérifier sur l'URL de déploiement plutôt que sur bellajour.fr, et les trois pannes les
plus probables avec leur premier geste (paiement qui ne remonte pas, mail qui ne part pas,
impression bloquée). Je peux l'écrire seul à partir de ce qui est déjà documenté.
## Ce qui a été fait
—
