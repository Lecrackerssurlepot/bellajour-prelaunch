# Analyse des photos de l'Édition collective : ce qu'on peut activer

Document INTERNE, ouvert le 14/10/2026 à la demande de Mathias : « tout ce qu'on peut activer
grâce à l'analyse (OpenAI), on le fait, au fur et à mesure ; c'est important qu'on ait ces
informations en interne ». Rien ici n'est construit tant que Mathias ne le demande pas
(T-149). Chaque piste se MESURE avant d'être choisie.

Le principe : ce qui se calcule sans IA se calcule sans IA (plus rapide, gratuit, fiable) ;
l'IA sert là où il faut « comprendre » une image. Une analyse REMARQUE, elle n'exclut jamais
une photo à la place de l'atelier ou du client (même règle que le B2C).

## 1. Ce qui marche déjà (vérifié sur 770 photos le 14/10)

| Analyse | Comment | État |
|---|---|---|
| Date de prise de vue | EXIF | 760 sur 770 |
| GPS et lieu (ville, pays) | EXIF + géocodage Geoapify | 744 sur 770 ont un lieu |
| Appareil, dimensions | EXIF | 769 sur 770 |
| Doublons | empreinte perceptuelle (`doublons.ts`) | **JPEG et PNG seulement** : les HEIC n'ont pas d'empreinte (T-150) |
| Luminance (très sombre, très claire) | moyenne des gris | idem, pas sur les HEIC |

## 2. Sans IA, à activer

- **Les HEIC** (T-150) : vignette et empreinte au moment de l'envoi. Préalable à tout le reste.
- **La résolution pour l'impression (« DPI »)** : avec la largeur et la hauteur en pixels, on
  sait jusqu'à quelle taille une photo s'imprime nettement (par exemple une pleine page A4 à
  300 points par pouce demande environ 2 480 × 3 508 pixels). Remarque « trop petite pour une
  pleine page » plutôt que refus. Le seuil se règle avec l'imprimeur, il ne se devine pas.
- **Les captures d'écran** : la règle du B2C (`estCaptureEcran` : logiciel « screenshot », pas
  d'appareil photo, dimensions d'écran). Les 4 PNG de 1170 px du 14/10 en sont probablement.
- **Le flou** : une mesure de netteté (variance du contraste), sans IA.
- **Les lieux et les pays, et les jours** : déjà en base ; à montrer au client et à l'atelier
  (filtres « par lieu », « par jour », comme au B2C).

## 3. Avec une IA qui regarde l'image (OpenAI ou Claude, selon les crédits)

- **La meilleure de plusieurs presque identiques** (les rafales) : les doublons disent « ces
  photos se ressemblent », l'IA dit « celle-ci est la plus nette, tout le monde a les yeux
  ouverts ».
- **Yeux fermés, flou de bougé, photo ratée** : remarque à l'atelier.
- **Les moments** : discours, repas, photo de groupe, remise de prix, paysage… pour trier et
  proposer un chemin de fer.
- **Les visages** (nombre, photo de groupe) : utile pour équilibrer les personnes. ⚠️ Pas de
  reconnaissance de personnes nommées : données personnelles, à ne pas faire sans avis.
- **Le texte dans l'image** (pancarte, écran) et les captures d'écran restantes.
- **Une photo à ne pas publier** (contenu sensible) : remarque, jamais un retrait automatique.
- **Des légendes proposées** pour l'atelier, à partir du lieu, du jour et du contenu.

## 4. Les questions à trancher avant l'IA
- Quel fournisseur (OpenAI, Claude), quel budget par édition (2 000 photos = 2 000 analyses).
- Où l'analyse tourne (au dépôt, ou au clic « Analyser » de l'atelier comme « Lire les photos »).
- Ce qu'on dit au client : l'analyse de ses photos par un service tiers est un sujet de
  données personnelles (accord sur les données, PRD §12.7) : texte légal, avis de Mathias.
