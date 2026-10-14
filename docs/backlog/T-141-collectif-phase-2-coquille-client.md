---
id: T-141
titre: Le client B2B n'a pas d'espace, ni menu, ni tableau de bord, ni dossier, ni messagerie
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-13
---
## Ce que Mathias a dit
« Je veux pouvoir ouvrir de vraies éditions de test et tout utiliser de bout en bout (phases 0 à
6). »

## Ce que j'ai vérifié
- Next 16 : un layout ne se re-rend pas en navigation et `loading.tsx` ne couvre pas les lectures
  du layout de son propre segment. Le layout de `/edition/[token]` doit lire peu, sous
  `<Suspense>` ; l'entrée active du menu se lit par `usePathname` (composant client).
- Un préchargement de `<Link>` exécute la page : « marquer lu » se fait dans un effet, jamais au
  rendu.
- `Rafraichissement.tsx` (admin) rafraîchit toutes les 60 s par `router.refresh()` : trop lourd à
  3 ou 4 s. La messagerie interrogera une route JSON légère (`depuis=`).
- `globals.css` ne neutralise pas `h3` dans le monde sombre ; `.bj-atelier h1` fait 56 à 150 px.

## Ce que je propose
PRD §4, §7, phase 2 :
- `src/app/edition/[token]/layout.tsx` : coquille persistante, menu de `verrous.ts` (cadenas,
  raison au survol ET au tap), tiroir sur mobile, `loading.tsx` en forme d'écran ;
- tableau de bord (état vide ET en cours), « Votre dossier » (devis et documents posés par
  l'atelier), messagerie dans les deux sens (interrogation 3 à 4 s quand l'onglet est visible,
  rien quand il est caché, rattrapage au retour), non-lus côté atelier ;
- lien équipe en lecture seule : aucun bouton d'écriture, et chaque route le refuse
  (`peut(role, action)`, vérifié par le harnais) ;
- trancher « Étape N sur 6 » (client) contre « sur 7 » (admin) des maquettes.

**Recette** : le lien responsable sur ordinateur et téléphone, des messages échangés avec l'admin
dans deux fenêtres, le lien équipe qui ne peut rien écrire.

## Ce qui a été fait
Rien. Ticket ouvert le 13/10/2026.
