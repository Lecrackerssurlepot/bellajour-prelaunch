"use client";

/* Les PERSONNES d'une édition, côté atelier (planches 4B et 4C du 20/10, T-198 ; migration
   20261023). Une personne, c'est son ADRESSE : donnée la première fois avec le prénom et le nom,
   unique par édition, jamais vérifiée. L'atelier la voit ENTIÈRE (le responsable la voit
   masquée, l'équipe jamais) ; elle reconnaît, elle ne prouve rien.

   Le panneau a la forme de la planche 4C : à gauche les personnes (la plus fournie d'abord, une
   recherche et le filtre « doublons possibles »), à droite la personne choisie : son adresse, ses
   liens, ses téléphones, sa dernière arrivée, puis « Renommer » et « Fusionner avec… ». La fiche
   n'a pas de grille de photos : la planche en montre une sous la personne, elle n'est pas inventée ici.

   - « Renommer » : prénom ET nom, toutes ses photos suivent. Le participant ne se renomme jamais.
   - « Fusionner » : jamais d'office. Les doublons se PROPOSENT (même nom sans l'accent, même
     prénom sur un même lien) ; la fenêtre de la planche 4B montre les deux personnes, laisse choisir
     le NOM gardé et dit ce qui se passe (`@/lib/collectif/atelierPhotos`). Le serveur refuse de
     garder un nom d'un seul mot pour une personne à adresse : l'écran le dit avant le clic.
   - « Défaire » une fusion, depuis la liste « Fusions passées » (l'atelier seul), EN DEUX TEMPS :
     `verifier: true` dit ce qui reviendrait, puis le geste. 409 si déjà défaite.

   Toutes les écritures passent par `/api/admin/collectif/editions/[id]/personnes`, qui revérifie
   l'atelier et journalise QUI. Sans la migration, la route répond 503 `migration_personnes_absente` :
   le panneau le dit en nommant le fichier, désactive les gestes, et la liste des personnes d'avant
   (par nom) reste lisible. La liste se lit à l'affichage de l'onglet : la fiche n'attend pas ce panneau. */

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { initialesDe } from "@/lib/collectif/boite";
import { bilanDefaire, bilanFusion, bilanRenommage, libelleLiens, ligneFusion, nombrePhotos, nomsGardables, phraseDefaire, phraseFusion, phraseMigrationAbsente, phraseTelephones, quandArrivee, jourEtHeureParis, raisonFusion, sensDeLaFusion } from "@/lib/collectif/atelierPhotos";
import { cleSansAccents, decouperNom, type FusionProposee, type Personne } from "@/lib/collectif/personnes";
import "../personnes.css";

type FusionVue = { evenement: string; le: string; qui: string | null; reste: string; part: string; nomAvant: string | null; nomPart: string | null; nomApres: string; n: number; defaite: boolean; interrompue?: boolean };
type Lecture = { personnes: Personne[]; proposees: FusionProposee[]; avecAdresses: boolean; fusions: FusionVue[] };
type Etat = { genre: "chargement" } | { genre: "ok" } | { genre: "absente" } | { genre: "erreur"; texte: string };
type Bilan = { ton: "ok" | "erreur"; texte: string };
type Reponse = { statut: number; json: Record<string, unknown> | null };
/** Une fusion dont « Défaire » a été vérifié : ce que le serveur dit qui reviendrait. */
type DefaireVerifie = { evenement: string; n: number; nomAvant: string | null; nomPart: string | null };

const rien = () => () => {};
const SANS_ADRESSE = "sans adresse (envoyées avant les adresses)";
/** Les fusions montrées d'abord ; le reste à la demande. */
const FUSIONS_VUES = 5;
/** Au-dessus de ce nombre de personnes, la liste se cherche. */
const RECHERCHE_DES = 8;

const cleDeLaPaire = (x: FusionProposee) => [x.a, x.b].sort().join("|");

