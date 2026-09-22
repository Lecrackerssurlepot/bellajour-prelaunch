/**
 * Le lien Canva partagé — la partie PURE.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE (22/09/2026, T-126 et T-127)
 *
 * Le 21/09, la fiche de Marjorie a reçu le lien court `canva.link` du design
 * « Réferences » (le tableau d'inspiration de l'atelier) au lieu de celui de
 * « Marjorie ». La fiche l'a enregistré, la page du client l'a servi tel
 * quel, et Marjorie a vu nos références. Rien dans la chaîne n'a menti :
 * personne n'avait REGARDÉ où menait le lien avant de le publier. Un lien
 * court ne dit rien à l'œil, et le bouton Partager de Canva copie toujours
 * le design de l'onglet actif.
 *
 * Ce module lit ce qu'un lien dit de lui-même, et ce que la page publique
 * d'un design dit de son partage :
 *
 *  - `lireLienCanva`     : la forme d'une adresse (lien court à résoudre,
 *                          design identifié, ou autre chose).
 *  - `lireFicheCanva`    : le TITRE et le RÔLE DONNÉ PAR LE LIEN, lus dans
 *                          le HTML de la page `/view` du design. Canva y
 *                          sérialise la liste de contrôle d'accès du design ;
 *                          la règle de type `EXTENSION` est celle du lien
 *                          « toute personne ayant le lien », et son `role`
 *                          est ce que verra un inconnu qui l'ouvre.
 *  - `verdictLienPartage`: la décision. Le PRD §11 est catégorique : en
 *                          commentaire, jamais en édition. Ici cette règle
 *                          devient un refus, pas un rappel en orange.
 *
 * ⚠️ LE CHEMIN DE L'ADRESSE NE DIT PAS LE MODE. Un lien copié par le bouton
 * Partager en « peut commenter » se termine quand même par `/edit?…` : c'est
 * observé sur le lien de Marjorie (chemin `/edit`, rôle COMMENTER, et Canva
 * ouvre bien la barre « Commenting » à un visiteur anonyme). Refuser `/edit`
 * refuserait donc tous les bons liens. Seul le rôle fait foi.
 *
 * Tout ce qui touche au réseau est dans `canvaDistant.ts` ; ici, des chaînes
 * entrent, des verdicts sortent, et le harnais le prouve.
 * ══════════════════════════════════════════════════════════════════════════
 */

/** Les rôles que Canva écrit dans sa liste d'accès. */
export type RoleCanva = "OWNER" | "EDITOR" | "COMMENTER" | "VIEWER" | "NONE";

const ROLES: ReadonlySet<string> = new Set(["OWNER", "EDITOR", "COMMENTER", "VIEWER", "NONE"]);

export type LienCanva =
  /** `canva.link/xxx` : le bouton Partager. Il faut suivre la redirection. */
  | { forme: "court"; url: string }
  /** `canva.com/design/<id>/<extension>/<edit|view>` : un design identifié. */
  | { forme: "design"; designId: string; extension: string | null; chemin: "edit" | "view" | "autre" }
  /** Une adresse valide qui n'est pas chez Canva. */
  | { forme: "autre"; hote: string };

const HOTES_CANVA = new Set(["canva.com", "www.canva.com"]);

/** La forme d'un lien. `null` si ce n'est pas une adresse http(s). */
export function lireLienCanva(url: string): LienCanva | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const hote = u.hostname.toLowerCase();

  if (hote === "canva.link" || hote === "www.canva.link") return { forme: "court", url: u.toString() };

  if (HOTES_CANVA.has(hote)) {
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "design" && parts[1]) {
      const designId = parts[1];
      /* `/design/<id>/<extension>/edit` ou `/design/<id>/edit` (sans
         extension : le lien d'un propriétaire, pas un partage). */
      const dernier = parts[parts.length - 1];
      const chemin = dernier === "edit" ? "edit" : dernier === "view" ? "view" : "autre";
      const extension = parts.length >= 4 ? parts[2] : null;
      return { forme: "design", designId, extension, chemin };
    }
  }
  return { forme: "autre", hote };
}

