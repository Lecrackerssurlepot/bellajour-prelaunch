import { hrefACompleter, introACompleter, type LigneACompleter } from "@/lib/collectif/aCompleter";

/* L'encart « À compléter » de la vue d'ensemble (planche 7B du 21/10, validée par Mathias) : ce qui manque à
   l'édition, dans l'ordre où ça compte, POURQUOI, et un bouton qui ouvre le bon réglage. Composant serveur,
   sans état : la liste vient de `aCompleter` (lib/collectif/aCompleter.ts, pure, au harnais), jamais calculée ici.

   - Trois niveaux : « bloque les dépôts » (ambre), « conseillé » (bleu), « facultatif » ou « N champs » (gris).
   - Un bouton est un lien `data-onglet` + `data-etape` : `OngletsFiche` change d'onglet sans recharger et demande
     au formulaire de « Réglages et liens » l'étape où vit le champ (`etapeDemandee.ts`). Sans JavaScript, le
     lien porte la même adresse (`?onglet=reglages&etape=devis`) et la page serveur ouvre la bonne étape.
   - Une ligne disparaît dès que son champ est rempli ; l'encart disparaît quand tout l'est (liste vide : rien).
   - L'atelier seul le voit, jamais le client. */

const TON_POINT = { bloque: "eca-point", conseille: "eca-point eca-point--bleu", facultatif: "eca-point eca-point--gris" } as const;
const TON_PUCE = { bloque: "eca-puce--ambre", conseille: "eca-puce--bleu", facultatif: "eca-puce--gris" } as const;

export default function ACompleter({ lignes }: { lignes: LigneACompleter[] }) {
  if (lignes.length === 0) return null;
  return (
    <section className="eca-carte eca-acompleter" aria-labelledby="eca-ac-titre">
      <span className="eca-carte-tete">
        <h2 className="eca-carte-titre" id="eca-ac-titre">
          À compléter <span className="eca-ac-nb">{lignes.length}</span>
        </h2>
        <a href="?onglet=reglages" data-onglet="reglages" className="eca-carte-lien">
          Réglages et liens →
        </a>
      </span>
      <p className="eca-sous eca-ac-intro">{introACompleter(lignes)}</p>
      <ul className="eca-ac-liste">
        {lignes.map((l) => (
          <li key={l.cle} className="eca-ac-ligne">
            <span className={TON_POINT[l.niveau]} aria-hidden="true" />
            <span className="eca-ac-texte">
              <strong>{l.titre}</strong>
              <span className="eca-sous">{l.pourquoi}</span>
            </span>
            <span className={`eca-puce ${TON_PUCE[l.niveau]}`}>{l.puce}</span>
            <a
              href={hrefACompleter(l.ouvre)}
              data-onglet={l.ouvre.onglet}
              data-etape={l.ouvre.etape}
              className="eca-bouton eca-bouton--petit"
              aria-label={`${l.bouton} : ${l.titre}`}
            >
              {l.bouton}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
