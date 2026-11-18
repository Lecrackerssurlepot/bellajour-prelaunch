/**
 * LE COMPOSITEUR (C20, 18/11/2026) : des photos lues à un magazine PROPOSÉ, chargé dans l'éditeur par le chemin du premier jet.
 *
 *   fiche (les questions, qui priment) → profil, sobriété (M-06), chapitres (M-05, N-32)
 *   → sélection (S-001, M-09 : la réserve ne garde que les faibles) → trame (decider.py : ouvertures, sommet, recettes, couvertures, M-10)
 *   → pose (poser/pose.ts : gabarits et recadrages du moteur de l'éditeur) → contrôle (mesurer.ts : les fautes)
 *
 * Portage fidèle du banc du tunnel (`design-explorations/tunnel-2026-11-17/compositeur/`, passe 10). Règles GÉNÉRALES seulement (M-01) :
 * aucun nom de projet, aucun numéro de photo. Module pur : ni React, ni réseau, ni horloge (`quand` est passé par l'appelant).
 */

import { COULEURS_ORIGINE, proposerNuancier } from "../nuancier";
import { styleValide, type StyleMagazine } from "../style";
import { FORMAT_PREMIER_JET, VERSION_PREMIER_JET, lirePremierJet, type PremierJet } from "../editeur/premierJet";
import { controler } from "./controle";
import { PAIRE_DU_PROFIL, chapitrer, devinerFiche, ficheEffective, profilDe, sobreDe, tailleACompose } from "./fiche";
import { Poseur } from "./pose";
import { charger, entonnoir } from "./selection";
import { entonnoirV2 } from "./selectionV2";
import { PARAMETRES_PROFIL } from "./reglagesCompositeur";
import { themeDeLOccasion } from "./fiche";
import type { EntreeCompo as Entree, PhotoCompo } from "./types";
import { ImpasseComposition, construireTrame, phraseAjustement } from "./trame";
import { motLaissee, motPlace } from "./mots";
import { REGLAGES_COMPO } from "./reglagesCompositeur";
import { templateParId, type Magazine } from "../magazine";
import type { Decision, EntreeCompo, EtatPhoto, IssueCompo, PhotoChoisie, ResultatCompo } from "./types";

export * from "./types";
export { REGLAGES_COMPO, REGLAGES_POSE, REGLES_COMPO, REGLES_POSE } from "./reglagesCompositeur";
export { AMBIANCES_FICHE, PROFILS, THEMES } from "./types";
export { LIEUX_MAX, MOT_AMBIANCE, MOT_THEME, TAILLES_PROPOSEES, autresTailles, devinerFiche, ficheEffective, lieuxDeTexte, lireFiche, profilDe, sobreDe, tailleACompose, titreImprimable } from "./fiche";
export { ImpasseComposition, motsPorteurs, phraseAjustement, teinteDe } from "./trame";
export { motLaissee, motPlace, nomCourt } from "./mots";
export { bandeCalme, entreeDepuisEditeur, type DonneesEditeur } from "./depuisEditeur";
export { REGLAGES_V2, REGLES_V2, PARAMETRES_PROFIL } from "./reglagesCompositeur";
export { TABLE_DENSITE, nombreVoulu, phraseDouble } from "./densite";
export { motsDesNotes, distanceEmpreinte } from "./notes";
export { QUESTIONS_CLIENT, themeDeLOccasion } from "./fiche";

/**
 * D12 (« OUI ») : les CORRECTIONS de l'atelier, gardées à part, priment TOUJOURS. Appliquées avant tout le reste : les tags corrigés
 * remplacent ceux de la lecture, les marques (coup de cœur, gardée, écartée, sortie) passent devant la machine, les réponses priment
 * sur la fiche. Rien n'est écrit dans la lecture : une nouvelle analyse ne les efface jamais.
 */
