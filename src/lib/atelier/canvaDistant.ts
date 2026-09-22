/**
 * Le lien Canva partagé — la partie qui PARLE À CANVA.
 *
 * Deux requêtes au plus, sans clé, sans compte : suivre la redirection d'un
 * lien court `canva.link` (un 301 vers `canva.com/design/…`), puis lire la
 * page PUBLIQUE `/view` du design, la seule que Canva serve hors navigateur
 * (vérifié le 22/09/2026 : `/edit` répond 403, `/view` répond 200 avec le
 * titre et la liste d'accès). La lecture elle-même est dans `canva.ts`.
 *
 * Best-effort strict : rien ici ne throw. Une panne de Canva rend
 * `{ lu: false, raison: "reseau" }`, et le verdict en fait « non vérifié »,
 * pas un refus : on ne bloque pas une publication parce qu'un tiers ne
 * répond pas, on le DIT à l'écran.
 */

import { lireFicheCanva, lireLienCanva, urlLectureCanva, type ResolutionCanva } from "./canva";

const TIMEOUT_MS = 8000;
/* Canva répond 403 à un client sans en-tête de navigateur. Un User-Agent
   ordinaire suffit ; ce n'est pas un contournement, c'est la page publique
   que n'importe quel navigateur reçoit. */
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const SAUTS_MAX = 3;

async function suivreLienCourt(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (r.status < 300 || r.status > 399) return null;
    const vers = r.headers.get("location");
    if (!vers) return null;
    return new URL(vers, url).toString();
  } catch {
    return null;
  }
}

/** Où mène un lien, et ce que sa page publique dit du partage. */
export async function resoudreLienCanva(url: string): Promise<ResolutionCanva> {
  let lien = lireLienCanva(url);
  if (!lien) return { lu: false, raison: "lien_invalide" };

  for (let saut = 0; lien.forme === "court" && saut < SAUTS_MAX; saut++) {
    const vers = await suivreLienCourt(lien.url);
    if (!vers) return { lu: false, raison: "court_irresolu" };
    lien = lireLienCanva(vers);
    if (!lien) return { lu: false, raison: "court_irresolu" };
  }
  if (lien.forme === "court") return { lu: false, raison: "court_irresolu" };
  if (lien.forme === "autre") return { lu: false, raison: "hors_canva" };

  const lecture = urlLectureCanva(lien.designId, lien.extension);
  if (!lecture) return { lu: false, raison: "sans_extension" };

  try {
    /* `redirect: "manual"` : la redirection EST l'information. Un design non
       partagé, ou une extension fausse, répond 303 vers la connexion (vu le
       22/09) ; suivie, elle donnerait une page de connexion à 200 qu'on
       prendrait pour « illisible », donc pour un passage non vérifié. */
    const r = await fetch(lecture, {
      headers: { "user-agent": UA, accept: "text/html" },
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (r.status >= 300 && r.status <= 399) return { lu: false, raison: "ferme" };
    if (!r.ok) return { lu: false, raison: "illisible" };
    const html = await r.text();
    const fiche = lireFicheCanva(html);
    if (!fiche.titre && !fiche.acl) return { lu: false, raison: "illisible" };
    return { lu: true, designId: lien.designId, fiche };
  } catch {
    return { lu: false, raison: "reseau" };
  }
}
