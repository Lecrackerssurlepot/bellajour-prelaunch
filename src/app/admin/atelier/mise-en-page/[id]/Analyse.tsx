"use client";

/* LA PAGE « ANALYSE » (18/11 soir, M-34, fiche C21) : tout ce que la machine a lu et décidé, AVANT la mise en page, corrigeable d'un clic.
   (a) le projet en une ligne, (b) les questions, (c) les chapitres, (d) chaque photo et sa fiche (tags, cinq notes, zone importante,
   relations), (e) les filtres, (f) gardée, en réserve ou écartée, avec la raison, renversable. Les choix sont dans le module pur
   (`compositeur/analyse.ts`) ; les corrections sont gardées À PART (D12) et priment. Rien ici n'appelle l'IA. */

import { useMemo, useState } from "react";
import {
  CHOIX_PROJET, CRANS, MOT_ETAT_AVANT, MOT_NOTE, NOMS_NOTES, QUESTIONS_CLIENT, TAGS_ANALYSE, chapitresDeLAnalyse, corrigerTagAnalyse, etatAvant,
  filtrerPhotos, leconTagAnalyse, lieuxDeTexte, ligneDuProjet, motTag, relationsDe, renverser, valeurSuivante, valeurTag,
  type CleProjet, type CorrectionsAtelier, type Cran, type EntreeCompo, type EtatAvant, type Fiche, type FiltreAnalyse, type IAPhoto,
  type PhotoChoisie, type ReglagesV2, type ResultatCompo,
} from "@/lib/mise-en-page/compositeur";
import type { Lecon, Mesure } from "@/lib/mise-en-page/editeur";
import { cls, pluriel, type Adresse } from "./contexte";
import { vignetteDe } from "./images";

type Props = {
  r: ResultatCompo;
  /** L'entrée du compositeur, corrections APPLIQUÉES (ce que la machine compose) ; `iaLue` : la lecture telle que l'IA l'a rendue. */
  entree: EntreeCompo;
  iaLue: ReadonlyMap<string, IAPhoto | null>;
  saisie: Fiche;
  poser: (p: Partial<Fiche>) => void;
  devinee: Fiche;
  lu: { pays: string | null; qui: string | null };
  lieuxTexte: string;
  setLieuxTexte: (s: string) => void;
  corrections: CorrectionsAtelier;
  corriger: (c: CorrectionsAtelier) => void;
  lieux: ReglagesV2["lieux"];
  setLieux: (l: ReglagesV2["lieux"]) => void;
  dossier: { occasion: string | null; histoire: string | null; titre: string | null } | null;
  pagesCommandees: number | null;
  adresses: ReadonlyMap<string, Adresse>;
  mesures: Readonly<Record<string, Mesure>>;
  lecon: (l: Lecon) => void;
  ro: boolean;
};

const MOT_LIEUX: Readonly<Record<ReglagesV2["lieux"], string>> = { chapitres: "Aux chapitres", nouveaux: "Lieux nouveaux", partout: "Partout" };

