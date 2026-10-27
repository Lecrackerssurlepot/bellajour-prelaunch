/* Plugin PostCSS local : le survol ne vaut que pour une souris.
   Sur iOS, :hover reste collé après un toucher. Toute règle dont un sélecteur
   contient :hover est donc enveloppée dans @media (hover: hover), sauf si un
   ancêtre @media parle déjà de hover. Une liste mixte (a:hover, a:focus-visible)
   est scindée : seule la partie :hover est enveloppée.
   Les @keyframes sont ignorés. */
const aSurvol = (sel) => /:hover\b/.test(sel);

const dejaProtege = (rule) => {
  for (let p = rule.parent; p; p = p.parent) {
    if (p.type === "atrule") {
      if (p.name === "keyframes" || /keyframes$/.test(p.name)) return true;
      if (p.name === "media" && /\bhover\s*:/.test(p.params)) return true;
    }
  }
  return false;
};

const plugin = () => ({
  postcssPlugin: "postcss-survol",
  Rule(rule, { AtRule }) {
    if (rule.__survol) return;
    if (!rule.selectors || !rule.selectors.some(aSurvol)) return;
    if (dejaProtege(rule)) return;

    const survol = rule.selectors.filter(aSurvol);
    const reste = rule.selectors.filter((s) => !aSurvol(s));

    const copie = rule.clone({ selectors: survol });
    copie.__survol = true;
    const media = new AtRule({ name: "media", params: "(hover: hover)" });
    media.append(copie);
    media.__survol = true;

    // La copie prend la place de la règle d'origine (même ordre dans la cascade).
    rule.after(media);
    if (reste.length) rule.selectors = reste;
    else rule.remove();
  },
});
plugin.postcss = true;
module.exports = plugin;