export function appliquerCorrections(e: Entree): Entree {
  const c = e.corrections;
  if (!c) return e;
  const ec = new Set(c.marques?.ecartees ?? []);
  const gardees = new Set([...(c.marques?.gardees ?? []), ...(c.marques?.coeurs ?? [])]);
  const photos: PhotoCompo[] = e.photos.map((p) => {
    const t = c.tags?.[p.id];
    let q: PhotoCompo = t ? { ...p, ia: { ...(p.ia ?? { interet: 0.6, role: null, sujet: null, plan: null, personnes: null, momentJournee: null, ambiance: null, lieuLu: null, couverture: false }), ...t } } : p;
    if (ec.has(p.id)) q = { ...q, ecart: { raison: "écartée par l'atelier", regle: "atelier" } };
    else if (gardees.has(p.id)) q = { ...q, gardee: true };
    return q;
  });
  const marques = { coeurs: [...new Set([...(e.marques?.coeurs ?? []), ...(c.marques?.coeurs ?? [])])], gardees: [...new Set([...(e.marques?.gardees ?? []), ...(c.marques?.gardees ?? [])])] };
  return { ...e, photos, fiche: { ...e.fiche, ...(c.reponses ?? {}) }, marques };
}

/** Les identifiants de règle qu'une phrase de pose cite (P-…, M-…, S-…, DA-…, N-…, D…). */
const REGLE = /\b(P\d?-\d+(?: bis| ter)?|M-\d+|S-\d+|DA-\d+|N-\d+|D\d+|C-\d+)\b/g;
const reglesDe = (s: string, defaut: string): string[] => { const m = s.match(REGLE); return m && m.length ? [...new Set(m)] : [defaut]; };

/** Le style proposé quand l'atelier n'en impose pas : la paire du profil, le nuancier tiré des couleurs réelles des photos (R-C-01). */
function styleDe(e: EntreeCompo, paire: string): StyleMagazine | null {
  if (e.style !== undefined) return e.style;
  const n = proposerNuancier(e.photos.map((p) => p.palette).filter((p) => p.length));
  const s: StyleMagazine = { paire, couleurs: { ...(n?.couleurs ?? COULEURS_ORIGINE) } };
  return styleValide(s) ? s : null;
}

/** E (18/11) : la page 1 ne montre jamais un repère (« Titre », « Légende ») comme un contenu proposé : un cadre de texte que la pose a
 *  laissé vide y est RETIRÉ (cadres retouchés), donc ni montré ni imprimé. */
function sansCadreVidePage1(m: Magazine): void {
  const d = m.planches[0]?.droite;
  if (!d || !d.textes.some((t) => !t.contenu.trim())) return;
  const t = d.cadres ? null : templateParId(d.templateId);
  const cadres = d.cadres ?? t?.cadres;
  if (!cadres) return;
  let k = 0;
  const garder: boolean[] = [];
  const nouveaux = cadres.filter((c) => {
    if (c.role === "photo") return true;
    const plein = !!d.textes[k++]?.contenu.trim();
    garder.push(plein);
    return plein;
  });
  m.planches[0] = { ...m.planches[0], droite: { ...d, textes: d.textes.filter((_, i) => garder[i] !== false), cadres: nouveaux.map((c) => ({ ...c })) } };
}

/** M-14 : le compositeur ne jette JAMAIS à l'écran : une issue, ou une phrase qui dit la cause et le geste. */
export function composerSur(e: EntreeCompo): IssueCompo {
  try {
    return { ok: true, r: composer(e) };
  } catch (err) {
    if (err instanceof ImpasseComposition) return { ok: false, phrase: err.phrase, cause: err.cause, geste: err.geste, technique: err.technique };
    const t = err instanceof Error ? err.message : String(err);
    return { ok: false, phrase: "La machine n'a pas pu composer ce magazine.", cause: "Une erreur de l'outil, pas de tes photos : rien n'a été changé.", geste: "Relance ; si ça recommence, dis-le avec la trace ci-dessous.", technique: t };
  }
}

