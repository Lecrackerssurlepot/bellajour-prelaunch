/**
 * La typographie française automatique (lot C, 12/11) : `typographie.md` §7. On change des SIGNES, jamais des mots :
 * l'espace fine avant ; ! ?, l'insécable avant :, les guillemets français, l'apostrophe courbe, les majuscules accentuées
 * (liste fermée), les ligatures œ et æ (liste fermée), le point de suspension, l'intervalle, les heures, les nombres.
 *
 * Appliquée à l'AFFICHAGE et à l'export (jamais au texte gardé) : ce que le client a tapé reste dans le magazine, l'écran
 * et les fichiers montrent la même version corrigée. Seulement sur le français : un texte espagnol (¡ ou ¿) garde ses
 * règles ; « Love » reste « Love ». Les prénoms, les marques et les mots qui existent aussi sans accent dans une autre
 * langue (hotel, mere, ocean) ne sont pas dans les listes : on ne corrige pas ce qu'on ne peut pas affirmer.
 *
 * Module PUR : ni React, ni réseau, ni horloge.
 */

/** Espace fine insécable (U+202F) et espace insécable (U+00A0). */
export const FINE = " ";
export const INSECABLE = " ";

/* ─────────────────────────── les listes fermées ─────────────────────────── */

/** Mot sans accent (clé) → le mot accentué, minuscules. Seulement ce que le français écrit toujours accentué. */
const MAJUSCULES_ACCENTUEES: Readonly<Record<string, string>> = {
  ete: "été", ecole: "école", etat: "état", etats: "états", ile: "île", iles: "îles", egypte: "égypte", ecosse: "écosse",
  equateur: "équateur", eglise: "église", etoile: "étoile", etoiles: "étoiles", ecume: "écume", ecureuil: "écureuil",
  evenement: "événement", evenements: "événements", epoque: "époque", fete: "fête", fetes: "fêtes", foret: "forêt", forets: "forêts",
  premiere: "première", derniere: "dernière", lumiere: "lumière", riviere: "rivière", frere: "frère", freres: "frères",
  cote: "côte", cotes: "côtes", tete: "tête", reve: "rêve", reves: "rêves", etait: "était", etre: "être", apres: "après",
  deja: "déjà", voila: "voilà", ca: "ça", fevrier: "février", decembre: "décembre", aout: "août",
  edimbourg: "édimbourg", geneve: "genève", seville: "séville", athenes: "athènes", etretat: "étretat", evian: "évian", elysee: "élysée",
};

/** Les mots qui, après un « A » de début de phrase, disent que c'est la préposition « À ». */
const APRES_A: ReadonlySet<string> = new Set([
  "notre", "votre", "nos", "vos", "la", "le", "les", "toi", "moi", "vous", "nous", "lui", "eux", "demain", "bientot", "tout", "tous",
  "toutes", "travers", "cote", "propos", "peine", "fond", "table", "pied", "deux", "trois", "quatre", "chacun", "chacune",
]);

/** Mot tapé sans ligature (minuscules) → avec. « poème » et « moelle » n'y sont pas. */
const LIGATURES: Readonly<Record<string, string>> = {
  coeur: "cœur", coeurs: "cœurs", soeur: "sœur", soeurs: "sœurs", voeu: "vœu", voeux: "vœux", oeuvre: "œuvre", oeuvres: "œuvres",
  oeil: "œil", oeillet: "œillet", oeuf: "œuf", oeufs: "œufs", boeuf: "bœuf", noeud: "nœud", noeuds: "nœuds", manoeuvre: "manœuvre",
};

/* ─────────────────────────── les outils ─────────────────────────── */

const sansAccent = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Rend au mot corrigé la casse du mot tapé : tout en capitales, ou capitale initiale. */
function memeCasse(tape: string, juste: string): string {
  if (tape.length > 1 && tape === tape.toLocaleUpperCase("fr") && tape !== tape.toLocaleLowerCase("fr")) return juste.toLocaleUpperCase("fr");
  if (tape[0] !== tape[0].toLocaleLowerCase("fr")) return juste.charAt(0).toLocaleUpperCase("fr") + juste.slice(1);
  return juste;
}

/** Un texte espagnol garde ses règles (« ¡Degustación local! », pas d'espace avant le « ! »). */
const estEspagnol = (t: string): boolean => /[¡¿]/.test(t);

/* ─────────────────────────── la correction ─────────────────────────── */

/**
 * Le texte, en français correct. Ligne par ligne : les retours à la ligne du client sont les siens (R-T-20). Un texte déjà
 * juste revient identique, et la correction est idempotente.
 */
export function typographieFrancaise(texte: string): string {
  return texte.split(/(\r\n|\r|\n)/).map((l, i) => (i % 2 ? l : ligne(l))).join("");
}

