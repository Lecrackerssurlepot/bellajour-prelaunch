/**
 * Le carnet de l'atelier, vu de haut — la règle de LECTURE, rien d'autre.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE MODULE EXISTE
 *
 * Les notes se saisissent dossier par dossier (`[token]/Carnet.tsx`) et se
 * relisent dossier par dossier. Or ce qu'on veut en tirer est transversal :
 * quarante notes lues À LA SUITE font apparaître les règles de composition
 * que le moteur de mise en page appliquera demain. Il fallait donc un écran
 * qui les rassemble, et un export qui les sorte.
 *
 * Deux appelants, une seule logique de tri et de filtre :
 *   — l'écran /admin/atelier/carnet, qui filtre dans le navigateur ;
 *   — la route d'export, qui refiltre côté serveur avec CE fichier.
 * Sans ce module partagé, le fichier téléchargé finirait par ne plus contenir
 * ce que l'écran montrait, et personne ne s'en apercevrait.
 *
 * PUR : aucune base, aucun réseau, aucune écriture. Il ne connaît ni Supabase
 * ni le cookie admin. C'est ce qui le rend vérifiable par
 * `scripts/verif-atelier.ts`.
 *
 * ⚠️ La table est `notes(id, numero_id, qui, texte, created_at)`, plus la
 * colonne `genre` AJOUTÉE le 08/09 (migration `20260908_notes_genre.sql`,
 * T-096 marche 1). Tant que la migration n'est pas appliquée, `genre` vaut
 * `null` partout — les lectures replient en 42703, les écritures en PGRST204,
 * et le carnet fonctionne exactement comme avant.
 * ══════════════════════════════════════════════════════════════════════════
 */

/**
 * Les cinq genres d'une note — le vocabulaire tranché par Mathias le 08/09.
 *
 * Ils séparent deux choses que le carnet mélangeait et qui n'ont rien à voir :
 * ce qui deviendra une RÈGLE DE COMPOSITION (photos, récit, page) et ce qui
 * relève de l'exploitation d'un dossier (cliente, atelier). Sans cette
 * coupure, le corpus qui doit servir de cahier des charges au moteur de mise
 * en page se dilue dans des relances téléphoniques.
 *
 * ⚠️ La clé est SANS ACCENT (`recit`) : c'est elle qui va en base et dans une
 * URL. Le libellé accentué ne sert qu'à l'affichage. Ne jamais stocker le
 * libellé.
 *
 * ⚠️ Le genre est FACULTATIF, et ça se défend : le texte libre reste le cœur.
 * Une note doit continuer de prendre trois secondes — si le genre devient
 * obligatoire, on cesse d'écrire et le corpus meurt. Une note sans genre est
 * une note valide, elle s'affiche et elle s'exporte comme les autres.
 */
export const GENRES_NOTE = [
  { cle: "photos", label: "Photos", aide: "Ce que disent les images" },
  { cle: "recit", label: "Récit", aide: "Ce que dit l'histoire" },
  { cle: "page", label: "Page", aide: "Une décision de mise en page" },
  { cle: "cliente", label: "Cliente", aide: "Ce qu'elle a demandé" },
  { cle: "atelier", label: "Atelier", aide: "Relance, impression, incident" },
] as const;

export type GenreNote = (typeof GENRES_NOTE)[number]["cle"];

/**
 * Le genre lu d'une source non fiable (base, URL, corps de requête).
 *
 * Tout ce qui n'est pas l'un des cinq mots devient `null` plutôt que de
 * remonter tel quel : la base n'a volontairement ni `check` ni enum (le
 * vocabulaire d'un métier bouge), donc c'est ICI que la validation vit.
 */
export function genreNote(v: unknown): GenreNote | null {
  if (typeof v !== "string") return null;
  const trouve = GENRES_NOTE.find((g) => g.cle === v.trim().toLowerCase());
  return trouve ? trouve.cle : null;
}

/** Le libellé affichable d'un genre, ou une chaîne vide si la note n'en a pas. */
export function libelleGenre(g: string | null | undefined): string {
  return GENRES_NOTE.find((x) => x.cle === g)?.label ?? "";
}

/**
 * Le plafond de lecture du carnet complet.
 *
 * Il n'est PAS là pour la performance mais pour qu'une base qui grossit ne
 * fasse jamais tomber l'écran en silence : au-delà, on montre les plus
 * récentes ET on le dit. Il vit ici, dans le module pur, parce que l'écran
 * doit pouvoir écrire le chiffre sans importer le chargeur (qui tire la
 * service key et n'a rien à faire dans un navigateur).
 */
export const PLAFOND_CARNET = 2000;

/** Le dossier d'où vient la note, tel que l'admin peut le nommer. */
export type DossierCarnet = {
  token: string;
  titre: string | null;
  prenom: string | null;
};