export function composer(e0: EntreeCompo): ResultatCompo {
  const e = e0.v2 ? appliquerCorrections(e0) : e0;
  const journal: Decision[] = [];
  const devinee = devinerFiche(e.photos, e.voyage);
  const fiche0 = ficheEffective(e.fiche, devinee);
  /* M-15 : la taille n'est jamais demandée avant ; la machine la résout (choisie > commandée > M-09) */
  const tt = tailleACompose(fiche0.taille, e.pagesCommandees);
  const fiche = { ...fiche0, taille: tt.taille };
  /* v2 (décision 10) : l'occasion du questionnaire aide à deviner le thème quand ni la fiche ni le voyage ne le disent */
  if (e.v2 && !fiche.theme) { const t = themeDeLOccasion(fiche.occasion); if (t) { fiche.theme = t; journal.push({ quoi: "fiche", ou: "thème", detail: `deviné par l'occasion : ${t}`, regles: ["N-54", "D10"] }); } }
  journal.push({ quoi: "taille", ou: "magazine", detail: tt.origine === "commandee" ? `${tt.taille} pages : le nombre commandé` : tt.origine === "machine" ? "la machine propose : tout garder (M-09)" : `${tt.taille === "tout" ? "tout garder" : `${tt.taille} pages`} : choisi par l'atelier`, regles: ["M-15", "M-09"] });
  if (e.lectureDouteuse) journal.push({ quoi: "lecture", ou: "lecture IA", detail: `douteuse, non utilisée pour ${e.lectureDouteuse.photos} photos : ${e.lectureDouteuse.raison}`, regles: ["M-13"] });
  const profil = profilDe(fiche, e.voyage, e.photos);
  const sobre = sobreDe(fiche, profil, e.voyage);
  journal.push({ quoi: "fiche", ou: "profil", detail: `${profil}${fiche.theme ? `, thème ${fiche.theme}` : ""}${e.fiche.theme ? " (saisi)" : ""}`, regles: ["PROFILS"] });
  journal.push({ quoi: "fiche", ou: "sobriété", detail: sobre ? "sobre : aucun cadre tourné, aucun timbre" : "stylisée", regles: ["M-06"] });
  const chap = chapitrer(e.photos, fiche, e.voyage);
  /* les étapes saisies recoupent le temps : les lieux de l'IA (numérotés sur les chapitres du voyage) ne valent plus */
  const lieux = chap.fiche.size ? null : e.lieux;
  const P = charger(e, lieux, chap.chapitreDe);
  let selV2: ReturnType<typeof entonnoirV2> | null = null;
  if (e.v2) {
    const coeurs = new Set([...(e.marques?.coeurs ?? []), ...(fiche.preferees ?? [])]);
    const sorties = new Set(e.corrections?.marques?.sorties ?? []);
    for (const x of P.values()) { if (coeurs.has(x.id)) x.v2!.coeur = true; if (sorties.has(x.id)) x.v2!.sortie = true; }
    selV2 = entonnoirV2(P, fiche.personnes, journal);
  }
  const { cand } = selV2 ?? entonnoir(P, e.piles, journal);
  /* M-14 : pas de quoi composer : la cause en clair, et le geste */
  if (cand.length < REGLAGES_COMPO.PHOTOS_MIN) {
    const tous = [...P.values()];
    const n = (f: (x: (typeof tous)[number]) => boolean) => tous.filter(f).length;
    const causes = ([
      [n((x) => x.ecart?.[1] === "atelier"), "écartée par l'atelier", "écartées par l'atelier"],
      [n((x) => !!x.ecart && x.ecart[1] !== "atelier"), "floue, doublon ou rafale", "floues, doublons ou rafales"],
      [n((x) => x.reserve?.[1].startsWith("S-025") ?? false), "jugée faible à la lecture", "jugées faibles à la lecture"],
      [n((x) => x.reserve?.[1] === "M-09"), "à note trop basse", "à note trop basse"],
      [n((x) => x.reserve?.[1].startsWith("S-017") ?? false), "trop petite pour l'impression", "trop petites pour l'impression"],
    ] as const).filter(([k]) => k > 0).map(([k, un, plus]) => `${k} ${k > 1 ? plus : un}`);
    throw new ImpasseComposition(
      cand.length ? `Seulement ${cand.length} photo${cand.length > 1 ? "s" : ""} utilisable${cand.length > 1 ? "s" : ""} : pas de quoi faire un magazine.` : "Aucune photo utilisable : pas de quoi faire un magazine.",
      `Sur ${tous.length} photos : ${causes.join(", ") || "aucune n'est lisible"}.`,
      causes.some((c) => c.includes("lecture")) ? "Relis les photos, ou garde à la main celles qui comptent, puis relance." : "Garde à la main les photos qui comptent, puis relance.",
      `${cand.length} candidates sur ${tous.length} (minimum ${REGLAGES_COMPO.PHOTOS_MIN})`,
    );
  }
  const style = styleDe(e, PAIRE_DU_PROFIL[profil]);
  const parLieux = fiche.theme === "road_trip" || (!fiche.theme && e.voyage?.type === "road_trip");
  /* v2 (V2-TXT-03) : le titre du client d'abord (le seul texte qu'on n'invente pas), puis le pays lu, puis le nom du projet */
  const motTitre = (e.v2 ? (fiche.titreClient ?? "").trim() : "") || (e.voyage?.pays ?? "").trim() || e.titre.trim();
  const t = construireTrame({
    P, cand, chapNom: chap.nom, chapFiche: chap.fiche, parLieux, lieux: lieux ? { chapitres: lieux.chapitres, ancre: lieux.ancre } : null,
    fiche, titre: e.titre.trim(), motTitre, profil, sobre, style, couverture: e.couverture ?? null,
    v2: e.v2 && selV2 ? { reglages: e.v2, profil: PARAMETRES_PROFIL[profil], groupe: selV2.groupe, ordreDeSortie: selV2.ordreDeSortie, stylise: fiche.ambiance === "stylise" } : null,
  }, journal);

  const pose = new Poseur(t.trame, e.luminances, e.quand).poser();
  sansCadreVidePage1(pose.magazine);
  /* M-13 : les marques de l'atelier restent dans le tri du magazine proposé : ses coups de cœur restent des coups de cœur, ses gardées
     restent gardées (même hors des pages), aucune ne passe en réserve */
  if (e.marques && pose.magazine.tri) {
    const tri = pose.magazine.tri;
    const connues = new Set(Object.keys(pose.photosTable));
    const coeurs = e.marques.coeurs.filter((id) => connues.has(id));
    const gardees = new Set(e.marques.gardees.filter((id) => connues.has(id) && !coeurs.includes(id)));
    const ecartees = new Set(tri.ecartees);
    const choisies = [...new Set([...tri.choisies.filter((id) => !coeurs.includes(id)), ...[...gardees].filter((id) => !ecartees.has(id))])].sort();
    const garde = new Set([...coeurs, ...choisies]);
    pose.magazine.tri = { ...tri, choisies, ...(coeurs.length ? { coupsDeCoeur: coeurs } : {}) };
    const reserve = (tri.reserve ?? []).filter((id) => !garde.has(id));
    if (reserve.length) pose.magazine.tri.reserve = reserve; else delete pose.magazine.tri.reserve;
  }
  const jet: PremierJet = {
    format: FORMAT_PREMIER_JET, version: VERSION_PREMIER_JET, magazine: pose.magazine, photos: pose.photosTable,
    ...(Object.keys(pose.raisons).length ? { raisons: pose.raisons } : {}),
  };
  const relu = lirePremierJet(JSON.stringify(jet));
  if (!relu.ok) throw new ImpasseComposition("La proposition n'a pas pu être chargée.", "La machine a fabriqué une mise en page que l'éditeur refuse : une erreur de l'outil, rien n'a été changé.", "Relance ; si ça recommence, dis-le avec la trace ci-dessous.", `premier jet refusé par l'éditeur : ${relu.phrase}`);
  const controle = controler(t.trame, pose, pose.magazine);
  if (!pose.magazine.couverture && t.propositions.length) controle.signaux.push({ faute: "couverture non posée", ou: "couverture", detail: "aucune proposition ne passe sans couper un visage", regle: "P3-03" });

  /* les décisions de la pose, chacune avec sa règle */
  for (const p of pose.planches) for (const x of p.parties) for (const ec of [...x.ecarts]) journal.push({ quoi: `planche ${p.n}`, ou: x.gabarit, detail: ec, regles: reglesDe(ec, "P-08") });
  for (const ec of pose.ecarts) journal.push({ quoi: "pose", ou: "magazine", detail: ec, regles: reglesDe(ec, "P-08") });
  for (const c of pose.couvertures) for (const ec of c.ecarts) journal.push({ quoi: "couverture", ou: c.gabarit ?? "", detail: ec, regles: reglesDe(ec, "P-19") });

  /* M-02 : posées, couverture, réserve, écartées, chacune avec sa raison */
  const dansMag = new Set(pose.magazine.planches.flatMap((p) => [p.double, p.gauche, p.droite]).flatMap((d) => d?.photos.map((a) => a.photoId) ?? []).filter((x): x is string => !!x));
  const enCouverture = new Set((pose.magazine.couverture?.photos ?? []).map((a) => a.photoId).filter((x): x is string => !!x));
  const photos: PhotoChoisie[] = [];
  const pagesCompo = 2 * (pose.magazine.planches.length - 1);
  for (const x of P.values()) {
    const v2 = x.v2 ? { ...(x.v2.notes ? { notes: x.v2.notes } : {}), ...(x.v2.cause ? { cause: x.v2.cause } : {}), ...(x.v2.placement ? { placement: x.v2.placement } : {}), ...(x.v2.serie ? { serie: `${x.v2.serie.id} · ${x.v2.serie.type}${x.v2.serie.elue ? " · l'élue" : ""}` } : {}) } : {};
    const base = { id: x.id, chapitre: x.chap, note: x.s, ...v2 };
    /* E (18/11) : la raison en mots d'atelier ; la raison technique reste dans `detail` */
    if (x.ecart) photos.push({ ...base, etat: "ecartee", raison: motLaissee(x.ecart[0], pagesCompo), detail: x.ecart[0], regles: x.ecart[1].split(/,\s*/) });
    else if (dansMag.has(x.id)) photos.push({ ...base, etat: "posee", raison: motPlace(t.lieu.get(x.id)), detail: t.place.get(x.id) ?? "posée", regles: x.regles, place: t.place.get(x.id) });
    else if (enCouverture.has(x.id)) photos.push({ ...base, etat: "couverture", raison: "En couverture", detail: "en couverture", regles: ["M-03", "M-04", "M-10"] });
    else {
      const r = x.reserve ?? (t.nommees.has(x.id) ? ["proposée en couverture, gardée hors de l'intérieur", "M-10"] : ["laissée par la composition : aucune double ne la tenait", "P-02"]);
      photos.push({ ...base, etat: "reserve", raison: x.gardee && !x.reserve ? "Gardée par l'atelier, pas de place cette fois" : motLaissee(r[0], pagesCompo), detail: r[0], regles: r[1].split(/,\s*/) });
    }
  }
  const compte: Record<EtatPhoto, number> = { posee: 0, couverture: 0, reserve: 0, ecartee: 0 };
  for (const p of photos) compte[p.etat]++;
  const premiere = t.propositions[0];
  return {
    jet, pages: pagesCompo, taille: tt.taille, origineTaille: tt.origine,
    ajustement: t.ajustement ? { ...t.ajustement, phrase: phraseAjustement(t.ajustement.demandee, t.ajustement.obtenue, t.ajustement.photos) } : null,
    profil, sobre, chapitres: t.chapitres,
    decisions: journal, selection: { photos, compte }, controle,
    ...(e.v2 ? { version: 2 as const, doubles: t.doubles } : {}),
    ...(e.v2?.recadrage && e.v2.recadrage !== "aucun" ? { zones: Object.fromEntries([...P.values()].filter((x) => x.v2?.zone21).map((x) => [x.id, { coeur: x.v2!.zone21!.coeur ?? x.v2!.zone21!.zone, air: x.v2!.zone21!.zone, toutLeCadre: x.v2!.zone21!.toutLeCadre, recadrable: !!x.v2!.recadrable, conseil: x.v2!.conseil ?? null }])) } : {}),
    couverture: pose.magazine.couverture && premiere ? { premiere: premiere.premiere, quatrieme: premiere.quatrieme ?? [] } : null,
  };
}

/** Les fautes dures et leur nombre, pour un bandeau. */
export const nombreDeFautes = (r: ResultatCompo): number => r.controle.fautes.length;
