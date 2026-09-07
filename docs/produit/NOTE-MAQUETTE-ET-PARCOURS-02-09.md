# Note de design — la maquette que reçoit le client, et le parcours

Rédigée le 02/09/2026, en autonomie, à partir du brouillon de Mathias. Accompagne le prototype
visionnable et les tickets T-089 à T-092. Posture : architecte UX + dev senior.

---

## 1. Ce qui est livré aujourd'hui

- **Un prototype visionnable** de la visionneuse maquette (lien dans la conversation). Ouvrable
  sur téléphone comme sur ordi. Il démontre : la planche 1ère+4ème découpée **pile au centre**, la
  bascule de format (à plat · la couverture · la quatrième · doubles pages), le **défilé façon
  magazine** des doubles pages, un rail de vignettes qui s'adapte à ce qui est uploadé, et le
  moment d'achat soigné. Visuels de démonstration (aucune vraie photo), thème sombre réel de
  l'atelier.
- **Quatre tickets** : T-089 (visionneuse client), T-090 (admin planche/découpage/doubles pages),
  T-091 (réagir à la maquette : thèmes + freestyle), T-092 (refonte parcours Q1→Q5 + logo).

## 2. Bonne nouvelle : la moitié du socle existe déjà

L'audit du système d'aperçu l'a montré :
- **La « planche » existe déjà** — c'est le format `plat` d'`apercu_urls` : 4ème | dos | 1ère dans
  **un seul fichier** (l'export naturel de Canva), déjà **découpé en CSS** en couverture (droite) /
  quatrième (gauche) / à-plat. Ton idée « on envoie une seule planche, tu découpes au centre » est
  donc dans la continuité de l'existant, pas une rupture.
- **Une loupe plein écran mutualisée** (`components/Loupe.tsx`) : navigation clavier/flèches, piège
  du focus géré, dédup par légende. Réutilisable tel quel pour un zoom magazine.
- **Un vocabulaire figé** partagé client/admin : « La couverture », « La quatrième », « Une double
  page ». Le prototype le reprend.
- **Un pipeline d'upload R2 privé** (presign → PUT direct → clé en base → vérif HEAD).

## 3. Ce qui manque, et l'architecture que je recommande

### a) Le modèle de données (le vrai verrou)
Aujourd'hui `apercu_urls` est un objet à **clés fixes** avec **une seule** double page (`double`).
Pour « 2 ou 3 doubles pages, montrées à la demande », il faut passer à un **tableau ordonné** :

```
apercu = {
  planche: <clé R2>,            // la 1ère+4ème en un fichier (l'actuel `plat`)
  coupe: 0.5,                    // position du découpage (0.5 = pile au centre), réglable
  doubles: [                     // 0 à 3 doubles pages
    { cle:<R2>, visible:true, legende? },
    …
  ],
}
```
⚠️ Ce changement touche `resoudreApercu`, les gardes M3 (« refuse si vide ») et la vérif HEAD à la
publication : à faire proprement, avec repli sur l'ancien format `{plat|c1|c4, double}` pour ne pas
casser les dossiers déjà publiés. C'est le cœur de **T-089/T-090**.

### b) Le découpage « pile au centre »
Se fait **à l'affichage** (CSS/transform), sans re-générer d'image — comme aujourd'hui, mais avec
une **position de coupe réglable** (`coupe`) au lieu du centre approximatif actuel. Côté admin
(T-090), un curseur au **drag** règle cette valeur ; côté client, la visionneuse l'applique. Le dos
(la tranche) reste dans le fichier : la coupe « 1ère seule » cadre à droite de la ligne, « 4ème
seule » à gauche.

### c) La visionneuse client (T-089)
Une refonte d'`Apercu.tsx` : au lieu de la disposition fixe (2 covers + N vues empilées), un
**stage unique commutable** (à plat / 1ère / 4ème / doubles pages) + un **rail de vignettes** qui
n'affiche que ce que l'atelier a activé. Le défilé des doubles pages = un carrousel façon magazine
(flèches, points, glissé). Le prototype est la référence visuelle.

### d) L'admin (T-090)
Refonte de `PanneauAction.tsx` : uploader **la planche** + **0 à 3 doubles pages**, chacune
activable, le curseur de découpe, du **drag-and-drop** pour l'ordre. La fiche admin (`Fiche.tsx`,
`vuesDeLApercu`) doit refléter exactement ce que verra la cliente.

### e) Réagir à la maquette (T-091)
`coverModels.ts` porte déjà 2 « modèles d'exemple ». Les faire passer à **5 thèmes choisissables**
(enregistrés sur `numeros`, transmis à l'atelier), + un repli **freestyle** si aucun choix, + des
**champs texte optionnels** (sous-titre) sur la couverture. Gain réel : on vise juste dès le
questionnaire, et une cliente déçue a une porte de sortie autre que « partir ».

## 4. Ce qui me bloque — décisions/données qu'il me faut de toi

1. **Les 5 thèmes de couverture** : les visuels (je n'invente aucun visuel).
2. **La géométrie** (T-077/078) : ✅ **la formule du dos Cloudprinter est trouvée** (02/09,
   consignée dans `SPECS-CLOUDPRINTER.md`) : `dos_mm = grammage×bulk×(pages/2)/1000 + 1,0`. Le verrou
   géométrique le plus dur est levé — le jour où on génère la vraie couverture enveloppante, on sait
   calculer sa largeur. Pour l'aperçu client, la coupe visuelle au centre suffit.
3. **Combien de doubles pages au maximum** : 2 ou 3 ? (le prototype montre 3.)
4. **Le drag-and-drop admin** : ordonner les doubles pages, ou aussi recadrer dans chaque page ?

## 5. Séquencement que je recommande

1. **Réagir au prototype** (toi) → on fige la direction visuelle de la visionneuse.
2. **Modèle de données** (a) — le socle, avec repli sur l'ancien format. Sans risque pour les
   dossiers publiés.
3. **Visionneuse client** (T-089) + **admin** (T-090) en parallèle, sur ce socle.
4. **Thèmes + freestyle** (T-091) — dès que tu fournis les 5 visuels.
5. **Parcours Q1→Q5** (T-092) — chantier que tu veux mener ; le cahier des charges est prêt.

Le tout derrière l'écran `apercu_pret`, sans toucher au tunnel de paiement ni aux mails.