/** Une note, augmentée de son dossier et du prénom lisible de son auteur. */
export type NoteCarnet = {
  id: string;
  numeroId: string;
  /** La clé du compte (`mathias`, `louis`, `atelier`) — telle qu'en base. */
  qui: string;
  /** Le prénom affichable, résolu par l'appelant (`prenomDe`). */
  auteur: string;
  texte: string;
  createdAt: string;
  /**
   * Le genre, ou `null` — parce que la note n'en porte pas, OU parce que la
   * migration n'est pas encore appliquée. Les deux cas se ressemblent, et
   * c'est voulu : dans les deux, l'écran montre la note sans étiquette.
   */
  genre: GenreNote | null;
  /**
   * `null` quand la note survit à son dossier (dossier supprimé, ou
   * `numero_id` orphelin). On la GARDE : une note orpheline reste de la
   * matière, et la faire disparaître de l'écran serait une perte silencieuse.
   */
  dossier: DossierCarnet | null;
};

export type FiltreCarnet = {
  /** Recherche plein texte, mots séparés par des espaces, tous exigés. */
  q: string;
  /** Token du dossier, chaîne vide = tous. */
  dossier: string;
  /** Clé du compte auteur, chaîne vide = tous. */
  qui: string;
  /**
   * Genre exigé, `null` = tous.
   *
   * `"sans"` est une valeur à part entière : elle ne rend QUE les notes sans
   * genre. C'est le filtre qui sert à ranger l'existant — les centaines de
   * notes écrites avant que le genre existe.
   *
   * FACULTATIF, et dans le bon sens : un filtre qui ne parle pas du genre les
   * laisse TOUS passer. Un appelant qui oublie le champ montre une note de
   * trop, jamais une note de moins — c'est la seule erreur qu'on accepte dans
   * un carnet.
   */
  genre?: GenreNote | "sans" | null;
  /** Fenêtre en jours, `null` = depuis toujours. */
  jours: number | null;
};

export const FILTRE_CARNET_VIDE: FiltreCarnet = {
  q: "",
  dossier: "",
  qui: "",
  genre: null,
  jours: null,
};

/** Le filtre de genre lu d'une URL, `null` pour tout ce qu'on ne reconnaît pas. */
export function filtreGenre(v: string | null | undefined): GenreNote | "sans" | null {
  if (v === "sans") return "sans";
  return genreNote(v);
}

/* La période par défaut est « tout » et ce n'est pas un détail : un carnet
   sert à retrouver ce qu'on a appris il y a trois mois. Une fenêtre par
   défaut à 30 jours cacherait exactement la matière qu'on vient chercher. */
export const PERIODES_CARNET = [
  { cle: "7", label: "7 jours", jours: 7 },
  { cle: "30", label: "30 jours", jours: 30 },
  { cle: "90", label: "90 jours", jours: 90 },
  { cle: "tout", label: "Depuis toujours", jours: null },
] as const;

export type PeriodeCarnet = (typeof PERIODES_CARNET)[number]["cle"];

/** La période lue dans une URL, sans jamais faire confiance à la chaîne. */
export function periodeCarnet(cle: string | null | undefined): PeriodeCarnet {
  const trouvee = PERIODES_CARNET.find((p) => p.cle === cle);
  return trouvee ? trouvee.cle : "tout";
}

export function joursDePeriode(cle: PeriodeCarnet): number | null {
  return PERIODES_CARNET.find((p) => p.cle === cle)?.jours ?? null;
}

/**
 * Comment on nomme un dossier dans le carnet.
 *
 * Le titre d'abord (c'est ce que la cliente a écrit), le prénom ensuite, et
 * en dernier recours le token COURT. Jamais « sans titre » tout seul : une
 * ligne qu'on ne sait pas rattacher est une ligne qu'on ne relit pas.
 */
export function libelleDossier(d: DossierCarnet | null): string {
  if (!d) return "Dossier inconnu";
  const titre = (d.titre ?? "").trim();
  if (titre) return titre;
  const prenom = (d.prenom ?? "").trim();
  if (prenom) return prenom;
  return `Dossier ${referenceDossier(d)}`;
}

/**
 * Le token TRONQUÉ à 6 caractères — la seule forme qui sort du back-office.
 *
 * Même doctrine que l'export des métriques : ça suffit pour retrouver le
 * dossier à la main, et une fuite du fichier n'ouvre aucune page cliente.
 */
export function referenceDossier(d: DossierCarnet | null): string {
  return d ? d.token.slice(0, 6) : "";
}

