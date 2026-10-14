---
id: T-148
titre: Le client B2B prend son rendez-vous hors de l'espace et ne le retrouve pas dedans
etat: nouveau
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

## Ce qui attend Mathias (rien ne se devine)
- Vos agendas : Gmail personnels, ou Google Workspace ?
- Les règles : jours et heures de rendez-vous, durée d'un rendez-vous, délai minimum avant un
  rendez-vous, jusqu'à combien de jours à l'avance.
- Le lien visio de chacun (Google Meet fixe ou autre), ou le téléphone.
- Le texte du mail de confirmation (proposé par Claude, validé par Mathias) et l'accord pour
  que ces mails partent : ce sont de vrais mails à de vrais clients.
- Créer le compte de service Google (pas à pas guidé), puis Mathias et Louis partagent leur
  agenda avec son adresse.

## Ce qui a été fait
Rien encore. Ticket ouvert le 14/10/2026.