export function VueAnalyse(p: Props) {
  const { r, entree, adresses } = p;
  const [choisie, setChoisie] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<FiltreAnalyse>({});
  const [edite, setEdite] = useState<CleProjet | null>(null);
  const ia = useMemo(() => new Map(entree.photos.map((x) => [x.id, x.ia])), [entree]);
  const moments = useMemo(() => new Map(entree.photos.map((x) => [x.id, x.moment])), [entree]);
  const ligne = ligneDuProjet(r, p.saisie, p.devinee, p.lu, entree.photos.map((x) => x.date));
  const chapitres = chapitresDeLAnalyse(r, p.saisie.chapitres);
  const parId = new Map(r.selection.photos.map((x) => [x.id, x]));
  const visibles = new Set(filtrerPhotos(r.selection.photos, ia, filtre).map((x) => x.id));
  const horsChapitre = r.selection.photos.filter((x) => x.chapitre === null || !chapitres.some((c) => c.numero === x.chapitre)).map((x) => x.id);
  const comptes: Record<EtatAvant, number> = { gardee: 0, reserve: 0, ecartee: 0 };
  for (const x of r.selection.photos) comptes[etatAvant(x)]++;
  const preferees = new Set(p.saisie.preferees ?? []);
  const filtreActif = !!(filtre.tag || filtre.note || filtre.etat);

  const vignettes = (ids: readonly string[]) => (
    <ul className="ed-ana-grille">
      {ids.filter((id) => visibles.has(id)).map((id) => {
        const x = parId.get(id)!;
        const et = etatAvant(x);
        return (
          <li key={id}>
            <button type="button" className={cls("ed-ana-vig", `ed-ana-vig--${et}`, choisie === id && "ed-ana-vig--choisie")} onClick={() => setChoisie(choisie === id ? null : id)}
              title={`${MOT_ETAT_AVANT[et]} · ${x.raison}`} aria-pressed={choisie === id}>
              {/* une image qui ne vient pas (adresse périmée, refusée) laisse la case vide, jamais l'icône cassée */}
              <img src={vignetteDe(adresses.get(id)) ?? undefined} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
              {preferees.has(id) ? <span className="ed-ana-coeur" aria-label="Préférée">♥</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="ed-ana-corps">
      <div className="ed-ana-gauche">
        {/* (a) le projet en une ligne */}
        <section className="ed-ana-bloc" aria-label="Le projet">
          <ul className="ed-ana-ligne">
            {ligne.map((m) => (
              <li key={m.cle}>
                <button type="button" className={cls("ed-ana-mot", m.corrige && "ed-ana-mot--corrige")} disabled={!m.corrigeable || p.ro} aria-expanded={edite === m.cle}
                  onClick={() => setEdite(edite === m.cle ? null : m.cle)}>
                  <span className="ed-compo-l">{m.etiquette}</span><span>{m.mot}</span>
                </button>
              </li>
            ))}
          </ul>
          {edite ? <EditeurMot cle={edite} saisie={p.saisie} poser={(f) => { p.poser(f); }} fermer={() => setEdite(null)} devinee={p.devinee} /> : null}
        </section>

        {/* (b) les questions */}
        <section className="ed-ana-bloc" aria-label="Les questions">
          <h4 className="ed-ana-h">Les questions</h4>
          {p.dossier && (p.dossier.occasion || p.dossier.titre || p.dossier.histoire) ? (
            <dl className="ed-ana-dossier">
              {p.dossier.occasion ? <><dt>Occasion</dt><dd>{p.dossier.occasion}</dd></> : null}
              {p.dossier.titre ? <><dt>Titre</dt><dd>{p.dossier.titre}</dd></> : null}
              {p.dossier.histoire ? <><dt>Histoire</dt><dd className="ed-ana-histoire">{p.dossier.histoire}</dd></> : null}
            </dl>
          ) : null}
          <p className="ed-compo-sous">{p.pagesCommandees ? `${p.pagesCommandees} pages commandées` : "La machine propose la taille"}</p>
          <label className="ed-compo-champ">
            <span className="ed-compo-l">{QUESTIONS_CLIENT[0].question}</span>
            <input type="number" min={1} max={60} inputMode="numeric" disabled={p.ro} value={p.saisie.personnes ?? ""} placeholder={p.devinee.personnes ? String(p.devinee.personnes) : "?"}
              onChange={(e) => { const n = Number(e.currentTarget.value); p.poser({ personnes: Number.isInteger(n) && n >= 1 && n <= 60 ? n : undefined }); }} />
          </label>
          <label className="ed-compo-champ">
            <span className="ed-compo-l">{QUESTIONS_CLIENT[1].question}</span>
            <input type="text" value={p.lieuxTexte} disabled={p.ro} placeholder="Facultatif" maxLength={400} onChange={(e) => p.setLieuxTexte(e.currentTarget.value)} />
          </label>
          <div className="ed-compo-champ">
            <span className="ed-compo-l">{QUESTIONS_CLIENT[2].question}</span>
            <span className="ed-compo-sous">{preferees.size ? pluriel(preferees.size, "photo choisie", "photos choisies") : "Cœur sur la fiche"}</span>
          </div>
          <div className="ed-compo-champ">
            <span className="ed-compo-l">Les lieux : aux chapitres seulement, ou partout ?</span>
            <span className="ed-compo-choix">
              {(["chapitres", "nouveaux", "partout"] as const).map((l) => (
                <button key={l} type="button" disabled={p.ro} aria-pressed={p.lieux === l} onClick={() => p.setLieux(l)}>{MOT_LIEUX[l]}</button>
              ))}
            </span>
          </div>
        </section>

        {/* (e) les filtres, (f) les comptes */}
        <section className="ed-ana-bloc ed-ana-filtres" aria-label="Filtres">
          <span className="ed-compo-choix">
            {(["gardee", "reserve", "ecartee"] as const).map((et) => (
              <button key={et} type="button" aria-pressed={filtre.etat === et} onClick={() => setFiltre({ ...filtre, etat: filtre.etat === et ? null : et })}>
                {MOT_ETAT_AVANT[et]} · {comptes[et]}
              </button>
            ))}
          </span>
          <span className="ed-ana-selects">
            <select aria-label="Filtrer par note" value={filtre.note ? `${filtre.note.nom}:${filtre.note.cran}` : ""}
              onChange={(e) => { const [nom, cran] = e.currentTarget.value.split(":"); setFiltre({ ...filtre, note: nom ? { nom: nom as (typeof NOMS_NOTES)[number], cran: cran as Cran } : null }); }}>
              <option value="">Toutes les notes</option>
              {NOMS_NOTES.flatMap((n) => CRANS.map((c) => <option key={`${n}:${c}`} value={`${n}:${c}`}>{MOT_NOTE[n]} {c}</option>))}
            </select>
            <select aria-label="Filtrer par tag" value={filtre.tag ? `${String(filtre.tag.cle)}:${JSON.stringify(filtre.tag.v ?? "absent")}` : ""}
              onChange={(e) => {
                const v = e.currentTarget.value;
                if (!v) { setFiltre({ ...filtre, tag: null }); return; }
                const i = v.indexOf(":");
                const val = JSON.parse(v.slice(i + 1)) as string | number | boolean | null;
                setFiltre({ ...filtre, tag: { cle: v.slice(0, i) as keyof IAPhoto, v: val === "absent" ? undefined : val } });
              }}>
              <option value="">Tous les tags</option>
              {TAGS_ANALYSE.flatMap((t) => t.valeurs.map((x) => <option key={`${String(t.cle)}:${JSON.stringify(x.v)}`} value={`${String(t.cle)}:${JSON.stringify(x.v)}`}>{t.mot} · {x.mot}</option>))}
            </select>
            {filtreActif ? <button type="button" className="ed-lien" onClick={() => setFiltre({})}>Tout voir</button> : null}
          </span>
        </section>

        {/* (c) les chapitres, renommables, avec leurs photos */}
        {chapitres.filter((c) => !filtreActif || c.photos.some((id) => visibles.has(id))).map((c) => (
          <section key={c.numero} className="ed-ana-bloc ed-ana-chap" aria-label={`Chapitre ${c.numero}`}>
            <label className="ed-ana-chap-tete">
              <span className="ed-compo-l">Chapitre {c.numero}</span>
              <input type="text" className={cls("ed-ana-chap-titre", c.renomme && "ed-ana-mot--corrige")} defaultValue={c.titre} key={c.titre} maxLength={60} disabled={p.ro}
                onBlur={(e) => {
                  const v = e.currentTarget.value.replace(/\s+/g, " ").trim();
                  const base = r.chapitres.find((x) => x.numero === c.numero)?.titre ?? "";
                  const ch = { ...(p.saisie.chapitres ?? {}) };
                  if (!v || v === base) delete ch[String(c.numero)]; else ch[String(c.numero)] = v;
                  p.poser({ chapitres: Object.keys(ch).length ? ch : undefined });
                }} />
            </label>
            {vignettes(c.photos)}
          </section>
        ))}
        {filtreActif && !visibles.size ? <p className="ed-compo-sous">Aucune photo</p> : null}
        {horsChapitre.length && (!filtreActif || horsChapitre.some((id) => visibles.has(id))) ? (
          <section className="ed-ana-bloc ed-ana-chap" aria-label="Hors chapitre">
            <span className="ed-compo-l">Hors chapitre</span>
            {vignettes(horsChapitre)}
          </section>
        ) : null}
      </div>

      {/* (d) la fiche de la photo choisie */}
      {choisie && parId.get(choisie) ? (
        <FichePhoto key={choisie} x={parId.get(choisie)!} ia={ia.get(choisie) ?? null} lu={p.iaLue.get(choisie) ?? null} r={r}
          relations={relationsDe(r, choisie, moments)} adresses={adresses} mesure={p.mesures[choisie]} corrections={p.corrections} corriger={p.corriger}
          lecon={p.lecon} preferee={preferees.has(choisie)} ro={p.ro} fermer={() => setChoisie(null)} ouvrir={setChoisie}
          basculerPreferee={() => {
            const l = new Set(p.saisie.preferees ?? []);
            if (l.has(choisie)) l.delete(choisie); else if (l.size < 10) l.add(choisie);
            p.poser({ preferees: l.size ? [...l].sort() : undefined });
          }} />
      ) : (
        <aside className="ed-ana-fiche ed-ana-fiche--vide"><p className="ed-compo-sous">Touchez une photo</p></aside>
      )}
    </div>
  );
}

function EditeurMot({ cle, saisie, poser, fermer, devinee }: { cle: CleProjet; saisie: Fiche; poser: (f: Partial<Fiche>) => void; fermer: () => void; devinee: Fiche }) {
  if (cle === "qui") {
    return (
      <div className="ed-ana-edite">
        <input type="number" min={1} max={60} autoFocus aria-label="Combien de personnes" defaultValue={saisie.personnes ?? devinee.personnes ?? ""}
          onKeyDown={(e) => { if (e.key === "Enter") fermer(); }}
          onChange={(e) => { const n = Number(e.currentTarget.value); poser({ personnes: Number.isInteger(n) && n >= 1 && n <= 60 ? n : undefined }); }} />
        <button type="button" className="ed-bt" onClick={fermer}>OK</button>
      </div>
    );
  }
  if (cle === "ou") {
    return (
      <div className="ed-ana-edite">
        <input type="text" autoFocus aria-label="Où" maxLength={60} defaultValue={saisie.pays ?? ""}
          onKeyDown={(e) => { if (e.key === "Enter") fermer(); }}
          onChange={(e) => { const v = e.currentTarget.value.replace(/\s+/g, " ").trim(); poser({ pays: v || undefined }); }} />
        <button type="button" className="ed-bt" onClick={fermer}>OK</button>
      </div>
    );
  }
  const choix = cle === "type" ? CHOIX_PROJET.type : cle === "profil" ? CHOIX_PROJET.profil : cle === "ambiance" ? CHOIX_PROJET.ambiance : [];
  const actuel = cle === "type" ? saisie.theme : cle === "profil" ? saisie.profil : saisie.ambiance;
  return (
    <div className="ed-ana-edite">
      <span className="ed-compo-choix">
        {choix.map((c) => (
          <button key={c.v} type="button" aria-pressed={actuel === c.v} onClick={() => {
            const v = actuel === c.v ? undefined : c.v;
            poser(cle === "type" ? { theme: v as Fiche["theme"] } : cle === "profil" ? { profil: v as Fiche["profil"] } : { ambiance: v as Fiche["ambiance"] });
            fermer();
          }}>{c.mot}</button>
        ))}
      </span>
    </div>
  );
}

function FichePhoto({ x, ia, lu, r, relations, adresses, mesure, corrections, corriger, lecon, preferee, basculerPreferee, ro, fermer, ouvrir }: {
  x: PhotoChoisie; ia: IAPhoto | null; lu: IAPhoto | null; r: ResultatCompo; relations: ReturnType<typeof relationsDe>; adresses: ReadonlyMap<string, Adresse>;
  mesure: Mesure | undefined; corrections: CorrectionsAtelier; corriger: (c: CorrectionsAtelier) => void; lecon: (l: Lecon) => void;
  preferee: boolean; basculerPreferee: () => void; ro: boolean; fermer: () => void; ouvrir: (id: string) => void;
}) {
  const [chaleur, setChaleur] = useState(false);
  const et = etatAvant(x);
  const zone = r.zones?.[x.id];
  const a = adresses.get(x.id);
  const src = a?.moyenne ?? a?.vignette ?? a?.original ?? undefined;
  const cases = mesure?.chaleur ?? "";
  /* la lecture brute (avant correction) : la valeur « lue » qu'une correction remplace ; corrigée = différente */
  const brut = (cle: keyof IAPhoto) => valeurTag(lu, cle);
  return (
    <aside className="ed-ana-fiche" aria-label="Fiche de la photo">
      <div className="ed-ana-fiche-tete">
        <span className={cls("ed-ana-etat", `ed-ana-etat--${et}`)}>{MOT_ETAT_AVANT[et]}</span>
        <button type="button" className="ed-bt" onClick={fermer} aria-label="Fermer la fiche">Fermer</button>
      </div>
      <div className="ed-ana-image">
        {src ? <img src={src} alt="" /> : <span className="ed-compo-sous">Image absente</span>}
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
          {chaleur && cases.length === 256 ? [...cases].map((c, i) => {
            const v = Number(c);
            return v > 1 ? <rect key={i} x={(i % 16) / 16} y={Math.floor(i / 16) / 16} width={1 / 16} height={1 / 16} fill="#ff5a1f" fillOpacity={(v / 9) * 0.6} /> : null;
          }) : null}
          {zone ? <rect x={zone.air[0]} y={zone.air[1]} width={zone.air[2]} height={zone.air[3]} fill="none" stroke="#fff" strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" /> : null}
          {zone ? <rect x={zone.coeur[0]} y={zone.coeur[1]} width={zone.coeur[2]} height={zone.coeur[3]} fill="none" stroke="#ffd23f" strokeWidth={2} vectorEffect="non-scaling-stroke" /> : null}
          {(mesure?.visages ?? []).map((v, i) => <rect key={`v${i}`} x={v.x} y={v.y} width={v.l} height={v.h} fill="none" stroke="#3ddc84" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />)}
        </svg>
      </div>
      <div className="ed-ana-actions">
        <button type="button" className="ed-bt" aria-pressed={chaleur} onClick={() => setChaleur(!chaleur)}>Carte de chaleur</button>
        <button type="button" className="ed-bt" aria-pressed={preferee} disabled={ro} onClick={basculerPreferee}>{preferee ? "♥ Préférée" : "♡ Préférée"}</button>
        <button type="button" className="ed-bt ed-bt--plein" disabled={ro} onClick={() => corriger(renverser(corrections, x.id, et))}>
          {et === "gardee" ? "Mettre en réserve" : "Garder"}
        </button>
      </div>
      <p className="ed-ana-raison">{x.raison}</p>
      {zone?.proteges ? <p className="ed-compo-sous">Jamais rognée : {zone.proteges.split(" : ")[0]}</p> : zone?.toutLeCadre ? <p className="ed-compo-sous">Tout le cadre compte</p> : null}

      {x.notes ? (
        <ul className="ed-ana-notes" aria-label="Les cinq notes">
          {NOMS_NOTES.map((n) => (
            <li key={n} className={`ed-ana-note ed-ana-note--${x.notes![n].cran}`}>
              <span className="ed-ana-note-nom">{MOT_NOTE[n]}</span>
              <span className="ed-ana-note-cran">{x.notes![n].cran}</span>
              <span className="ed-ana-note-phrase">{x.notes![n].phrase}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="ed-ana-tags" aria-label="Les tags">
        {TAGS_ANALYSE.map((t) => {
          const v = valeurTag(ia, t.cle);
          const corrige = !!corrections.tags?.[x.id] && t.cle in (corrections.tags[x.id] ?? {});
          return (
            <li key={String(t.cle)}>
              <button type="button" className={cls("ed-ana-tag", corrige && "ed-ana-mot--corrige", v === undefined && "ed-ana-tag--absent")} disabled={ro}
                title={corrige ? `Lu : ${motTag(t, brut(t.cle))}` : "Toucher pour corriger"}
                onClick={() => {
                  const suiv = valeurSuivante(t, v);
                  const avantLu = brut(t.cle);
                  corriger(corrigerTagAnalyse(corrections, x.id, t.cle, suiv, avantLu));
                  if (suiv !== avantLu) lecon(leconTagAnalyse(x.id, t, avantLu, suiv));
                }}>
                <span className="ed-compo-l">{t.mot}</span> {motTag(t, v)}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="ed-ana-relations">
        {relations.serie ? <p><span className="ed-compo-l">Série</span> {relations.serie.split(" · ").slice(1).join(" · ") || relations.serie}</p> : null}
        {relations.paires.length ? (
          <div><span className="ed-compo-l">En paire avec</span>
            <span className="ed-ana-mini">{relations.paires.map((id) => <button key={id} type="button" onClick={() => ouvrir(id)}><img src={vignetteDe(adresses.get(id)) ?? undefined} alt="" /></button>)}</span>
          </div>
        ) : null}
        {relations.scene.length ? (
          <div><span className="ed-compo-l">Même scène · {relations.scene.length}</span>
            <span className="ed-ana-mini">{relations.scene.slice(0, 8).map((id) => <button key={id} type="button" onClick={() => ouvrir(id)}><img src={vignetteDe(adresses.get(id)) ?? undefined} alt="" /></button>)}</span>
          </div>
        ) : null}
        {!relations.serie && !relations.paires.length && !relations.scene.length ? <p className="ed-compo-sous">Seule de son moment</p> : null}
      </div>
    </aside>
  );
}

/** Le lieu saisi dans les questions, en liste (la fiche du compositeur). */
export const lieuxDeLaSaisie = (t: string): string[] => lieuxDeTexte(t);
