"use client";

/* La CORBEILLE d'une édition, côté atelier (planche 5 du 20/10, T-199 ; migration
   20261023). Une photo supprimée (par son auteur, par le responsable, par
   l'atelier) disparaît tout de suite de partout et reste ici `jours` jours, puis
   la purge quotidienne l'efface. La liste dit qui l'a supprimée, quand, et dans
   combien de jours elle part (en alerte sous trois jours).

   Trois gestes, tous lus par la route `/api/admin/collectif/editions/[id]/corbeille` :
   - « Restaurer » une photo, ou les photos cochées : elle revient à sa place (son lien,
     sa personne, sa sélection). Un clic, sans confirmation : c'est déjà le geste qui défait.
   - « Effacer maintenant » : DÉFINITIF, et l'atelier seul. EN DEUX TEMPS, comme « Régénérer »
     un lien (`PanneauLiens`) : le premier clic demande au serveur ce qui partirait
     (`verifier: true`, rien n'est effacé), le second est le geste armé. Un objet du coffre qui
     résiste ne fait plus de 502 (audit S7) : la photo est effacée, le fichier resté au coffre part à la purge suivante, et le panneau le dit.
   - Rien ne se met à la corbeille d'ici : la fiche n'a pas de grille de photos avec sélection ;
     la route sait `supprimer` (`par: "atelier"`), l'écran qui la porte viendra avec la grille.

   Sans la migration 20261023, la lecture répond 503 `migration_personnes_absente` : le panneau
   le dit en nommant le fichier, et la fiche tient. La liste se lit à l'affichage de l'onglet
   (un onglet n'est monté qu'à sa première visite) : la fiche n'attend pas la corbeille.
   Les phrases sont dans `@/lib/collectif/atelierPhotos` (au harnais). */

import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { bilanEffacement, bilanRestauration, enGestes, nombrePhotos, phraseEcheance, phraseEffacer, phraseMigrationAbsente, jourEtHeureParis } from "@/lib/collectif/atelierPhotos";
import type { VuePhotoCorbeille } from "@/lib/collectif/corbeilleServeur";
import "../corbeille.css";

/** Les lignes affichées d'abord ; le reste à la demande (une corbeille de centaines de photos ne se peint pas d'un coup). */
const PAGE = 40;

type Etat = { genre: "chargement" } | { genre: "ok" } | { genre: "absente" } | { genre: "erreur"; texte: string };
type Bilan = { ton: "ok" | "erreur"; texte: string };
/** Un effacement vérifié, en attente du second geste : les photos cochées, et combien le serveur dit qu'il en effacerait. */
type Armee = { ids: string[]; aEffacer: number };

type Reponse = { statut: number; json: Record<string, unknown> | null };

/**
 * `migrationAbsente` : la fiche SAIT déjà que la base n'a pas la mise à jour (la colonne `ouverture_le`, de la même
 * migration, manque à l'édition) : le panneau le dit tout de suite, sans interroger une route qui répondrait 503.
 * Sans cette certitude, c'est la route qui le dit (503 `migration_personnes_absente`), et l'écran dit la même chose.
 */
