/**
 * L'interrupteur de l'Édition collective : `COLLECTIF_OUVERT` (PRD §0.4, §11).
 *
 * Sans lui, rien du B2B n'existe : `/edition`, `/depot` et `/admin/collectif`
 * répondent 404, les routes `/api/(admin/)collectif/*` aussi, et le lien
 * « Éditions collectives » n'apparaît pas dans l'admin.
 *
 * Même patron que `preventeFermee()` (src/lib/prevente.ts) : tolérant à la
 * casse, lu à CHAQUE appel (une instance chaude ne garde pas l'ancienne
 * valeur). Et la même conclusion sur une valeur incomprise : on FERME, et on
 * le crie dans les journaux. Un produit ouvert par erreur expose des pages
 * qui n'ont pas été recettées ; un produit fermé par erreur se rouvre en
 * corrigeant la variable.
 *
 * `lireInterrupteur` est pur (testé sans environnement par le harnais) ;
 * `collectifOuvert` est la seule fonction qui lit `process.env`.
 */

export const VAR_COLLECTIF = "COLLECTIF_OUVERT";

const OUI = new Set(["true", "1", "oui", "yes", "on"]);
const NON = new Set(["", "false", "0", "non", "no", "off"]);

export type LectureInterrupteur = { ouvert: boolean; incompris: boolean };

export function lireInterrupteur(brut: string | undefined | null): LectureInterrupteur {
  const v = (brut ?? "").trim().toLowerCase();
  if (OUI.has(v)) return { ouvert: true, incompris: false };
  if (NON.has(v)) return { ouvert: false, incompris: false };
  return { ouvert: false, incompris: true };
}

export function collectifOuvert(): boolean {
  const lu = lireInterrupteur(process.env[VAR_COLLECTIF]);
  if (lu.incompris) {
    console.error(
      `[collectif] ${VAR_COLLECTIF}="${process.env[VAR_COLLECTIF]}" n'est ni oui ni non : ` +
        `on garde fermé. Valeurs acceptées : ${[...OUI].join(", ")}.`
    );
  }
  return lu.ouvert;
}
