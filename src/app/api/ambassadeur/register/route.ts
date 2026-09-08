import { NextResponse } from "next/server";

/* POST /api/ambassadeur/register — le Cercle Ambassadeur (Vague 1) est clos
   depuis le 01/09/2026, et sa page de vente est archivée le 08/09/2026
   (T-067, `archive/ambassadeurs/`). Cette route restait pourtant vivante et
   ouverte, et c'était le vrai danger (T-104) : elle ajoutait tout contact à
   la liste Brevo `BREVO_WAITLIST_LIST_ID` (valeur "3"), dont l'automation
   « Waitlist - Séquence W2 W3 » est ACTIVE — deux mails de prévente
   (J+2, J+4) partaient donc à qui s'inscrivait aujourd'hui, pour une offre
   qu'on n'honore plus.

   410 Gone, inconditionnel : plus jamais d'écriture en base, plus jamais
   d'appel à Brevo, quel que soit le corps envoyé. Ce n'est pas un drapeau
   d'environnement comme `preventeFermee()` (rien à rouvrir « en trente
   secondes » ici : le programme est clos pour de bon, pas suspendu) — c'est
   une porte fermée en dur.

   L'ancienne implémentation (upsert `waitlist`, envoi A1/A2, lien magique
   7 j) est conservée dans `archive/ambassadeurs/api-register-route/route.ts`
   — pas supprimée, au cas où le programme reprendrait un jour. Les routes
   voisines `/api/ambassadeur/me`, `/confirmer` et `/request-access` ne sont
   PAS touchées : elles servent le tableau de bord des ambassadeurs déjà
   confirmés (`/ambassadeurs/espace`), qui reste vivant. */

export async function POST() {
  return NextResponse.json({ error: "programme_clos" }, { status: 410 });
}