export default function PanneauCorbeille({ id, migrationAbsente = false, version }: { id: string; migrationAbsente?: boolean; version: number }) {
  const router = useRouter();
  const titre = useId();
  const [etat, setEtat] = useState<Etat>(migrationAbsente ? { genre: "absente" } : { genre: "chargement" });
  const [photos, setPhotos] = useState<VuePhotoCorbeille[]>([]);
  const [jours, setJours] = useState<number | null>(null);
  const [cochees, setCochees] = useState<ReadonlySet<string>>(() => new Set());
  const [occupe, setOccupe] = useState<"restaurer" | "verifier" | "effacer" | null>(null);
  const [armee, setArmee] = useState<Armee | null>(null);
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [visibles, setVisibles] = useState(PAGE);
  const adresse = `/api/admin/collectif/editions/${id}/corbeille`;

  const lire = useCallback(async () => {
    try {
      const rep = await fetch(adresse, { cache: "no-store" });
      const json = (await rep.json().catch(() => null)) as { photos?: VuePhotoCorbeille[]; jours?: number; error?: string } | null;
      if (rep.status === 503 && json?.error === "migration_personnes_absente") {
        setEtat({ genre: "absente" });
        return;
      }
      if (!rep.ok || !json?.photos) {
        setEtat({ genre: "erreur", texte: `La corbeille n'a pas pu se lire (erreur ${rep.status}).` });
        return;
      }
      const lues = json.photos;
      setPhotos(lues);
      setJours(typeof json.jours === "number" ? json.jours : null);
      /* Une photo cochée qui n'est plus à la corbeille (restaurée ou effacée entre-temps) se décoche. */
      const presentes = new Set(lues.map((p) => p.id));
      setCochees((c) => new Set([...c].filter((x) => presentes.has(x))));
      setEtat({ genre: "ok" });
    } catch {
      setEtat({ genre: "erreur", texte: "Le réseau n'a pas répondu : la corbeille ne s'est pas lue." });
    }
  }, [adresse]);

  /* `version` : le nombre de photos de la fiche. Une photo supprimée par un participant le change, la liste se relit. */
  useEffect(() => {
    if (!migrationAbsente) void lire();
  }, [lire, migrationAbsente, version]);

  async function appeler(corps: Record<string, unknown>): Promise<Reponse> {
    const rep = await fetch(adresse, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corps) });
    return { statut: rep.status, json: (await rep.json().catch(() => null)) as Record<string, unknown> | null };
  }

  const nombre = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const estMigrationAbsente = (r: Reponse) => r.statut === 503 && r.json?.error === "migration_personnes_absente";

  function basculer(photo: string) {
    setArmee(null);
    setCochees((c) => {
      const suite = new Set(c);
      if (!suite.delete(photo)) suite.add(photo);
      return suite;
    });
  }

  function toutCocher() {
    setArmee(null);
    setCochees((c) => (c.size === photos.length ? new Set() : new Set(photos.map((p) => p.id))));
  }

  async function restaurer(ids: string[]) {
    if (!ids.length || occupe) return;
    setOccupe("restaurer");
    setBilan(null);
    setArmee(null);
    try {
      let n = 0;
      let refusees = 0;
      const rendues = new Set<string>();
      for (const paquet of enGestes(ids)) {
        const r = await appeler({ action: "restaurer", photoIds: paquet });
        if (estMigrationAbsente(r)) {
          setBilan({ ton: "erreur", texte: phraseMigrationAbsente("La corbeille") });
          return;
        }
        if (r.statut !== 200) {
          setBilan({ ton: "erreur", texte: `La restauration n'a pas abouti (erreur ${r.statut}). La liste se relit.` });
          await lire();
          return;
        }
        n += nombre(r.json?.n);
        refusees += Array.isArray(r.json?.refusees) ? (r.json.refusees as unknown[]).length : 0;
        for (const x of (Array.isArray(r.json?.ids) ? r.json.ids : []) as string[]) rendues.add(x);
      }
      setPhotos((p) => p.filter((x) => !rendues.has(x.id)));
      setCochees((c) => new Set([...c].filter((x) => !rendues.has(x))));
      setBilan({ ton: "ok", texte: bilanRestauration(n, refusees) });
      if (refusees > 0) await lire();
      router.refresh();
    } catch {
      setBilan({ ton: "erreur", texte: "Le réseau n'a pas répondu. La liste se relit pour voir ce qui est revenu." });
      await lire();
    } finally {
      setOccupe(null);
    }
  }

  /* Premier temps : ce qui partirait, sans rien effacer. */
  async function verifier() {
    const ids = [...cochees];
    if (!ids.length || occupe) return;
    setOccupe("verifier");
    setBilan(null);
    try {
      let aEffacer = 0;
      for (const paquet of enGestes(ids)) {
        const r = await appeler({ action: "effacer", photoIds: paquet, verifier: true });
        if (estMigrationAbsente(r)) {
          setBilan({ ton: "erreur", texte: phraseMigrationAbsente("La corbeille") });
          return;
        }
        if (r.statut !== 200) {
          setBilan({ ton: "erreur", texte: `La vérification n'a pas abouti (erreur ${r.statut}). Rien n'a été effacé.` });
          return;
        }
        aEffacer += nombre(r.json?.aEffacer);
      }
      setArmee({ ids, aEffacer });
      if (aEffacer === 0) await lire();
    } catch {
      setBilan({ ton: "erreur", texte: "Le réseau n'a pas répondu. Rien n'a été effacé." });
    } finally {
      setOccupe(null);
    }
  }

  /* Second temps : le geste armé. */
  async function effacer() {
    if (!armee || occupe) return;
    setOccupe("effacer");
    setBilan(null);
    try {
      let n = 0;
      let ratees = 0;
      let journal = true;
      const parties = new Set<string>();
      for (const paquet of enGestes(armee.ids)) {
        const r = await appeler({ action: "effacer", photoIds: paquet });
        if (estMigrationAbsente(r)) {
          setBilan({ ton: "erreur", texte: phraseMigrationAbsente("La corbeille") });
          return;
        }
        /* 200 : les photos sont effacées (la ligne part d'abord, audit S7) ; `ratees` dit celles dont un fichier est resté au coffre, retiré par la purge suivante. Autre : on relit. */
        if (r.statut !== 200) {
          setBilan({ ton: "erreur", texte: `L'effacement n'a pas abouti (erreur ${r.statut}). Des photos ont pu quitter le coffre : la liste se relit.` });
          setArmee(null);
          await lire();
          return;
        }
        n += nombre(r.json?.n);
        ratees += nombre(r.json?.ratees);
        if (r.json?.journal === false) journal = false;
        for (const x of (Array.isArray(r.json?.ids) ? r.json.ids : []) as string[]) parties.add(x);
      }
      setArmee(null);
      setPhotos((p) => p.filter((x) => !parties.has(x.id)));
      setCochees((c) => new Set([...c].filter((x) => !parties.has(x))));
      setBilan({
        ton: "ok",
        texte: `${bilanEffacement(n, ratees)}${journal ? "" : " Le journal n'a pas pu noter ce geste."}`,
      });
      router.refresh();
    } catch {
      setArmee(null);
      setBilan({ ton: "erreur", texte: "Le réseau n'a pas répondu. Des photos ont pu être effacées : la liste se relit." });
      await lire();
    } finally {
      setOccupe(null);
    }
  }

  const nb = cochees.size;
  const toutes = photos.length > 0 && nb === photos.length;
  const phrase = armee ? phraseEffacer(armee.aEffacer, armee.ids.length) : null;

  return (
    <section className="eca-carte eca-co" aria-labelledby={titre}>
      <span className="eca-carte-tete eca-carte-tete--gestes">
        <h2 className="eca-carte-titre" id={titre}>
          Corbeille
        </h2>
        {etat.genre === "ok" ? (
          <span className="eca-co-tete-droite">
            <span className="eca-puce">{nombrePhotos(photos.length)}</span>
            <button type="button" className="eca-lien-texte" disabled={occupe !== null} onClick={() => void lire()}>
              Actualiser
            </button>
          </span>
        ) : null}
      </span>

      {etat.genre === "chargement" ? <p className="eca-vide">Lecture de la corbeille…</p> : null}

      {etat.genre === "absente" ? (
        <p className="eca-bandeau" role="note">
          <span className="eca-point" aria-hidden="true" />
          <span>{phraseMigrationAbsente("La corbeille")}</span>
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

      {etat.genre === "ok" ? (
        <>
          <p className="eca-bandeau eca-co-info">
            <span className="eca-point eca-point--bleu" aria-hidden="true" />
            <span>
              Une photo supprimée <strong>disparaît tout de suite pour tout le monde</strong>
              {" "}et n&apos;entre plus dans le lot.
              {jours !== null ? (
                <>
                  {" "}Elle reste ici <strong>{jours} jours</strong>
                  {", puis la purge quotidienne l'efface pour de bon."}
                </>
              ) : (
                " Passé le délai, la purge quotidienne l'efface pour de bon."
              )}
              {" "}Restaurée, elle revient à sa place : son lien, sa personne, sa sélection.
            </span>
          </p>

          {photos.length === 0 ? (
            <p className="eca-vide">La corbeille est vide. Une photo supprimée par son auteur, par le responsable ou par l&apos;atelier s&apos;y range{jours !== null ? ` ${jours} jours` : ""}.</p>
          ) : (
            <>
              <div className="eca-co-barre">
                <label className="eca-co-tout">
                  <input
                    type="checkbox"
                    className="eca-co-case"
                    checked={toutes}
                    ref={(el) => {
                      if (el) el.indeterminate = nb > 0 && !toutes;
                    }}
                    onChange={toutCocher}
                  />
                  <span>Tout cocher ({photos.length})</span>
                </label>
                <span className="eca-co-gestes">
                  <button type="button" className="adm-btn adm-btn--ghost" disabled={nb === 0 || occupe !== null} onClick={() => void restaurer([...cochees])}>
                    {occupe === "restaurer" ? "Restauration…" : nb > 1 ? `Restaurer les ${nb} cochées` : nb === 1 ? "Restaurer la cochée" : "Restaurer les cochées"}
                  </button>
                  <button type="button" className="adm-btn adm-btn--ghost eca-co-danger" disabled={nb === 0 || occupe !== null} onClick={() => void verifier()}>
                    {occupe === "verifier" ? "Vérification…" : "Effacer maintenant…"}
                  </button>
                </span>
              </div>

              {armee && phrase ? (
                <div className="eca-confirm eca-co-confirm" role="alert">
                  <p>
                    <strong>{phrase.titre}</strong>
                  </p>
                  <p>{phrase.corps}</p>
                  <div className="eca-barre">
                    {armee.aEffacer > 0 ? (
                      <button type="button" className="adm-btn eca-co-effacer" disabled={occupe !== null} onClick={() => void effacer()}>
                        {occupe === "effacer" ? "Effacement…" : "Effacer définitivement"}
                      </button>
                    ) : null}
                    <button type="button" className="adm-btn adm-btn--ghost" disabled={occupe === "effacer"} onClick={() => setArmee(null)}>
                      {armee.aEffacer > 0 ? "Annuler" : "Fermer"}
                    </button>
                  </div>
                </div>
              ) : null}

              <ul className="eca-co-liste">
                {photos.slice(0, visibles).map((p) => {
                  const cochee = cochees.has(p.id);
                  const nom = p.nom?.trim() || null;
                  return (
                    <li key={p.id} className={cochee ? "eca-co-ligne eca-co-ligne--cochee" : "eca-co-ligne"}>
                      <input type="checkbox" className="eca-co-case" checked={cochee} onChange={() => basculer(p.id)} aria-label={`Cocher la photo de ${p.qui}${nom ? `, ${nom}` : ""}`} />
                      {p.vignette ? (
                        <img className="eca-co-vignette" src={p.vignette} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span className="eca-co-vignette eca-co-vignette--vide" aria-hidden="true">
                          sans aperçu
                        </span>
                      )}
                      <span className="eca-co-texte">
                        <strong>
                          {p.qui} · {p.lienNom}
                        </strong>
                        <span className="eca-sous">
                          {[nom, `supprimée ${p.parQui}, ${jourEtHeureParis(p.supprimeeLe)}`, p.selection ? "dans la sélection du client" : null].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className={p.alerte ? "eca-puce eca-co-echeance eca-co-echeance--alerte" : "eca-puce eca-co-echeance"}>{phraseEcheance(p.joursRestants)}</span>
                      <button type="button" className="adm-btn adm-btn--ghost eca-co-restaurer" disabled={occupe !== null} onClick={() => void restaurer([p.id])}>
                        Restaurer
                      </button>
                    </li>
                  );
                })}
              </ul>
              {photos.length > visibles ? (
                <button type="button" className="adm-btn adm-btn--ghost eca-co-suite" onClick={() => setVisibles((v) => v + PAGE)}>
                  Afficher les {Math.min(PAGE, photos.length - visibles)} suivantes ({photos.length - visibles} restent)
                </button>
              ) : null}
            </>
          )}
        </>
      ) : null}

      {bilan ? (
        <p className={bilan.ton === "ok" ? "eca-message eca-message--ok" : "eca-message eca-message--erreur"} role={bilan.ton === "ok" ? "status" : "alert"}>
          {bilan.texte}
        </p>
      ) : null}
    </section>
  );
}
