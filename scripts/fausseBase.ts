/**
 * Une FAUSSE BASE en mémoire pour les harnais (aucun réseau, aucune base).
 * Ce n'est pas un script qu'on lance : `verif-atelier.ts` l'importe.
 *
 * COPIE de `baseEnMemoire` de `scripts/verif-collectif.ts` (20/10/2026, T-203),
 * mot pour mot à l'exportation près : ce harnais-là exécute du code au
 * chargement, on ne peut pas l'importer. Les deux copies lisent les filtres
 * comme PostgREST (`.in()` comme postgrest-js l'écrit vraiment, `.filter(c,
 * "in", …)` et `.or(…)` par la grammaire de PostgREST). À fusionner le jour où
 * `verif-collectif.ts` importera celle-ci.
 */

/**
 * Une liste `in` lue comme PostgREST la lit (`("a","b\"c",d)`) : une valeur entre guillemets doubles, où `\x`
 * vaut `x`, ou une valeur nue jusqu'à la virgule. `null` : illisible (PostgREST répondrait 400).
 */
export function lireListePostgrest(v: string): string[] | null {
  if (!v.startsWith("(") || !v.endsWith(")")) return null;
  const s = v.slice(1, -1);
  if (s === "") return [];
  const out: string[] = [];
  let i = 0;
  for (;;) {
    if (s[i] === '"') {
      let val = "";
      i++;
      while (i < s.length && s[i] !== '"') {
        if (s[i] === "\\" && i + 1 < s.length) {
          val += s[i + 1];
          i += 2;
        } else {
          val += s[i];
          i++;
        }
      }
      if (s[i] !== '"') return null;
      i++;
      out.push(val);
    } else {
      let j = i;
      while (j < s.length && s[j] !== ",") j++;
      out.push(s.slice(i, j));
      i = j;
    }
    if (i >= s.length) return out;
    if (s[i] !== ",") return null;
    i++;
  }
}

/** Ce que `.in(colonne, valeurs)` de postgrest-js 2.x met dans l'URL : des guillemets autour d'une valeur qui porte `,()` seulement, rien d'échappé. */
export function listeDePostgrestJs(valeurs: readonly string[]): string {
  return `(${[...new Set(valeurs)].map((s) => (/[,()]/.test(s) ? `"${s}"` : s)).join(",")})`;
}

export type LigneMem = Record<string, unknown>;
export type RenduMem = { data: unknown; error: { code: string; message: string } | null; count?: number | null };
export type PanneMem = (q: { table: string; op: string; lignes: LigneMem[]; payload: unknown }) => { code: string; message: string } | null;
export type RequeteMem = {
  select(c?: string, o?: Record<string, unknown>): RequeteMem;
  insert(p: unknown): RequeteMem;
  update(p: unknown, o?: Record<string, unknown>): RequeteMem;
  upsert(p: unknown, o?: Record<string, unknown>): RequeteMem;
  delete(): RequeteMem;
  eq(c: string, v: unknown): RequeteMem;
  is(c: string, v: unknown): RequeteMem;
  not(c: string, op: string, v: unknown): RequeteMem;
  in(c: string, v: readonly unknown[]): RequeteMem;
  filter(c: string, op: string, v: string): RequeteMem;
  or(s: string): RequeteMem;
  lt(c: string, v: string): RequeteMem;
  gt(c: string, v: string): RequeteMem;
  order(c: string, o?: { ascending?: boolean }): RequeteMem;
  range(de: number, a: number): RequeteMem;
  limit(n: number): RequeteMem;
  returns(): RequeteMem;
  maybeSingle(): Promise<RenduMem>;
  single(): Promise<RenduMem>;
  then<T>(oui: (r: RenduMem) => T, non?: (e: unknown) => T): Promise<T>;
};

let compteurMem = 0;
/** Un uuid prévisible (le harnais relit l'ordre des gestes, pas les valeurs). */
function randomUUIDMem(): string {
  compteurMem++;
  return `00000000-0000-4000-8000-${String(compteurMem).padStart(12, "0")}`;
}

/**
 * La fausse base. Les écritures s'appliquent aux tableaux ; `trace` garde l'ordre des gestes
 * (`insert:<table>[:<type>]`, `update:<table>:<n>`, `delete:<table>:<n>`, `select:<table>`) ;
 * `panne` refuse un geste choisi. Le journal du B2C (`evenements`) nomme son type dans la trace,
 * comme celui des éditions (`collectif_evenements`).
 */