/**
 * L'adresse de la page PUBLIQUE d'un design, celle que Canva sert à un
 * visiteur sans compte (vérifié le 22/09 : `/edit` répond 403 hors
 * navigateur, `/view` répond 200 avec le titre et la liste d'accès). Sans
 * extension, Canva répond 403 aussi : il n'y a rien à lire.
 */
export function urlLectureCanva(designId: string, extension: string | null): string | null {
  if (!extension) return null;
  return `https://www.canva.com/design/${encodeURIComponent(designId)}/${encodeURIComponent(extension)}/view`;
}

export type FicheCanva = {
  /** Le titre du design, tel que Canva l'annonce (`og:title`). */
  titre: string | null;
  /** Le rôle du lien « toute personne ayant le lien ». `null` : liste illisible. */
  roleLien: RoleCanva | null;
  /** `true` si la liste d'accès a été trouvée et lue. */
  acl: boolean;
};

function decoderEntites(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/* Le tableau JSON qui commence à `depuis` (un `[`), avec ses crochets
   appariés en ignorant ceux des chaînes. `null` si le tableau ne se ferme
   pas. Un `JSON.parse` sur un morceau de page ne se tente qu'à cette
   condition. */
function tableauJson(html: string, depuis: number): string | null {
  let profondeur = 0;
  let enChaine = false;
  for (let i = depuis; i < html.length; i++) {
    const c = html[i];
    if (enChaine) {
      if (c === "\\") i++;
      else if (c === '"') enChaine = false;
      continue;
    }
    if (c === '"') enChaine = true;
    else if (c === "[") profondeur++;
    else if (c === "]") {
      profondeur--;
      if (profondeur === 0) return html.slice(depuis, i + 1);
    }
    if (i - depuis > 20000) return null;
  }
  return null;
}

/**
 * Ce que la page publique d'un design dit de lui. Best-effort strict : une
 * page qu'on ne comprend pas rend des `null`, jamais une exception, et le
 * verdict en tire « non vérifié », pas « refusé ».
 */
export function lireFicheCanva(html: string): FicheCanva {
  const og = /<meta\s+property="og:title"\s+content="([^"]*)"/i.exec(html)
    ?? /<meta\s+content="([^"]*)"\s+property="og:title"/i.exec(html);
  const brut = og?.[1] ?? /<title>([^<]*)<\/title>/i.exec(html)?.[1] ?? "";
  const titreLu = decoderEntites(brut).trim();
  /* La page d'erreur de Canva s'intitule « Canva » tout court : ce n'est pas
     un titre de design. */
  const titre = titreLu && titreLu !== "Canva" ? titreLu : null;

  const marque = '"acl":{"rules":';
  const pos = html.indexOf(marque);
  if (pos === -1) return { titre, roleLien: null, acl: false };
  const texte = tableauJson(html, pos + marque.length);
  if (!texte) return { titre, roleLien: null, acl: false };

  let regles: unknown;
  try {
    regles = JSON.parse(texte);
  } catch {
    return { titre, roleLien: null, acl: false };
  }
  if (!Array.isArray(regles)) return { titre, roleLien: null, acl: false };

  const extension = regles.find(
    (r): r is { type: string; role?: unknown } =>
      typeof r === "object" && r !== null && (r as { type?: unknown }).type === "EXTENSION",
  );
  /* Pas de règle EXTENSION : le design n'est partagé par aucun lien. Un
     inconnu qui l'ouvre tombe sur « Demander l'accès » : c'est NONE. */
  if (!extension) return { titre, roleLien: "NONE", acl: true };
  const role = typeof extension.role === "string" && ROLES.has(extension.role) ? (extension.role as RoleCanva) : null;
  return { titre, roleLien: role, acl: true };
}

