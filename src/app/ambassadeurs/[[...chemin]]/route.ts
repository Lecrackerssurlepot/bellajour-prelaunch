/* /ambassadeurs/** : DÉSACTIVÉ le 26/11/2026 (Mathias : « tu peux désactiver
   cette page pour l'instant »). Le code (espace, charte, page « programme
   clos ») est dans archive/ambassadeurs/espace-2026-11/, avec son README.

   307 vers l'accueil, et pas 404 : des mails déjà partis (et ceux du webhook,
   de confirmer et de request-access) pointent encore vers
   /ambassadeurs/espace?token=… ; l'ambassadeur atterrit sur l'accueil plutôt
   que dans une impasse. 307 = temporaire (« pour l'instant ») : ni Google ni
   un navigateur ne fige la redirection.

   Un handler et pas une redirection de next.config : celle-ci recopie la
   requête, donc le jeton signé de l'ambassadeur (`?token=`) aurait suivi
   jusqu'à l'accueil et ses mesures d'audience. Ici, on repart de `/` nu. */

export function GET(requete: Request): Response {
  return Response.redirect(new URL('/', requete.url), 307)
}