/** Minuscules et sans accent : « récit » et « recit » sont le même mot. */
export function normaliserRecherche(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Tout ce sur quoi la recherche mord : le texte, le dossier, l'auteur. */
function meule(n: NoteCarnet): string {
  return normaliserRecherche(
    [n.texte, libelleDossier(n.dossier), referenceDossier(n.dossier), n.auteur, n.qui].join(" "),
  );
}

/**
 * Le filtre du carnet. Une seule implémentation, deux appelants.
 *
 * Recherche en ET sur les mots : « biarritz frere » ne rend que les notes qui
 * portent les deux. C'est ce qu'on attend d'un carnet quand on cherche un
 * souvenir précis, et ça reste prévisible sans opérateurs à apprendre.
 *
 * ⚠️ Une date illisible NE FAIT PAS disparaître la note sous un filtre de
 * période : on préfère montrer une note de trop plutôt qu'en perdre une.
 */
export function filtrerNotes(
  notes: NoteCarnet[],
  filtre: FiltreCarnet,
  maintenant: Date = new Date(),
): NoteCarnet[] {
  const mots = normaliserRecherche(filtre.q).split(/\s+/).filter(Boolean);
  const depuis =
    filtre.jours === null ? null : maintenant.getTime() - filtre.jours * 86_400_000;

  return notes
    .filter((n) => {
      if (filtre.dossier && n.dossier?.token !== filtre.dossier) return false;
      if (filtre.qui && n.qui !== filtre.qui) return false;
      if (filtre.genre === "sans") {
        if (n.genre !== null) return false;
      } else if (filtre.genre && n.genre !== filtre.genre) return false;
      if (depuis !== null) {
        const t = Date.parse(n.createdAt);
        if (!Number.isNaN(t) && t < depuis) return false;
      }
      if (mots.length) {
        const foin = meule(n);
        if (!mots.every((m) => foin.includes(m))) return false;
      }
      return true;
    })
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}

/* ──────────────────────────────── l'export ──────────────────────────────── */

const DATE_PARIS = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Une date lisible par un humain, ou la chaîne brute si elle est illisible. */
export function dateCarnet(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? iso : DATE_PARIS.format(new Date(t));
}

/* Un champ CSV sûr : on ne fait confiance à aucune note pour ne pas contenir
   un « ; », un guillemet ou un retour à la ligne. Une note EST du texte libre
   sur plusieurs lignes, c'est même sa raison d'être. */
function champ(v: string): string {
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function ligneCsv(...champs: string[]): string {
  return champs.map(champ).join(";");
}

/**
 * Le carnet en CSV, pour un tableur.
 *
 * Séparateur « ; » et décimales françaises comme l'export des métriques : le
 * fichier vise Excel francophone, pas un parseur. Le BOM UTF-8 est posé par
 * la route, avec les en-têtes HTTP.
 */
export function csvCarnet(notes: NoteCarnet[]): string {
  const L: string[] = [ligneCsv("Date", "Genre", "Auteur", "Dossier", "Référence", "Note")];
  for (const n of notes) {
    L.push(
      ligneCsv(
        dateCarnet(n.createdAt),
        /* Une note sans genre laisse la cellule VIDE. Écrire « aucun » ferait
           d'une absence une valeur, et un tri par genre remonterait alors une
           colonne pleine de mots qui ne veulent rien dire. */
        libelleGenre(n.genre),
        n.auteur,
        libelleDossier(n.dossier),
        referenceDossier(n.dossier),
        n.texte,
      ),
    );
  }
  return L.join("\r\n") + "\r\n";
}

/**
 * Le carnet en texte suivi, pour LE LIRE.
 *
 * C'est le format qui compte vraiment pour ce à quoi le carnet sert : on
 * ouvre le fichier, on lit quarante notes d'affilée, et les règles de
 * composition apparaissent. Un tableur, lui, sert à trier ; il ne se lit pas.
 */
export function texteCarnet(notes: NoteCarnet[], titre: string): string {
  const L: string[] = [titre, "=".repeat(titre.length), ""];
  if (!notes.length) L.push("Aucune note pour ce filtre.");
  for (const n of notes) {
    /* Le genre s'ajoute en fin de ligne d'en-tête, et SEULEMENT s'il existe :
       une note sans genre garde exactement l'en-tête qu'elle avait avant, sans
       mention d'absence qui polluerait la lecture à la suite. */
    const g = libelleGenre(n.genre);
    L.push(
      `${dateCarnet(n.createdAt)} · ${n.auteur} · ${libelleDossier(n.dossier)}${g ? ` · ${g}` : ""}`,
    );
    /* Le texte tel qu'écrit, retours à la ligne compris : une note reformatée
       n'est plus la note de celui qui l'a prise. */
    L.push(n.texte.replace(/\r\n/g, "\n").trimEnd());
    L.push("");
  }
  return L.join("\n");
}
