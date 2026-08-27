/**
 * Le suivi du colis — la partie PURE.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE
 *
 * Cloudprinter annonce l'expédition avec deux mots et rien d'autre :
 * `shipping_option` (« dpd_france ») et `tracking` (« 250A4B7C1234 »). Ni
 * l'un ni l'autre n'est montrable tel quel, et surtout : `tracking` est le
 * plus souvent un NUMÉRO, pas une adresse. Le webhook ne gardait que les
 * adresses (`https://…`) — donc, dans le cas courant, il ne gardait RIEN :
 * la fiche restait vide, la page de la cliente affichait « Transporteur »
 * sans suivi, et M7 partait avec un lien de suivi vide. C'est exactement ce
 * qu'a montré la recette du 26/08 (`tracking: "TEST123456789FR"`).
 *
 * Ici, un numéro devient une adresse cliquable quand on connaît le
 * transporteur, et reste TOUJOURS lisible quand on ne le connaît pas : le
 * code est conservé à part (`tracking_code`), affiché des deux côtés et
 * copiable. Un lien qu'on ne sait pas construire ne doit jamais effacer le
 * numéro qui, lui, marche partout.
 *
 * Aucune adresse n'est INVENTÉE : la table ne contient que des transporteurs
 * dont l'URL de suivi a été vérifiée. Un transporteur inconnu ne produit pas
 * de lien approximatif, il produit un numéro et le nom du transporteur.
 * ══════════════════════════════════════════════════════════════════════════
 */

export type Suivi = {
  /** Le transporteur, tel qu'il s'écrit chez la cliente. */
  transporteur: string;
  /** Le numéro de suivi, tel que le transporteur l'a donné. */
  code: string | null;
  /** L'adresse de suivi, cliquable. Null quand on ne sait pas la construire. */
  url: string | null;
};

/**
 * Les transporteurs qu'on sait nommer et suivre.
 *
 * `motifs` se compare à la forme normalisée de `shipping_option`
 * (« dpd_france » → « dpd france ») : un contient suffit, l'ordre décide en
 * cas d'ambiguïté. `suivi` est laissé à null quand l'adresse publique de
 * suivi n'est pas certaine — mieux vaut un numéro nu qu'un lien mort.
 */
const TRANSPORTEURS: Array<{
  motifs: string[];
  nom: string;
  suivi: ((code: string) => string) | null;
}> = [
  {
    motifs: ["chronopost"],
    nom: "Chronopost",
    suivi: (c) => `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${c}`,
  },
  {
    /* Colissimo, Lettre suivie, Colis Outre-mer : tout La Poste passe par
       le même outil de suivi. */
    motifs: ["colissimo", "la poste", "laposte"],
    nom: "Colissimo",
    suivi: (c) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${c}`,
  },
  {
    motifs: ["mondial relay"],
    nom: "Mondial Relay",
    suivi: (c) => `https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=${c}`,
  },
  {
    motifs: ["dpd"],
    nom: "DPD",
    suivi: (c) => `https://www.dpd.fr/trace/${c}`,
  },
  {
    motifs: ["gls"],
    nom: "GLS",
    suivi: (c) => `https://gls-group.eu/FR/fr/suivi-colis?match=${c}`,
  },
  {
    motifs: ["ups"],
    nom: "UPS",
    suivi: (c) => `https://www.ups.com/track?loc=fr_FR&tracknum=${c}`,
  },
  {
    motifs: ["dhl"],
    nom: "DHL",
    suivi: (c) => `https://www.dhl.com/fr-fr/home/tracking.html?tracking-id=${c}`,
  },
  {
    motifs: ["fedex"],
    nom: "FedEx",
    suivi: (c) => `https://www.fedex.com/fedextrack/?trknbr=${c}`,
  },
  {
    motifs: ["bpost"],
    nom: "bpost",
    suivi: (c) => `https://track.bpost.cloud/btr/web/#/search?itemCode=${c}`,
  },
  /* Vus dans la zone FR/BE/LU mais sans adresse de suivi vérifiée : on les
     nomme correctement, le numéro fait le reste. */
  { motifs: ["colis prive", "colisprive"], nom: "Colis Privé", suivi: null },
  { motifs: ["postnl"], nom: "PostNL", suivi: null },
  { motifs: ["tnt"], nom: "TNT", suivi: null },
];

/** « dpd_france » → « dpd france » : la forme sur laquelle on compare. */
function normaliser(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Le repli quand le transporteur est inconnu : « gls_express » → « Gls Express ». */
function capitaliser(v: string): string {
  return v.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

/**
 * Le nom du transporteur, tel qu'il s'écrit dans un mail et sur la page de
 * la cliente. Jamais vide : « Transporteur » est le dernier repli, parce que
 * M7 dit « confié à … » et ne peut pas dire « confié à  ».
 */
export function nomTransporteur(brut: string): string {
  const cle = normaliser(brut ?? "");
  if (!cle) return "Transporteur";
  const connu = TRANSPORTEURS.find((t) => t.motifs.some((m) => cle.includes(m)));
  return connu ? connu.nom : capitaliser(cle);
}

/**
 * Ce qu'on garde d'un ItemShipped : un nom, un numéro, une adresse.
 *
 * `tracking` arrive tantôt en adresse (rare), tantôt en numéro (le cas
 * courant). Une adresse est prise telle quelle. Un numéro est conservé ET
 * transformé en adresse quand le transporteur est connu.
 */
export function lireSuivi(brutTransporteur: string, brutTracking: string): Suivi {
  const transporteur = nomTransporteur(brutTransporteur ?? "");
  const brut = (brutTracking ?? "").trim();

  if (!brut) return { transporteur, code: null, url: null };

  /* Une adresse donnée par le transporteur vaut mieux que la nôtre : elle
     mène parfois à une page déjà personnalisée. */
  if (/^https?:\/\//i.test(brut)) return { transporteur, code: null, url: brut };

  const cle = normaliser(brutTransporteur ?? "");
  const connu = TRANSPORTEURS.find((t) => t.motifs.some((m) => cle.includes(m)));
  /* Les numéros de suivi n'ont ni espace ni accent : ce qui traîne autour
     (« nº », un retour à la ligne) ne doit pas partir dans l'URL. */
  const code = brut.replace(/\s+/g, "");

  return {
    transporteur,
    code,
    url: connu?.suivi ? connu.suivi(encodeURIComponent(code)) : null,
  };
}