/** Ce que la résolution d'un lien a donné (le réseau vit dans canvaDistant.ts). */
export type ResolutionCanva =
  | { lu: true; designId: string; fiche: FicheCanva }
  | {
      lu: false;
      /* `ferme` : Canva a répondu par une redirection (303 vers sa page de
         connexion) sur la page publique du design. Vu le 22/09 sur un design
         jamais partagé ET sur une extension fausse : dans les deux cas, un
         inconnu qui ouvre le lien ne voit pas le design. `sans_extension` :
         l'adresse vient de la barre d'adresse du propriétaire, pas du bouton
         Partager, qui écrit toujours une extension. */
      raison: "lien_invalide" | "hors_canva" | "court_irresolu" | "sans_extension" | "ferme" | "illisible" | "reseau";
    };

export type VerdictCanva =
  | {
      ok: true;
      /** La phrase que l'atelier relit avant de confirmer. */
      phrase: string;
      /** `false` : Canva n'a pas pu être lu, la phrase le dit, l'atelier vérifie à l'œil. */
      verifie: boolean;
      titre: string | null;
      role: RoleCanva | null;
    }
  | { ok: false; message: string };

const COMMENT_PARTAGER =
  "Dans Canva : Partager, « Toute personne ayant le lien », « Peut commenter », puis recopie le lien.";

/**
 * La décision. Trois refus fermes quand Canva a été lu (édition, lecture
 * seule, personne), un passage avec le titre quand le lien est en
 * commentaire, et un passage « non vérifié » quand Canva n'a pas répondu :
 * une panne de leur côté ne doit pas empêcher de publier, mais elle doit
 * se voir à l'écran.
 */
export function verdictLienPartage(r: ResolutionCanva): VerdictCanva {
  if (!r.lu) {
    if (r.raison === "lien_invalide") return { ok: false, message: "Ce lien n'est pas une adresse valide." };
    if (r.raison === "hors_canva") return { ok: false, message: "Ce n'est pas un lien Canva." };
    if (r.raison === "sans_extension") {
      return {
        ok: false,
        message: `Ce lien vient de la barre d'adresse de ton Canva, pas du bouton Partager : le client ne pourrait pas l'ouvrir. ${COMMENT_PARTAGER}`,
      };
    }
    if (r.raison === "ferme") {
      return {
        ok: false,
        message: `Canva n'ouvre pas ce lien à un inconnu : le client verrait « Demander l'accès ». Le design n'est pas partagé, ou le lien n'est pas celui du bouton Partager. ${COMMENT_PARTAGER}`,
      };
    }
    return {
      ok: true,
      verifie: false,
      titre: null,
      role: null,
      phrase:
        "Canva n'a pas répondu : vérifie toi-même, dans un navigateur sans compte, que le lien ouvre le bon design en commentaire.",
    };
  }

  const { titre, roleLien } = r.fiche;
  const nom = titre ? `« ${titre} »` : "un design sans titre lisible";

  if (roleLien === "EDITOR" || roleLien === "OWNER") {
    return {
      ok: false,
      message: `Ce lien donne l'ÉDITION de ${nom} à qui l'a. ${COMMENT_PARTAGER}`,
    };
  }
  if (roleLien === "VIEWER") {
    return {
      ok: false,
      message: `Ce lien ouvre ${nom} en lecture seule : le client ne pourra pas noter ses retouches. ${COMMENT_PARTAGER}`,
    };
  }
  if (roleLien === "NONE") {
    return {
      ok: false,
      message: `Ce lien n'est ouvert à personne : le client verrait « Demander l'accès ». ${COMMENT_PARTAGER}`,
    };
  }
  if (roleLien === "COMMENTER") {
    return {
      ok: true,
      verifie: true,
      titre,
      role: roleLien,
      phrase: `Ce lien ouvre ${nom}, en commentaire pour qui l'a.`,
    };
  }
  /* Le design est lu (titre) mais sa liste d'accès ne l'est pas : on montre
     ce qu'on sait, et on dit ce qu'on ne sait pas. */
  return {
    ok: true,
    verifie: false,
    titre,
    role: null,
    phrase: `Ce lien ouvre ${nom}. Le mode de partage n'a pas pu être lu : vérifie qu'il est en commentaire.`,
  };
}
