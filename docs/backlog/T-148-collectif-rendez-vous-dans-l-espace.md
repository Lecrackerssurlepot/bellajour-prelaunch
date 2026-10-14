---
id: T-148
titre: Le client B2B prend son rendez-vous hors de l'espace et ne le retrouve pas dedans
etat: en cours
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-14
---
## Ce que Mathias a dit (14/10/2026)
« Il faut que ça affiche le rendez-vous pris, que ça envoie un mail de confirmation avec le
lien. Il faudra connecter nos calendriers. Il ne faut pas afficher mon calendrier, il faut
afficher les espaces disponibles : ne rien montrer de ce qu'il y a dedans, juste dire que ces
créneaux ne sont pas disponibles. Les disponibilités de la personne responsable du projet, qu'on
choisit dans l'atelier (moi ou Louis). Un affichage des prochains horaires disponibles, qui
n'emmène pas sur Google Calendar. Que la personne puisse modifier. Pas trop compliqué. »
Décision écrite en D23.

## Ce que j'ai vérifié (14/10)
- Aujourd'hui, « Prendre rendez-vous » ouvre `rdv_url` (une page Google) dans un nouvel
  onglet ; l'espace ne sait rien du rendez-vous (aucune donnée, PRD §12.13).
- Aucune connexion à un agenda dans le dépôt, aucun envoi de mail B2B (phase 7, T-146).

## Ce que je propose
Un moteur de créneaux simple, branché sur Google Agenda, dans le style de la maquette
RendezVous :
1. **Dans la fiche atelier** : choisir le responsable du projet (Mathias ou Louis).
2. **Les créneaux** : on lit dans l'agenda de ce responsable SEULEMENT les plages occupées
   (l'appel « free/busy » de Google ne rend ni titre, ni lieu, ni invité), on les retire des
   heures de rendez-vous réglées, et l'espace affiche les prochains créneaux libres.
3. **Réserver** : un clic → l'événement est posé dans l'agenda du responsable, le rendez-vous
   s'affiche dans l'espace (« Prochain rendez-vous » à droite, une carte dans le fil), un mail
   de confirmation part au client avec la date, le lien visio et un lien vers l'espace.
4. **Déplacer / annuler** depuis l'espace : l'événement est modifié ou retiré, un mail le dit.
Connexion pressentie : un compte de service Google avec lequel Mathias et Louis partagent leur
agenda (aucun mot de passe stocké, aucun jeton qui expire). À VÉRIFIER au premier geste :
inviter le client depuis un compte de service n'est pas permis hors Google Workspace, d'où le
mail de confirmation envoyé par nous (Brevo) avec un fichier d'agenda (.ics).

## Ce que Mathias a tranché (14/10/2026)
Du lundi au vendredi, de 10 h à 18 h ; créneaux de 30 minutes ; réservable jusqu'à la
demi-heure qui arrive, sans délai minimum, aussi loin qu'il y a de la place ; agendas Gmail ;
visio Google Meet (un lien fixe par personne) ; texte du mail proposé par Claude.

## Ce qui a été fait (14/10/2026, branche `feat/collectif-rendez-vous`)
- Règles pures (`creneaux.ts`), invitation `.ics` (`ics.ts`), texte des trois mails
  (`mailsRdv.ts`), connexion Google par compte de service (`agenda.ts`, free/busy seulement),
  gestes prendre / déplacer / annuler avec verrou en base (`rendezvous.ts`).
- Espace : « Prendre rendez-vous » ouvre le panneau des créneaux libres, semaine par semaine ;
  le rendez-vous s'affiche à droite et en carte dans le fil ; Déplacer, Annuler.
- Atelier : panneau « Rendez-vous » sur la fiche (interlocuteur, liste, annuler), page
  `/admin/collectif/agendas` (pas-à-pas Google, agenda et lien Meet, test lecture + écriture).
- Harnais : règles, fuseau (heure d'été / d'hiver), chevauchements, `.ics`, mails, vie privée,
  ordre verrou → Google, mails fermés par défaut.
- Vérifié AVANT la migration : routes en 503 qui nomment le fichier, lien d'équipe en 403,
  créneau passé refusé, espace inchangé (lien de la fiche), fiche et page Agendas qui le disent.

## Ce qui reste (Mathias, puis Claude)
1. ~~Appliquer la migration~~ : appliquée le 14/10 par Mathias, vérifiée en SQL ; le choix de
   l'interlocuteur marche (Mathias sur « Essai révision »).
2. Créer le compte de service Google et poser `GOOGLE_AGENDA_COMPTE` (pas-à-pas sur
   `/admin/collectif/agendas`), puis partager son agenda avec l'adresse affichée (Mathias, Louis).
3. Renseigner l'agenda et le lien Meet de chacun, « Tester la connexion ».
4. Relire le texte des mails ; ouvrir `COLLECTIF_MAILS_RDV` seulement après validation.
5. Claude : rejouer le parcours complet en vrai (prendre, déplacer, annuler, agenda, mail à
   l'adresse de Mathias), puis PR.