function ligne(l0: string): string {
  if (!l0.trim()) return l0;
  const espagnol = estEspagnol(l0);
  let t = l0;

  /* guillemets droits → français, par paires dans la ligne (un nombre impair de " : on n'y touche pas) */
  if ((t.match(/"/g) ?? []).length % 2 === 0) { let ouvre = true; t = t.replace(/"/g, () => { const g = ouvre ? "«" : "»"; ouvre = !ouvre; return g; }); }
  /* guillemets français : l'espace fine à l'intérieur, jamais d'espace en trop */
  t = t.replace(/«[   ]*/g, `«${FINE}`).replace(/[   ]*»/g, `${FINE}»`);
  /* apostrophe courbe : entre deux lettres, ou avant une année abrégée (’26) */
  t = t.replace(/(\p{L})'(?=\p{L})/gu, "$1’").replace(/(?<=^|\s)'(?=\d)/gu, "’");
  /* points de suspension : un seul signe */
  t = t.replace(/\.{3,}/g, "…");
  /* espaces : une seule entre deux mots, aucune avant , et . (celles de tête et de queue sont celles du client) */
  const tete = /^\s*/.exec(t)?.[0] ?? "", queue = /\s*$/.exec(t)?.[0] ?? "";
  let corps = t.slice(tete.length, t.length - queue.length);
  corps = corps.replace(/ {2,}/g, " ").replace(/ +([,.])/g, "$1");
  /* ; ! ? : l'espace fine insécable avant (sauf en espagnol), jamais entre deux signes de la famille (« ?! ») */
  if (!espagnol) {
    corps = corps.replace(/(?<=[\p{L}\p{N}»…)”’'])[   ]*([;!?])(?=[\s)»”’'"]|$|[;!?])/gu, `${FINE}$1`).replace(/([;!?])[   ]+(?=[;!?])/g, "$1");
  }
  /* : l'insécable avant, seulement quand il annonce (suivi d'une espace ou de la fin) : jamais dans 12:30 ni http:// */
  corps = corps.replace(/(?<=[\p{L}\p{N}»…)”’])[   ]*:(?=\s|$)/gu, `${INSECABLE}:`);
  /* intervalle : « 25 juin - 1er juillet » → demi-cadratin, insécable avant, espace après (un titre se coupe après le tiret) */
  corps = corps.replace(/(?<=\S) [-–—] (?=\S)/g, `${INSECABLE}– `);
  /* heures : 18H02, 18 h 02, 18h → 18 h 02 (insécables) ; jamais devant une lettre (« 3 hommes ») */
  corps = corps.replace(/(?<![\p{L}\p{N}])(\d{1,2})[   ]?[hH](?:[   ]?(\d{2}))?(?![\p{L}\p{N}])/gu, (m, h: string, mn: string | undefined) => {
    if (Number(h) > 24 || (mn !== undefined && Number(mn) > 59)) return m;
    return mn !== undefined ? `${h}${INSECABLE}h${INSECABLE}${mn}` : `${h}${INSECABLE}h`;
  });
  /* ordinaux, en texte simple : 1ER → 1er, 1ere ou 1ère → 1re, 2ème ou 2eme → 2e */
  corps = corps.replace(/(?<![\p{L}\p{N}])(\d+)(?:ER|er)(?![\p{L}])/gu, "$1er").replace(/(?<![\p{L}\p{N}])(\d+)(?:ÈRE|ERE|ère|ere)(?![\p{L}])/gu, "$1re")
    .replace(/(?<![\p{L}\p{N}])(\d+)(?:ÈME|EME|ème|eme)(?![\p{L}])/gu, "$1e");
  /* nombres : l'espace fine des milliers à partir de 5 chiffres (jamais une année, jamais un téléphone) ; l'unité collée au nombre */
  corps = corps.replace(/(?<![\d.,])[1-9]\d{4,}(?![\d.,])/g, (n) => n.replace(/\B(?=(\d{3})+(?!\d))/g, FINE))
    .replace(/(?<![\p{L}\p{N}])(\d+(?:,\d+)?)[   ]?(€|%|km|kg|cm|mm|ml|cl)(?![\p{L}\p{N}])/gu, `$1${FINE}$2`);
  /* ligatures et majuscules accentuées : mot à mot, listes fermées */
  const morceaux = corps.split(/(\P{L}+)/u);
  const premier = morceaux.findIndex((m) => /^\p{L}+$/u.test(m));
  morceaux.forEach((m, i) => {
    if (!/^\p{L}+$/u.test(m)) return;
    const bas = m.toLocaleLowerCase("fr");
    const lig = LIGATURES[bas];
    if (lig) { morceaux[i] = memeCasse(m, lig); return; }
    const majuscule = m[0] !== bas[0] && !(m.length <= 2 && m === m.toLocaleUpperCase("fr"));
    const acc = MAJUSCULES_ACCENTUEES[bas];
    /* seulement une MAJUSCULE tapée sans accent : « Ete » et « ETE » deviennent « Été » et « ÉTÉ », « ete » reste ce qu'il est */
    if (majuscule && acc && sansAccent(m) === bas && bas === sansAccent(acc)) { morceaux[i] = memeCasse(m, acc); return; }
    /* « A notre rythme » → « À notre rythme » : en début de phrase, devant un mot qui dit la préposition */
    if (m === "A") {
      const suivant = morceaux.slice(i + 1).find((x) => /^\p{L}+$/u.test(x));
      const debut = i === premier || /[.!?…]\s*$/.test(morceaux[i - 1] ?? "");
      if (debut && suivant && APRES_A.has(sansAccent(suivant))) morceaux[i] = "À";
    }
  });
  return tete + morceaux.join("") + queue;
}