export function baseEnMemoire(tables: Record<string, LigneMem[]>, panne: PanneMem = () => null) {
  const trace: string[] = [];
  let horloge = Date.parse("2026-10-20T08:00:00.000Z");
  const instant = () => new Date((horloge += 1000)).toISOString();
  const table = (t: string) => (tables[t] ??= []);
  const condition = (c: string): ((l: LigneMem) => boolean) => {
    const m = /^([a-z0-9_]+)\.(not\.is|is|eq|neq|in|gt|lt)\.([\s\S]*)$/.exec(c);
    if (!m) throw new Error(`fausse base : condition illisible ${c}`);
    const [, col, op, val] = m;
    if (op === "is") return (l) => l[col] === null || l[col] === undefined;
    if (op === "not.is") return (l) => l[col] !== null && l[col] !== undefined;
    if (op === "eq") return (l) => String(l[col]) === val;
    if (op === "neq") return (l) => l[col] !== null && l[col] !== undefined && String(l[col]) !== val;
    if (op === "gt") return (l) => l[col] !== null && l[col] !== undefined && String(l[col]) > val;
    if (op === "lt") return (l) => l[col] !== null && l[col] !== undefined && String(l[col]) < val;
    const liste = lireListePostgrest(val);
    if (!liste) throw new Error(`fausse base : liste illisible ${val}`);
    return (l) => l[col] !== null && l[col] !== undefined && liste.includes(String(l[col]));
  };
  const decouperOu = (s: string): string[] => {
    const out: string[] = [];
    let prof = 0;
    let guillemet = false;
    let mot = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (guillemet) {
        mot += ch;
        if (ch === "\\") mot += s[++i] ?? "";
        else if (ch === '"') guillemet = false;
        continue;
      }
      if (ch === '"') guillemet = true;
      if (ch === "(") prof++;
      if (ch === ")") prof--;
      if (ch === "," && prof === 0) {
        out.push(mot);
        mot = "";
        continue;
      }
      mot += ch;
    }
    out.push(mot);
    return out;
  };
  const requete = (t: string): RequeteMem => {
    let op = "select";
    let payload: unknown = null;
    let options: Record<string, unknown> | undefined;
    let rendre = false;
    const filtres: ((l: LigneMem) => boolean)[] = [];
    const tri: { c: string; asc: boolean }[] = [];
    let de = 0;
    let a = Infinity;
    let limite = Infinity;
    const journal = t === "collectif_evenements" || t === "evenements";
    const executer = async (unique: "single" | "maybe" | null): Promise<RenduMem> => {
      const lignes = table(t);
      const visees = op === "insert" || op === "upsert" ? [] : lignes.filter((l) => filtres.every((f) => f(l)));
      const err = panne({ table: t, op, lignes: visees, payload });
      if (err) return { data: null, error: err, count: null };
      let data: LigneMem[];
      if (op === "insert" || op === "upsert") {
        const nouvelles: LigneMem[] = (Array.isArray(payload) ? payload : [payload]).map((p) => ({ id: randomUUIDMem(), created_at: instant(), ...(p as LigneMem) }));
        if (op === "upsert") {
          const cles = String(options?.onConflict ?? "id").split(",");
          for (const n of nouvelles) {
            const i = lignes.findIndex((l) => cles.every((k) => l[k] === n[k]));
            if (i >= 0) lignes[i] = { ...lignes[i], ...n };
            else lignes.push(n);
          }
        } else lignes.push(...nouvelles);
        trace.push(`${op}:${t}${journal ? `:${nouvelles.map((n) => String(n.type)).join("+")}` : ""}`);
        data = nouvelles;
      } else if (op === "update") {
        for (const l of visees) Object.assign(l, payload as LigneMem);
        trace.push(`update:${t}:${visees.length}`);
        data = visees;
      } else if (op === "delete") {
        for (const l of visees) lignes.splice(lignes.indexOf(l), 1);
        trace.push(`delete:${t}:${visees.length}`);
        data = visees;
      } else {
        data = [...visees];
        for (const k of [...tri].reverse()) {
          data.sort((x, y) => {
            const vx = String(x[k.c] ?? "");
            const vy = String(y[k.c] ?? "");
            return (vx < vy ? -1 : vx > vy ? 1 : 0) * (k.asc ? 1 : -1);
          });
        }
        trace.push(`select:${t}`);
      }
      const count = options?.count === "exact" ? data.length : null;
      if (op === "select") data = data.slice(de, Math.min(a + 1, de + limite));
      else if (!rendre) data = [];
      const copie = data.map((l) => ({ ...l }));
      if (unique) {
        const d = copie[0] ?? null;
        if (unique === "single" && !d) return { data: null, error: { code: "PGRST116", message: "aucune ligne" } };
        return { data: d, error: null };
      }
      return { data: copie, error: null, count };
    };
    const q: RequeteMem = {
      select(_c, o) {
        if (op === "select") options = o;
        else rendre = true;
        return q;
      },
      insert(p) {
        op = "insert";
        payload = p;
        return q;
      },
      update(p, o) {
        op = "update";
        payload = p;
        options = o;
        return q;
      },
      upsert(p, o) {
        op = "upsert";
        payload = p;
        options = o;
        return q;
      },
      delete() {
        op = "delete";
        return q;
      },
      eq(c, v) {
        filtres.push((l) => String(l[c]) === String(v));
        return q;
      },
      is(c) {
        filtres.push((l) => l[c] === null || l[c] === undefined);
        return q;
      },
      not(c, o) {
        if (o !== "is") throw new Error(`fausse base : not ${o}`);
        filtres.push((l) => l[c] !== null && l[c] !== undefined);
        return q;
      },
      in(c, v) {
        const liste = lireListePostgrest(listeDePostgrestJs(v.map(String))) ?? [];
        filtres.push((l) => l[c] !== null && l[c] !== undefined && liste.includes(String(l[c])));
        return q;
      },
      filter(c, o, v) {
        filtres.push(condition(`${c}.${o}.${v}`));
        return q;
      },
      or(s) {
        const conds = decouperOu(s).map(condition);
        filtres.push((l) => conds.some((f) => f(l)));
        return q;
      },
      lt(c, v) {
        filtres.push(condition(`${c}.lt.${v}`));
        return q;
      },
      gt(c, v) {
        filtres.push(condition(`${c}.gt.${v}`));
        return q;
      },
      order(c, o) {
        tri.push({ c, asc: o?.ascending !== false });
        return q;
      },
      range(x, y) {
        de = x;
        a = y;
        return q;
      },
      limit(n) {
        limite = n;
        return q;
      },
      returns() {
        return q;
      },
      maybeSingle: () => executer("maybe"),
      single: () => executer("single"),
      then: (oui, non) => executer(null).then(oui, non),
    };
    return q;
  };
  return { client: { from: (t: string) => requete(t) }, tables, trace };
}
