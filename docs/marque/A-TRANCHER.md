# À trancher par Mathias

Ce qui est flou ou contradictoire entre deux sources. Copie de l'artefact « Charte Bellajour » du 09/11/2026. Rien ici n'a été résolu : les deux valeurs sont citées, la décision est à prendre. Une fois tranché, le code change d'abord, puis cette page.

## Entre le skill `bellajour-brand-motion` et le code

1. **La palette du skill n'est pas celle du code.** Le skill fixe `--bj-beige #EAE3D8`, `--bj-noir #1C1C1C`, `--bj-creme #F0EBE1`, `--bj-accent #778899` (bleu ardoise), `--bj-muted #A89880`. Aucun de ces jetons n'existe dans `tokens.css`, `theme.css`, `admin.css` ni `espace.css`. Le code porte la crème `#f7f1e9`, le bleu `#4a90d9`, la terracotta `#d68a63`, la Porcelaine `#f3f4f7` et le Charbon `#17181c`. **Le skill décrit la landing waitlist archivée.** Faut-il le réécrire sur ce Design System, ou le ranger ?
2. **Playfair Display** est la display du skill (700, et 400 italique). Elle n'est plus chargée nulle part depuis le 15/09/2026 ; la display du code est Cormorant Garamond. Même question.
3. **Les angles droits.** Le skill dit « border-radius 0, tout est carré net, 12 px pour le verre seul » puis, dans ses interdits, « 16 px cartes, 24 px panels, 100 px pills ». Le code et la direction du 15/10 disent arrondis emboîtés 28 / 24 / 16 / 14 et pilules. Le skill se contredit lui-même : à réécrire.
4. **« Ombres : none, interdit sauf glassmorphism »** (skill) contre des ombres longues et douces partout dans le code (`--bj-shadow-*`, `--ec-ombre-*`, `--shadow-*`). `src/app/CLAUDE.md` dit déjà que la vieille consigne ne vaut plus. À retirer du skill.
5. **Durée minimale.** Le skill : « aucune animation sous 400 ms perceptible, minimum 600 ms ». Le code : 240 ms pour les interactions (survol, appui, fond), 700 ms et plus pour le récit. La distinction interaction / récit doit-elle être écrite dans le skill ?
6. **Le déplacement de l'apparition** : 16 px (Lux fade du skill) contre 24 px (`.at-rv` du code). Les deux existent ; en garder un.
7. **« Fade separator » et « Light bleed »** (un filet ou une lueur entre deux sections) contredisent « pas de filets entre sections : de l'espace et des plans » (maquette du 15/10). À retirer ou à cantonner aux pages publiques ?
8. **« Pas plus de 2 glass panels simultanés »** : l'espace client est fait de panneaux de verre. Règle morte à retirer, ou à garder pour les pages publiques seulement ?

## Entre deux feuilles du code (même rôle, deux valeurs)

9. **Texte doux en Porcelaine** : `admin.css` dit `#475467` (`--bj-text-soft`), `espace.css` jour dit `#5b6577` (`--ec-muted`). La maquette du 15/10 montrait `#667085`. Trois valeurs pour un même rôle dans un même monde.
10. **Fond teinté d'accent en Porcelaine** : `admin.css` `--bj-action-soft #eaf2fc` (opaque) contre `espace.css` `--ec-accent-soft rgba(74, 144, 217, 0.12)` (translucide, rend différemment sur un verre).
11. **Le rouge de l'admin** : `atelier.css` `--ate-rouge #c0392b` contre `collectif.css` `--eca-alerte #b3412c` et `espace.css` jour `--ec-danger #b3412c`. Deux rouges dans le même back-office.
12. **Le verre Porcelaine** : la carte est à 0,70 (`--adm-verre`, `--ec-carte` jour) mais la fenêtre à 0,82 (`--ec-glass` jour) et le champ du collectif à 0,78 (`--eca-champ-bg`). Trois opacités voisines : échelle voulue ou dérive ?
13. **Le rayon du bouton** : 14 px en crème (`--bj-r-btn`), 999 px en Porcelaine (`admin.css`), 999 px dans l'espace client. Le bouton crème reste-t-il rectangulaire, ou le monde crème passe-t-il à la pilule ?
14. **Le rayon moyen** : `--bj-r-md` 16 px en crème, 20 px sous `.adm-root` ; `--bj-r-lg` 20 → 24. Les deux générations de rayons cohabitent dans le même fichier de jetons.
15. **Les voiles sur fond sombre** : les pages publiques n'ont pas de jeton de voile de modale, de reflet ni de tache floue ; l'espace client en a. Si les pages publiques passent un jour en Charbon, ces jetons manquent.
16. **Les couleurs en dur du tri** (`mise-en-page.css`) : `#5b6573` (réserve), `#e0445a` (cœur du client), `#8fbcef`, `#e3906d`, `#b7c0cc` (signes sur la nuit), `#6b7585`. Elles ne sont pas des jetons alors que `--mep-or` et `--mep-ecart` le sont. À nommer ?
17. **Le second accent du collectif** : `--eca-violet #7b86e6` et `--eca-lien #2b6cb0` (un bleu plus sombre que le bleu Bellajour pour les liens). Volontaire ou accident ?
18. **Le repli Android** n'existe qu'en sombre et en crème (`--c-nav-android-bg`, `--bj-nav-android-bg`). Les barres de verre de la Porcelaine et du Charbon (la barre de l'atelier, la barre du bas de Photos) n'en ont pas.

## Entre la maquette du 15/10 et le code

19. La maquette « Porcelaine » montrait un texte doux `#667085`, un bouton à `0 6px 14px rgba(74,144,217,0.3)` ; le code a retenu `#475467` / `#5b6577` et `0 8px 20px rgba(74,144,217,0.3)`. La maquette « Charbon » montrait une seconde surface `#22242A` ; le code a `#1f2126`. Ces écarts sont-ils validés ?
20. **Les pages publiques** (`/`, `/magazine`, `/composer`, `/numero`) et les pages crème (`/merci`, légal) **n'ont pas été reprises** en Porcelaine / Charbon. Le monde sombre `.bj-atelier` est-il appelé à devenir le Charbon des pages publiques, ou reste-t-il une troisième direction ? Sa règle : maquettes d'abord.

## Données qui manquent

21. ~~**Le logo**~~ **Réglé le 16/11** : `public/images/v2/ui/` porte `signature-bellajour-240.webp` et `logo-bellajour-240/640.webp`, versionnés et utilisés. Reste à trancher : un SVG du mot-symbole pour l'impression et les mails ?
22. **Le grammage et la finition du papier** (dits dans `/magazine`) ne sont pas une donnée visuelle du code : ils ne sont pas repris ici, un chiffre sans source est un mensonge au client.
