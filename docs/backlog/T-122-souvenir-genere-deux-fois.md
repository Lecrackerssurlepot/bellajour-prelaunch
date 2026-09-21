---
id: T-122
titre: Le PDF souvenir se fabrique deux fois après « Envoyer à l'impression », et la fiche dit « pas encore généré » pendant qu'il se fabrique
etat: en cours
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-09-21
---
## Ce que Mathias a dit
« Le PDF souvenir s'est généré deux fois après la commande Cloudprinter du dossier de Merisa le
21/09 (souvenir_genere à 08:54:15 et 08:54:31 UTC, même taille) : la route n'a ni verrou ni garde
« déjà généré », et la fiche a deux déclencheurs (fetch best-effort après envoyer_impression +
bouton de reprise qui affiche « Pas encore généré » pendant la génération) »

## Ce que j'ai vérifié
**Le défaut est réel.** Journal `evenements` du dossier 06f127eb (Merisa), relu en lecture seule le
21/09 :

| heure UTC | événement | détail |
|---|---|---|
| 08:54:06.9 | `etat_change` | validee → en_production, `envoyer_impression`, par Mathias |
| 08:54:07.0 | `cloudprinter_commande` | orderId = id du dossier, `magazine_pb_a4_p_fc`, `cp_ground` |
| 08:54:15.6 | `souvenir_genere` | clé `…/souvenir/38af31be.pdf`, 134 019 145 octets, dos 3,3 mm |
| 08:54:31.6 | `souvenir_genere` | clé `…/souvenir/d55a13d4.pdf`, 134 019 145 octets, dos 3,3 mm |
| 08:54:46.7 | `cloudprinter_signal` | OrderValidated |

En base, `souvenir_pdf_key` vaut `d55a13d4`. Sur R2, `38af31be` est **absent** et `d55a13d4`
présent (134 019 145 octets). Le second passage a donc lu la clé du premier et l'a supprimée
(`route.ts`, « Régénération : l'ancien objet n'est plus référencé ») : **les deux générations ont
été séquentielles**, la seconde lancée entre 08:54:15 et 08:54:22. Ce n'est pas une requête
dupliquée au même instant.