async function appeler(adresse: string, corps: Record<string, unknown>): Promise<Reponse> {
  const rep = await fetch(adresse, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corps) });
  return { statut: rep.status, json: (await rep.json().catch(() => null)) as Record<string, unknown> | null };
}

/** Ce que le serveur dit d'un refus, en une phrase : son `message` s'il en a un, sinon le code. */
function phraseRefus(r: Reponse, quoi: string): string {
  if (r.statut === 503 && r.json?.error === "migration_personnes_absente") return phraseMigrationAbsente(quoi);
  if (typeof r.json?.message === "string" && r.json.message) return r.json.message;
  return `${quoi} n'a pas abouti (erreur ${r.statut}).`;
}

/** `version` : le nombre de photos de la fiche. Quand il change (une arrivée, une suppression), la liste se relit d'elle-même. */
export default function PanneauPersonnes({ id, liens, version }: { id: string; liens: { cle: string; nom: string }[]; version: number }) {
  const router = useRouter();
  const adresse = `/api/admin/collectif/editions/${id}/personnes`;
  const noms = useMemo(() => new Map(liens.map((l) => [l.cle, l.nom])), [liens]);
  const [etat, setEtat] = useState<Etat>({ genre: "chargement" });
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [choisie, setChoisie] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [doublons, setDoublons] = useState(false);
  const [ignorees, setIgnorees] = useState<ReadonlySet<string>>(() => new Set());
  const [renommage, setRenommage] = useState<{ prenom: string; nom: string } | null>(null);
  const [fusion, setFusion] = useState<{ base: Personne; autre: Personne | null } | null>(null);
  const [defaire, setDefaire] = useState<DefaireVerifie | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [toutesFusions, setToutesFusions] = useState(false);
  const titre = useId();

  const lire = useCallback(
    async (apres?: { nom?: string }) => {
      try {
        const rep = await fetch(adresse, { cache: "no-store" });
        const json = (await rep.json().catch(() => null)) as (Partial<Lecture> & { error?: string }) | null;
        if (rep.status === 503 && json?.error === "migration_personnes_absente") {
          setEtat({ genre: "absente" });
          return;
        }
        if (!rep.ok || !json?.personnes) {
          setEtat({ genre: "erreur", texte: `Les personnes n'ont pas pu se lire (erreur ${rep.status}).` });
          return;
        }
        const lue: Lecture = { personnes: json.personnes, proposees: json.proposees ?? [], avecAdresses: json.avecAdresses !== false, fusions: json.fusions ?? [] };
        setLecture(lue);
        /* La personne choisie reste choisie ; si sa référence a changé (un nom d'avant renommé) on la retrouve par son nom ; à l'ouverture,
           la première d'une proposition de fusion (c'est ce que l'atelier vient juger, comme la planche 4C), sinon la plus fournie. */
        setChoisie((c) =>
          c && lue.personnes.some((p) => p.ref === c)
            ? c
            : (lue.personnes.find((p) => apres?.nom && p.nom === apres.nom)?.ref ?? lue.proposees.find((x) => lue.personnes.some((p) => p.ref === x.a))?.a ?? lue.personnes[0]?.ref ?? null)
        );
        setEtat({ genre: "ok" });
      } catch {
        setEtat({ genre: "erreur", texte: "Le réseau n'a pas répondu : les personnes ne se sont pas lues." });
      }
    },
    [adresse]
  );

  useEffect(() => {
    void lire();
  }, [lire, version]);

  const personnes = useMemo(() => lecture?.personnes ?? [], [lecture]);
  const parRef = useMemo(() => new Map(personnes.map((p) => [p.ref, p])), [personnes]);
  /* Les propositions encore à juger : une paire ignorée (pour cette visite seulement, rien n'est écrit) ne revient pas. */
  const propositions = useMemo(() => (lecture?.proposees ?? []).filter((x) => !ignorees.has(cleDeLaPaire(x)) && parRef.has(x.a) && parRef.has(x.b)), [lecture, ignorees, parRef]);
  const enDoublon = useMemo(() => new Set(propositions.flatMap((x) => [x.a, x.b])), [propositions]);

  const visibles = useMemo(() => {
    const q = cleSansAccents(recherche.trim());
    return personnes.filter((p) => (!doublons || enDoublon.has(p.ref)) && (!q || cleSansAccents(p.nom).includes(q) || (p.email ?? "").toLowerCase().includes(recherche.trim().toLowerCase())));
  }, [personnes, recherche, doublons, enDoublon]);

  const p = choisie ? (parRef.get(choisie) ?? null) : null;
  const gestes = lecture?.avecAdresses === true;
  /* Les propositions qui touchent la personne choisie, avec l'autre personne de la paire. */
  const autresProposes = p
    ? propositions
        .filter((x) => x.a === p.ref || x.b === p.ref)
        .map((x) => ({ x, autre: parRef.get(x.a === p.ref ? x.b : x.a) }))
        .filter((y): y is { x: FusionProposee; autre: Personne } => y.autre !== undefined)
    : [];

  function choisir(ref: string) {
    setChoisie(ref);
    setRenommage(null);
    setDefaire(null);
  }

  function ouvrirRenommage(x: Personne) {
    const decoupe = x.participant ? { prenom: x.prenom ?? "", nom: x.nomDeFamille ?? "" } : (decouperNom(x.nom) ?? { prenom: x.nom, nom: "" });
    setBilan(null);
    setRenommage(decoupe);
  }

  async function renommer() {
    if (!p || !renommage || occupe) return;
    setOccupe("renommer");
    setBilan(null);
    try {
      const r = await appeler(adresse, { action: "renommer", personne: p.ref, prenom: renommage.prenom, nom: renommage.nom });
      if (r.statut !== 200) {
        setBilan({ ton: "erreur", texte: phraseRefus(r, "Le renommage") });
        if (r.statut === 404) await lire();
        return;
      }
      const nom = typeof r.json?.nom === "string" ? r.json.nom : "";
      const n = typeof r.json?.n === "number" ? r.json.n : 0;
      setRenommage(null);
      setBilan({ ton: "ok", texte: `${bilanRenommage(p.nom, nom, n)}${r.json?.journal === false ? " Le journal n'a pas pu noter ce geste." : ""}` });
      await lire({ nom });
      router.refresh();
    } catch {
      setBilan({ ton: "erreur", texte: "Le réseau n'a pas répondu. La liste se relit pour voir ce qui a changé." });
      await lire();
    } finally {
      setOccupe(null);
    }
  }

  async function verifierDefaire(f: FusionVue) {
    if (occupe) return;
    setOccupe(f.evenement);
    setBilan(null);
    setDefaire(null);
    try {
      const r = await appeler(adresse, { action: "defaire", evenement: f.evenement, verifier: true });
      if (r.statut !== 200) {
        setBilan({ ton: "erreur", texte: phraseRefus(r, "La vérification") });
        if (r.statut === 404) await lire();
        return;
      }
      if (r.json?.defaite === true) {
        setBilan({ ton: "erreur", texte: "Cette fusion est déjà défaite." });
        await lire();
        return;
      }
      setDefaire({
        evenement: f.evenement,
        n: typeof r.json?.n === "number" ? r.json.n : f.n,
        nomAvant: typeof r.json?.nomAvant === "string" ? r.json.nomAvant : null,
        nomPart: typeof r.json?.nomPart === "string" ? r.json.nomPart : null,
      });
    } catch {
      setBilan({ ton: "erreur", texte: "Le réseau n'a pas répondu. Rien n'a changé." });
    } finally {
      setOccupe(null);
    }
  }

  async function defaireLaFusion() {
    if (!defaire || occupe) return;
    setOccupe(defaire.evenement);
    setBilan(null);
    try {
      const r = await appeler(adresse, { action: "defaire", evenement: defaire.evenement });
      if (r.statut !== 200) {
        setBilan({ ton: "erreur", texte: phraseRefus(r, "Le geste") });
        setDefaire(null);
        if (r.statut === 409 || r.statut === 404) await lire();
        return;
      }
      const n = typeof r.json?.n === "number" ? r.json.n : 0;
      setDefaire(null);
      setBilan({ ton: "ok", texte: `${bilanDefaire(n)}${r.json?.journal === false ? " Le journal n'a pas pu noter ce geste." : ""}` });
      await lire();
      router.refresh();
    } catch {
      setDefaire(null);
      setBilan({ ton: "erreur", texte: "Le réseau n'a pas répondu. La liste se relit pour voir ce qui a changé." });
      await lire();
    } finally {
      setOccupe(null);
    }
  }

  const fusionsVues = toutesFusions ? (lecture?.fusions ?? []) : (lecture?.fusions ?? []).slice(0, FUSIONS_VUES);

  return (
    <section className="eca-carte eca-carte--large eca-pe" aria-labelledby={titre}>
      <span className="eca-carte-tete eca-carte-tete--gestes">
        <h2 className="eca-carte-titre" id={titre}>
          Les personnes
        </h2>
        {etat.genre === "ok" ? (
          <span className="eca-pe-tete-droite">
            <span className="eca-puce">{personnes.length.toLocaleString("fr-FR")} personne{personnes.length > 1 ? "s" : ""}</span>
            <button type="button" className="eca-lien-texte" disabled={occupe !== null} onClick={() => void lire()}>
              Actualiser
            </button>
          </span>
        ) : null}
      </span>
      <p className="eca-sous eca-pe-aide">
        Chacun se présente par son adresse, qui n&apos;est pas vérifiée : elle le reconnaît, elle ne prouve rien. Vous la voyez entière, le responsable la voit masquée.
      </p>

      {etat.genre === "chargement" ? <p className="eca-vide">Lecture des personnes…</p> : null}

      {etat.genre === "absente" ? (
        <p className="eca-bandeau" role="note">
          <span className="eca-point" aria-hidden="true" />
          <span>{phraseMigrationAbsente("Cette liste")}</span>
        </p>
      ) : null}

      {etat.genre === "erreur" ? (
        <p className="eca-message eca-message--erreur" role="alert">
          {etat.texte}{" "}
          <button type="button" className="eca-lien-texte" onClick={() => void lire()}>
            Réessayer
          </button>
        </p>
      ) : null}

      {etat.genre === "ok" && lecture && !lecture.avecAdresses ? (
        <p className="eca-bandeau" role="note">
          <span className="eca-point" aria-hidden="true" />
          <span>
            {phraseMigrationAbsente("Le suivi par adresse")} La liste ci-dessous se lit par nom ; renommer, fusionner et défaire attendent.
          </span>
        </p>
      ) : null}

      {etat.genre === "ok" && personnes.length === 0 ? <p className="eca-vide">Personne n&apos;a encore déposé de photo.</p> : null}

      {etat.genre === "ok" && personnes.length > 0 ? (
        <div className="eca-pe-corps">
          <div className="eca-pe-colonne">
            {personnes.length > RECHERCHE_DES ? (
              <input className="eca-input eca-pe-recherche" type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Chercher un nom ou une adresse" aria-label="Chercher une personne" autoComplete="off" />
            ) : null}
            {propositions.length > 0 ? (
              <button type="button" className="eca-choix eca-pe-filtre" aria-pressed={doublons} onClick={() => setDoublons((d) => !d)}>
                Doublons possibles · {enDoublon.size}
              </button>
            ) : null}
            <ul className="eca-pe-liste" aria-label="Les personnes de l'édition">
              {visibles.map((x) => (
                <li key={x.ref}>
                  <button type="button" className="eca-pe-item" aria-current={x.ref === choisie ? "true" : undefined} onClick={() => choisir(x.ref)}>
                    <span className="eca-pe-ini" aria-hidden="true">
                      {initialesDe(x.nom)}
                    </span>
                    <span className="eca-pe-item-nom">{x.nom}</span>
                    {enDoublon.has(x.ref) ? <span className="eca-pe-point" title="Peut-être la même personne qu'une autre" aria-label="doublon possible" /> : null}
                    <span className="eca-pe-item-n">{x.n.toLocaleString("fr-FR")}</span>
                  </button>
                </li>
              ))}
              {visibles.length === 0 ? <li className="eca-vide eca-pe-aucune">Aucune personne ne correspond.</li> : null}
            </ul>
          </div>

          {p ? (
            <div className="eca-pe-detail">
              <div className="eca-pe-fiche">
                <span className="eca-pe-ini eca-pe-ini--grand" aria-hidden="true">
                  {initialesDe(p.nom)}
                </span>
                <div className="eca-pe-titres">
                  <h3 className="eca-pe-nom">{p.nom}</h3>
                  <span className="eca-sous eca-pe-sous">
                    {[nombrePhotos(p.n), p.email ?? SANS_ADRESSE, libelleLiens(p, noms), phraseTelephones(p.telephones), p.derniere ? `dernière arrivée ${quandArrivee(p.derniere)}` : null].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {renommage ? null : (
                  <span className="eca-pe-gestes">
                    <button type="button" className="adm-btn adm-btn--ghost" disabled={!gestes || occupe !== null} onClick={() => ouvrirRenommage(p)}>
                      Renommer
                    </button>
                    <button type="button" className="adm-btn adm-btn--ghost" disabled={!gestes || occupe !== null || personnes.length < 2} onClick={() => setFusion({ base: p, autre: null })}>
                      Fusionner avec…
                    </button>
                  </span>
                )}
              </div>

              {p.nomPropose && !renommage ? (
                <p className="eca-pe-propose">
                  Quelqu&apos;un a aussi tapé cette adresse sous le nom <strong>{p.nomPropose.nom}</strong> ({quandArrivee(p.nomPropose.le)}). L&apos;adresse n&apos;est pas vérifiée : si c&apos;est le bon nom, renommez la personne.
                </p>
              ) : null}

              {renommage ? (
                <form
                  className="eca-pe-renommer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void renommer();
                  }}
                >
                  <div className="eca-pe-champs">
                    <label className="eca-champ">
                      <span className="eca-champ-label">Prénom</span>
                      <input className="eca-input" value={renommage.prenom} maxLength={80} autoFocus onChange={(e) => setRenommage({ ...renommage, prenom: e.target.value })} />
                    </label>
                    <label className="eca-champ">
                      <span className="eca-champ-label">Nom</span>
                      <input className="eca-input" value={renommage.nom} maxLength={80} onChange={(e) => setRenommage({ ...renommage, nom: e.target.value })} />
                    </label>
                  </div>
                  <span className="eca-champ-aide">
                    {nombrePhotos(p.n)} {p.n > 1 ? "suivent" : "suit"}, sur tous les liens : le même nom partout, dans la grille, les dossiers et le lot. Le participant ne le corrige pas lui-même.
                  </span>
                  <div className="eca-barre">
                    <button type="submit" className="adm-btn" disabled={occupe !== null || !renommage.prenom.trim() || !renommage.nom.trim()}>
                      {occupe === "renommer" ? "Enregistrement…" : "Renommer"}
                    </button>
                    <button type="button" className="adm-btn adm-btn--ghost" disabled={occupe !== null} onClick={() => setRenommage(null)}>
                      Annuler
                    </button>
                  </div>
                </form>
              ) : null}

              {autresProposes.length > 0 ? (
                <div className="eca-pe-doublons">
                  <span className="eca-pe-doublons-tete">
                    <strong>Peut-être la même personne</strong>
                    <button
                      type="button"
                      className="eca-lien-texte"
                      title="Masque ces propositions jusqu'au prochain affichage de la page. Rien n'est écrit."
                      onClick={() => setIgnorees((s) => new Set([...s, ...autresProposes.map((y) => cleDeLaPaire(y.x))]))}
                    >
                      Ignorer
                    </button>
                  </span>
                  <ul>
                    {autresProposes.map(({ x, autre }) => (
                      <li key={cleDeLaPaire(x)}>
                        <span className="eca-pe-ini" aria-hidden="true">
                          {initialesDe(autre.nom)}
                        </span>
                        <span className="eca-pe-doublon-texte">
                          <span className="eca-pe-doublon-nom">
                            <strong>{autre.nom}</strong>
                            <span className="eca-puce eca-puce--gris">{raisonFusion(x.raison)}</span>
                          </span>
                          <span className="eca-sous">{[libelleLiens(autre, noms), nombrePhotos(autre.n), autre.email ?? SANS_ADRESSE].join(" · ")}</span>
                        </span>
                        <button type="button" className="adm-btn adm-btn--ghost" disabled={!gestes || occupe !== null} onClick={() => setFusion({ base: p, autre })}>
                          Fusionner
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {etat.genre === "ok" && (lecture?.fusions.length ?? 0) > 0 ? (
        <div className="eca-pe-fusions">
          <h3 className="eca-pe-sous-titre">Fusions passées</h3>
          <ul>
            {fusionsVues.map((f) => (
              <li key={f.evenement} className={f.defaite ? "eca-pe-fusion eca-pe-fusion--defaite" : "eca-pe-fusion"}>
                <span className="eca-pe-fusion-texte">
                  <strong>{ligneFusion(f)}</strong>
                  <span className="eca-sous">
                    {f.n.toLocaleString("fr-FR")} photo{f.n > 1 ? "s" : ""} déplacée{f.n > 1 ? "s" : ""} · {jourEtHeureParis(f.le)}
                    {f.qui ? `, par ${f.qui}` : ""}
                  </span>
                </span>
                {f.interrompue && !f.defaite ? <span className="eca-puce eca-puce--ambre" title="Une panne a coupé cette fusion au milieu : défaites-la, chaque photo reprend sa personne d'avant.">Interrompue</span> : null}
                {f.defaite ? (
                  <span className="eca-puce eca-puce--gris">Défaite</span>
                ) : (
                  <button type="button" className="adm-btn adm-btn--ghost" disabled={!gestes || occupe !== null || defaire?.evenement === f.evenement} onClick={() => void verifierDefaire(f)}>
                    {occupe === f.evenement && !defaire ? "Vérification…" : "Défaire…"}
                  </button>
                )}
                {defaire?.evenement === f.evenement ? (
                  <div className="eca-confirm eca-pe-confirm">
                    <p>
                      <strong>Défaire cette fusion ?</strong>
                    </p>
                    <p>{phraseDefaire(defaire)}</p>
                    <div className="eca-barre">
                      <button type="button" className="adm-btn" disabled={occupe !== null} onClick={() => void defaireLaFusion()}>
                        {occupe === f.evenement ? "En cours…" : "Défaire la fusion"}
                      </button>
                      <button type="button" className="adm-btn adm-btn--ghost" disabled={occupe !== null} onClick={() => setDefaire(null)}>
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {(lecture?.fusions.length ?? 0) > FUSIONS_VUES ? (
            <button type="button" className="eca-lien-texte eca-pe-toutes" onClick={() => setToutesFusions((t) => !t)}>
              {toutesFusions ? "Voir les plus récentes seulement" : `Voir les ${lecture?.fusions.length} fusions`}
            </button>
          ) : null}
        </div>
      ) : null}

      {bilan ? (
        <p className={bilan.ton === "ok" ? "eca-message eca-message--ok" : "eca-message eca-message--erreur"} role={bilan.ton === "ok" ? "status" : "alert"}>
          {bilan.texte}
        </p>
      ) : null}

      {fusion ? (
        <FenetreFusion
          adresse={adresse}
          base={fusion.base}
          autre={fusion.autre}
          personnes={personnes}
          noms={noms}
          onFermer={() => setFusion(null)}
          onFait={async (nom, total, journal) => {
            setFusion(null);
            setBilan({ ton: "ok", texte: `${bilanFusion(total, nom)}${journal ? "" : " Le journal n'a pas pu noter ce geste."}` });
            await lire({ nom });
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}

/* ─────────────── la fenêtre « Fusionner deux personnes » (planche 4B) ─────────────── */

/* Elle s'ouvre par un PORTAIL dans `.eca-root` : un panneau de verre (`backdrop-filter`, la carte qui
   l'appelle) devient le bloc conteneur de tout ce qui est positionné dedans, et la fenêtre resterait
   enfermée dans sa carte (même leçon que `FenetreQrAtelier`). Échap la ferme, le focus y entre et revient. */
function FenetreFusion({
  adresse,
  base,
  autre: autreInitial,
  personnes,
  noms,
  onFermer,
  onFait,
}: {
  adresse: string;
  base: Personne;
  autre: Personne | null;
  personnes: Personne[];
  noms: ReadonlyMap<string, string>;
  onFermer: () => void;
  onFait: (nom: string, n: number, journal: boolean) => Promise<void>;
}) {
  const titre = useId();
  const client = useSyncExternalStore(rien, () => true, () => false);
  const fenetre = useRef<HTMLDivElement>(null);
  const [autre, setAutre] = useState<Personne | null>(autreInitial);
  const [recherche, setRecherche] = useState("");
  const [garder, setGarder] = useState<"cible" | "source">("cible");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const fermer = useRef(onFermer);
  useEffect(() => {
    fermer.current = onFermer;
  });
  useEffect(() => {
    const avant = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    fenetre.current?.focus();
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer.current();
    };
    window.addEventListener("keydown", touche);
    return () => {
      window.removeEventListener("keydown", touche);
      avant?.focus();
    };
  }, []);

  const { cible, source } = autre ? sensDeLaFusion(base, autre) : { cible: base, source: null };
  const gardables = source ? nomsGardables(cible, source) : [];
  const choix = gardables.find((g) => g.garder === garder) ?? gardables[0];
  /* Le nom que la table refuserait ne se coche pas : on revient sur l'autre. */
  const gardeEffectif = choix?.refus ? (gardables.find((g) => !g.refus)?.garder ?? garder) : garder;
  const nomGarde = gardables.find((g) => g.garder === gardeEffectif)?.nom ?? cible.nom;
  const candidats = personnes.filter((x) => x.ref !== base.ref && (!recherche.trim() || cleSansAccents(x.nom).includes(cleSansAccents(recherche.trim()))));

  async function fusionner() {
    if (!source || occupe) return;
    setOccupe(true);
    setErreur(null);
    try {
      const r = await appeler(adresse, { action: "fusionner", source: source.ref, cible: cible.ref, garder: gardeEffectif });
      if (r.statut !== 200) {
        setErreur(phraseRefus(r, "La fusion"));
        return;
      }
      /* Le total vient des deux personnes lues à l'écran : le `n` du serveur ne compte que les photos RÉÉCRITES. */
      await onFait(typeof r.json?.nom === "string" ? r.json.nom : nomGarde, cible.n + source.n, r.json?.journal !== false);
    } catch {
      setErreur("Le réseau n'a pas répondu. La fusion a pu se faire : fermer cette fenêtre relit la liste.");
    } finally {
      setOccupe(false);
    }
  }

  const carte = (x: Personne) => (
    <span className="eca-pe-duo-carte">
      <strong>{x.nom}</strong>
      <span className="eca-sous">{[nombrePhotos(x.n), libelleLiens(x, noms)].join(" · ")}</span>
      <span className="eca-sous eca-pe-duo-mail">{x.email ?? SANS_ADRESSE}</span>
    </span>
  );

  const contenu = (
    <div className="eca-fen-voile" role="presentation" onClick={onFermer}>
      <div ref={fenetre} className="eca-fen eca-pe-fen" role="dialog" aria-modal="true" aria-labelledby={titre} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="eca-fen-tete">
          <h2 className="eca-fen-titre" id={titre}>
            {source ? "Fusionner deux personnes" : `Fusionner ${base.nom} avec…`}
          </h2>
          <button type="button" className="eca-fen-fermer" aria-label="Fermer" onClick={onFermer}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {source ? (
          <>
            <div className="eca-pe-duo">
              {carte(cible)}
              <svg className="eca-pe-duo-signe" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 4v5a6 6 0 0 0 12 0V4M12 15v5" />
              </svg>
              {carte(source)}
            </div>
            <fieldset className="eca-pe-noms">
              <legend>Le nom gardé</legend>
              {gardables.map((g) => (
                <label key={g.garder} className={`eca-pe-nom-choix${g.garder === gardeEffectif ? " eca-pe-nom-choix--on" : ""}${g.refus ? " eca-pe-nom-choix--refus" : ""}`}>
                  <input type="radio" name="nom-garde" checked={g.garder === gardeEffectif} disabled={Boolean(g.refus)} onChange={() => setGarder(g.garder)} />
                  <span>
                    {g.nom}
                    {g.refus ? <span className="eca-sous"> {g.refus}</span> : null}
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="eca-pe-fen-texte">{phraseFusion(cible, source, nomGarde)}</p>
            {erreur ? (
              <p className="eca-message eca-message--erreur" role="alert">
                {erreur}
              </p>
            ) : null}
            <div className="eca-fen-gestes eca-pe-fen-gestes">
              {autreInitial === null ? (
                <button type="button" className="eca-lien-texte" disabled={occupe} onClick={() => setAutre(null)}>
                  Choisir une autre personne
                </button>
              ) : null}
              <button type="button" className="eca-bouton" disabled={occupe} onClick={onFermer}>
                Annuler
              </button>
              <button type="button" className="eca-bouton eca-bouton--plein" disabled={occupe} onClick={() => void fusionner()}>
                {occupe ? "Fusion…" : "Fusionner"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="eca-champ-aide">Les photos de l&apos;une seront rangées chez l&apos;autre. Rien n&apos;est effacé, et l&apos;atelier peut défaire la fusion.</p>
            <input className="eca-input" type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Chercher un nom" aria-label="Chercher la personne à fusionner" autoComplete="off" autoFocus />
            <ul className="eca-pe-liste eca-pe-liste--fen" aria-label="Les autres personnes">
              {candidats.map((x) => (
                <li key={x.ref}>
                  <button type="button" className="eca-pe-item" onClick={() => setAutre(x)}>
                    <span className="eca-pe-ini" aria-hidden="true">
                      {initialesDe(x.nom)}
                    </span>
                    <span className="eca-pe-item-nom">{x.nom}</span>
                    <span className="eca-pe-item-n">{x.n.toLocaleString("fr-FR")}</span>
                  </button>
                </li>
              ))}
              {candidats.length === 0 ? <li className="eca-vide eca-pe-aucune">Aucune personne ne correspond.</li> : null}
            </ul>
            <div className="eca-fen-gestes">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={onFermer}>
                Annuler
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
  const hote = client ? document.querySelector(".eca-root") : null;
  return hote ? createPortal(contenu, hote) : contenu;
}
