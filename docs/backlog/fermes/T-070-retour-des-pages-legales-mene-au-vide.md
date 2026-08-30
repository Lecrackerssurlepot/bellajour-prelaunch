---
id: T-070
titre: Le retour des pages légales renvoie sur une page supprimée
domaine: front
gravite: confort
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-29
---
## Ce que Mathias a dit
Rien — audits référencement ET accessibilité du 29/08/2026, qui le trouvent tous les deux.
## Ce que j'ai vérifié
`src/app/legal/resolve.ts:43-45` — `backHref()` rend `/preventes?ref=…`, servi par le
« ← Retour » de `LegalPage.tsx:36` sur les quatre pages légales.
Or `/preventes` répond une 307 vers `/` depuis le 28/08 (`next.config.ts:71-73`).
Une fondatrice qui ouvre les CGV depuis un lien de parrainage et clique « Retour » atterrit sur
l'accueil, **son code de parrainage évaporé**, sans jamais revenir là où elle lisait.
C'est le dernier lien interne du site qui pointe vers une redirection.
## Ce que je propose
Renvoyer vers la page d'où l'on vient quand elle est connue, et vers `/` sinon. Conserver le `ref`
dans l'URL de retour tant que le parrainage existe (lié à T-002, qui décidera de son sort).
## Ce qui a été fait
Fait le 29/08/2026. `backHref()` rend `/` et ne prend plus d'argument.
⚠️ **Il ne renvoie PAS vers `/inviter?ref=…`**, ce qui semblait la correction évidente : cette
page appartient à la MARRAINE (« Prénom, partagez votre code avec vos proches »), pas à la
personne qui a reçu son lien. L'y envoyer lui montrerait le code de quelqu'un d'autre comme si
c'était le sien.
Aujourd'hui aucune page n'accueille une filleule — voir T-002. En attendant cette décision,
l'accueil est la réponse honnête, et le dernier lien interne vers une redirection disparaît.