Dans le code :
- `src/app/api/admin/atelier/souvenir/route.ts` : aucun verrou, aucune garde. Chaque appel relit
  les deux PDF du coffre (jusqu'à 130 Mo chacun), fusionne, écrit un nouvel objet, remplace la
  clé, supprime l'ancien. Deux appels = deux fois le travail, toujours acceptés.
- `src/app/admin/atelier/[token]/PanneauAction.tsx:959` : après un `envoyer_impression` réussi,
  un `fetch` best-effort lance la génération, **puis `router.refresh()` part immédiatement**
  (ligne 975), sans attendre. La fiche se recharge donc pendant la génération.
- `src/app/admin/atelier/donnees.ts:1090` : la carte ne connaît que `souvenir_pdf_key`, nulle tant
  que la fusion tourne. `Impression.tsx:321` affiche alors « Générer le PDF souvenir » et « Pas
  encore généré : le mail M7b attendra ce fichier pour partir. » : une invitation à cliquer.
- Le bouton de la carte est bien désactivé pendant SON appel (`genere.phase === "encours"`), mais
  il ignore l'appel parti du panneau : ce sont deux composants frères sans état commun.
- Aucun déclencheur serveur : ni la relève (`mails.ts` ne fait que retenir M7b via `manquePour`),
  ni le webhook Cloudprinter, ni la transition n'appellent la génération. Pas d'effet React qui la
  rejoue : les deux appels sont dans des gestionnaires de clic.

Le scénario cohérent avec toutes ces traces : la fiche rechargée à 08:54:07 dit « pas encore
généré », l'atelier clique « Générer » vers 08:54:20, la seconde fusion tourne et remplace la
première. Le résultat final est juste (un seul fichier, une seule clé), mais 134 Mo ont été lus,
fusionnés et écrits deux fois, et l'écran a menti pendant dix secondes. Si les deux appels avaient
été simultanés (deux onglets, un double clic très rapproché), le premier objet serait resté
**orphelin sur R2** (aucun des deux ne l'aurait vu comme « ancienne clé »), la famille de T-023.

## Ce que je propose
Le correctif le plus simple, sans migration, sans supprimer de code :
1. **Un verrou par dossier dans le journal**, règle pure dans `souvenir.ts`
   (`etatGenerationSouvenir`) et au harnais : la route journalise `souvenir_demarre` avant de
   lire le coffre ; si le dernier événement souvenir du dossier est un `souvenir_demarre` de
   moins de 5 minutes (la `maxDuration` de la route, un verrou ne peut pas survivre à la fonction)
   sans `souvenir_genere` ni `souvenir_echoue` derrière, la route rend **409 `deja_en_cours`**.
   Tout raté journalise `souvenir_echoue` et libère le verrou.
2. **La fiche sait qu'une génération tourne** : `donnees.ts` lit ce même journal (déjà chargé pour
   le récit, aucune requête de plus) et la carte affiche « Génération en cours… » avec l'heure,
   bouton éteint, au lieu de « pas encore généré ». Un 409 au clic affiche la même chose.
3. **Le panneau rafraîchit la fiche une seconde fois quand la fusion se termine** : la carte passe
   d'elle-même à « au coffre » sans recharger à la main.

## Ce qui a été fait
**21/09/2026, branche `fix/t122-souvenir-double-generation`, PR ouverte le jour même (PAS ENCORE EN
PROD : la fusion et le déploiement restent à faire).**
- `src/lib/atelier/souvenir.ts` : la règle pure `etatGenerationSouvenir(evenements, maintenant)` et
  les trois types `souvenir_demarre` / `souvenir_genere` / `souvenir_echoue` ; fenêtre
  `FENETRE_VERROU_SOUVENIR_MS` = 300 s = la `maxDuration` de la route (Next exige un littéral pour
  `maxDuration`, l'égalité est tenue par le harnais). Une horloge de base en avance d'une seconde
  ne libère pas le verrou ; une date illisible le libère (jamais bloqué pour toujours).
- `src/app/api/admin/atelier/souvenir/route.ts` : lit le dernier événement souvenir du dossier
  (une ligne), rend **409 `deja_en_cours` + `depuis`** si une fusion tourne, journalise
  `souvenir_demarre` (avec `par`) avant de toucher le coffre, et `souvenir_echoue` (avec la raison)
  sur chaque sortie en échec, exception comprise. Un journal illisible refuse (500) plutôt que de
  générer « au cas où ». Rien d'autre ne change : mêmes lectures, même écriture, même suppression
  de l'ancien objet.
- `donnees.ts` + `types.ts` + fixture de démo : `souvenirEnCours` (ISO du `souvenir_demarre` sans
  suite) calculé dans les 200 lignes de journal déjà chargées pour le récit, aucune requête de plus.
- `Impression.tsx` : nouvel état `ailleurs` ; le bouton est éteint et dit « Génération en cours… »
  quand la fiche l'apprend du journal OU quand le clic reçoit 409 ; la phrase dit l'heure de Paris
  (fixée, pour ne pas casser l'hydratation) et « rien à relancer ». « Pas encore généré » n'apparaît
  plus pendant une fusion.
- `PanneauAction.tsx` : le `fetch` best-effort après `envoyer_impression` enchaîne un second
  `router.refresh()` à sa fin, pour que la carte passe d'elle-même à « au coffre ».
- `recit.ts` : les trois événements ont une phrase (« a lancé la fabrication du PDF souvenir »,
  « PDF souvenir au coffre (128 Mo) », « La fabrication du PDF souvenir a échoué : raison »).
- Harnais : 13 cas dont le rejeu du 21/09 (démarré 08:54:07, clic à 08:54:20 → en cours).
  `tsc`, `lint` (0 erreur, 25 avertissements antérieurs, aucun sur les fichiers touchés), `build` et
  harnais (TOUT PASSE) verts. Rendu serveur de la carte vérifié dans ses trois états (avant, pendant,
  après) : boutons, phrases et `role="status"` conformes ; capture jointe à la PR.
- `docs/reference/ETAT-PRODUCTION.md` corrigé : il n'y a **pas** d'orphelin de 134 Mo au coffre, le
  second passage a supprimé le premier objet. `src/app/api/CLAUDE.md` : ligne de la route ajoutée.

Reste : fusionner, vérifier sur le déploiement qu'une commande réelle ne journalise plus qu'un
`souvenir_demarre` suivi d'un seul `souvenir_genere`. Ce que le verrou ne couvre PAS : deux appels
à moins de ~100 ms d'écart (entre la lecture du journal et l'écriture du `souvenir_demarre`) ; le
cas du 21/09 était à 13 s. Un verrou atomique demanderait une colonne, donc une migration :
volontairement écarté tant que ce cas n'a pas été vu.
