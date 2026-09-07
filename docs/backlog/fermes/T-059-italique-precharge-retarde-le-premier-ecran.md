---
id: T-059
titre: Une police jamais peinte retarde l'apparition du premier écran
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de performance du 29/08/2026, chiffres mesurés sur un vrai build.
## Ce que j'ai vérifié
`src/app/(atelier)/layout.tsx:33-37` — `DM_Sans({ style: ['normal','italic'] })` sans
`preload:false`. Le fichier italique fait **38,9 Ko**, le plus gros des quatre, et il est en
`<link rel="preload" as="font">` sur `/`, `/magazine`, `/composer` ET `/numero/[token]`.
Son unique consommateur dans tout le groupe est `.at-hint` (`composer.css:133`), c'est-à-dire
l'écran 2 du questionnaire. Grep exhaustif : aucun autre `font-style:italic` sur `--font-ui`.
Et le coup de grâce : **`Ouverture.tsx:82` attend `document.fonts.ready` avant de dévoiler la
couverture.** Ces 38,9 Ko, en priorité maximale et en concurrence avec l'image principale,
retardent donc littéralement l'apparition du premier écran — pour une police qui ne peint jamais
un caractère sur l'accueil ni sur la page produit.
## Ce que j'ai ESSAYÉ, et qui ne marche pas
`preload: false` sur la déclaration italique. **Sans aucun effet, mesuré.** Modification faite,
reconstruction, comparaison des `<link rel="preload" as="font">` du HTML servi pour `/` : les
quatre mêmes fichiers, aux mêmes empreintes, avant comme après.

J'ai poussé l'expérience jusqu'au bout, trois constructions successives :
| Ce que j'ai posé | Polices préchargées sur `/` |
|---|---|
| état d'origine | 4 (120,5 Ko) |
| `preload: false` sur DM Sans de l'atelier | 4, fichiers identiques |
| + `preload: false` sur Cormorant de l'atelier | 4, fichiers identiques |
| + `preload: false` sur DM Sans de la racine — **toutes les déclarations** | **4, fichiers identiques** |

Vérifié que je mesurais la bonne chose : ce sont bien de vrais
`<link rel="preload" href="…woff2" as="font" crossorigin type="font/woff2">`, et leur somme fait
22,4 + 36,1 + 38,9 + 23,1 = **120,5 Ko**, exactement le chiffre de l'audit.
**Conclusion : `preload: false` n'a aucun effet observable dans ce projet.** Modification annulée
plutôt que laissée dans le code avec un commentaire revendiquant un gain inexistant.

⚠️ **Cela met en cause une optimisation documentée ailleurs.** `src/app/layout.tsx:14-22` porte un
commentaire daté (« Mesure du 27/08/2026 ») qui justifie un `preload: false` sur Cormorant par une
économie de 75 Ko sur toutes les pages. Si l'option est inopérante ici, cette économie n'a jamais
eu lieu, et le commentaire décrit une chose qui ne se produit pas. À vérifier avant de s'y fier.

## Ce que je propose maintenant
Comprendre d'abord POURQUOI l'option est ignorée — version de Next, Turbopack, ou interaction avec
les trois layouts qui déclarent des polices. Sans cette réponse, toute correction serait un coup
dans le noir, et le problème réel demeure : **38,9 Ko d'italique préchargés en priorité maximale,
pour une police que seul `.at-hint` peint, et qui retardent le premier écran puisque
`Ouverture.tsx:82` attend `document.fonts.ready`.**
Piste de repli si l'option reste inopérante : ne plus déclarer l'italique au niveau du groupe, et
la charger uniquement dans le layout du questionnaire, où elle sert.

## Ce qui a été fait
Rien de conservé. La tentative est documentée ci-dessus pour que personne ne la refasse.
