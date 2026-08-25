import Link from "next/link";
import "../../admin.css";
import "../atelier.css";

/**
 * L'écran d'attente d'une fiche.
 *
 * Même raison que la liste (cf. ../loading.tsx) : la fiche lit le dossier, ses
 * photos, son journal, ses mails et ses notes, PUIS signe une URL R2 par
 * vignette. Sur un lot de quatre-vingts photos, cela s'entend.
 *
 * Le lien de retour est déjà là, à sa place définitive : c'est la seule chose
 * qu'on puisse vouloir faire avant que la fiche arrive, et l'avoir sous la
 * souris évite le clic dans le vide qui vaut un aller-retour de plus.
 */

export default function Chargement() {
  return (
    <div className="adm-root ate-root ate-fiche ate-squelette" aria-busy="true" aria-live="polite">
      <span className="adm-sr">Chargement du dossier…</span>

      <header className="ate-fiche-tete">
        <Link href="/admin/atelier" className="ate-retour">
          ← Tous les dossiers
        </Link>
        <h1 className="ate-h1">
          <span className="ate-sq ate-sq--titre" />
        </h1>
      </header>

      <div className="ate-sq ate-sq--frise" />

      <div className="ate-colonnes">
        <div className="ate-colonne">
          <div className="ate-sq ate-sq--carte ate-sq--carte-haute" />
          <div className="ate-sq ate-sq--carte" />
        </div>
        <div className="ate-colonne ate-colonne--cote">
          <div className="ate-sq ate-sq--carte" />
        </div>
      </div>
    </div>
  );
}
