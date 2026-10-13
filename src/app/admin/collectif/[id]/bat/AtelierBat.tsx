"use client";

/* Le bon à tirer côté atelier (PRD §6.1) : un magazine, ses tours, le
   brouillon du prochain, ses propositions de couverture, l'échéance, la
   publication en deux gestes, et les notes envoyées par le client.

   Le PDF est rendu ICI, dans le navigateur (`rendreTour.ts`) : seules les
   images, les gris et le PDF source partent au coffre. L'écran dit où il en
   est (« page i sur n »), et un échec dit à quelle étape. */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { decoderGris, encoderGris, LARGEUR_RENDU_PX } from "@/lib/collectif/bat";
import { TYPES_NOTE } from "@/lib/collectif/types";
import type { BatAtelier, TourAtelier } from "../../donnees";
import { reduireImage } from "../../styles/reduireImage";
import { comparer, rendrePdf } from "./rendreTour";

type Props = { id: string; bat: BatAtelier };

type Travail = { texte: string; erreur: boolean; fini: boolean } | null;

type Verification = {
  de: string;
  vers: string;
  tour: number;
  pages: number;
  explication: string;
  resume: { nouvelles: number; modifiees: number; retirees: number[] };
  precedent: number | null;
};

class Refus extends Error {}

async function poster(id: string, corps: Record<string, unknown>): Promise<Record<string, unknown>> {
  let rep: Response;
  try {
    rep = await fetch(`/api/admin/collectif/editions/${id}/bat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corps),
    });
  } catch {
    throw new Refus("Le réseau n'a pas répondu.");
  }
  const json = (await rep.json().catch(() => ({}))) as Record<string, unknown>;
  if (!rep.ok) throw new Refus(String(json.message ?? `Refusé (erreur ${rep.status}, ${String(json.error ?? "?")}).`));
  return json;
}

async function envoyerPut(url: string, corps: Blob, type: string, quoi: string): Promise<void> {
  let rep: Response;
  try {
    rep = await fetch(url, { method: "PUT", headers: { "content-type": type }, body: corps });
  } catch {
    throw new Refus(`${quoi} : le coffre n'a pas répondu (réseau, ou origine non autorisée par le CORS).`);
  }
  if (!rep.ok) throw new Refus(`${quoi} : le coffre a refusé (erreur ${rep.status}).`);
}

async function enParallele<T>(taches: readonly T[], voies: number, faire: (t: T) => Promise<void>): Promise<void> {
  let suivante = 0;
  await Promise.all(
    Array.from({ length: Math.min(voies, taches.length) }, async () => {
      while (suivante < taches.length) {
        const t = taches[suivante++];
        await faire(t);
      }
    })
  );
}

/* Les gris voyagent compressés : une page presque blanche se réduit de dix fois. */
async function compresser(octets: Uint8Array): Promise<Blob> {
  return new Response(new Blob([octets.buffer as ArrayBuffer]).stream().pipeThrough(new CompressionStream("gzip"))).blob();
}
async function decompresser(blob: Blob): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
  } catch {
    return null;
  }
}

const mo = (octets: number) => (octets / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 });

export default function AtelierBat({ id, bat }: Props) {
  const router = useRouter();
  const magazine = bat.magazine!;
  const brouillon = bat.brouillon;
  const publies = bat.tours.filter((t) => t.publie);
  const valide = Boolean(magazine.bat_valide_le);
  const [travail, setTravail] = useState<Travail>(null);
  const [echeance, setEcheance] = useState(brouillon?.echeanceLocal ?? "");
  const [legendes, setLegendes] = useState<Record<number, string>>(Object.fromEntries(bat.couvertures.map((c) => [c.rang, c.legende])));
  const [verif, setVerif] = useState<Verification | null>(null);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [reponses, setReponses] = useState<Record<string, string>>(Object.fromEntries(bat.notes.map((n) => [n.id, n.reponse ?? ""])));
  const [occupe, setOccupe] = useState(false);
  const occupeTravail = Boolean(travail && !travail.fini && !travail.erreur);

  const dire = (texte: string, erreur = false) => setMessage({ texte, erreur });

  async function agir(corps: Record<string, unknown>, ok?: string): Promise<Record<string, unknown> | null> {
    setOccupe(true);
    setMessage(null);
    try {
      const r = await poster(id, corps);
      if (ok) dire(ok);
      return r;
    } catch (e) {
      dire(e instanceof Error ? e.message : "Refusé.", true);
      return null;
    } finally {
      setOccupe(false);
    }
  }

  async function ouvrir() {
    if (await agir({ action: "ouvrir_tour", magazineId: magazine.id })) router.refresh();
  }

  /* ─────────────── déposer le PDF : rendre, comparer, envoyer, enregistrer ─────────────── */
  async function deposer(fichier: File) {
    const etape = (texte: string) => setTravail({ texte, erreur: false, fini: false });
    try {
      if (fichier.type && fichier.type !== "application/pdf") throw new Refus("Un PDF, exporté d'Affinity.");
      etape("Ouverture du tour…");
      const ouvert = (await poster(id, { action: "ouvrir_tour", magazineId: magazine.id })) as {
        tour: { id: string; numero: number };
        precedent: { id: string; numero: number; pages: { index: number; empreinte: string | null; mots: string | null }[] } | null;
      };
      const tourId = ouvert.tour.id;
      etape("Lecture du PDF…");
      const octets = new Uint8Array(await fichier.arrayBuffer());
      const { pages, avertissements } = await rendrePdf(octets, (i, n) => etape(`Rendu de la page ${i} sur ${n}…`));

      let comparaison = comparer(pages, null, null);
      if (ouvert.precedent) {
        etape(`Comparaison avec le tour ${ouvert.precedent.numero}…`);
        const rep = await fetch(`/api/admin/collectif/editions/${id}/bat/fichier?tour=${ouvert.precedent.id}&quoi=gris`);
        const brut = rep.ok ? await decompresser(await rep.blob()) : null;
        const gris = brut ? decoderGris(brut) : null;
        if (!gris) avertissements.push(`Les gris du tour ${ouvert.precedent.numero} manquent : les pages sont appariées, aucune zone n'est entourée.`);
        comparaison = comparer(pages, ouvert.precedent.pages, gris);
      }

      etape("Préparation de l'envoi…");
      const sig = (await poster(id, {
        action: "presigner",
        tourId,
        pdf: { taille: fichier.size },
        pages: [
          ...pages.map((p) => ({ index: p.index, type: p.type, taille: p.image.size })),
          ...pages.map((p) => ({ index: p.index, type: p.type, taille: p.vignette.size, vignette: true })),
        ],
      })) as { pdf: { key: string; url: string }; pages: { index: number; vignette: boolean; key: string; url: string }[] };

      etape(`Envoi du PDF source (${mo(fichier.size)} Mo)…`);
      await envoyerPut(sig.pdf.url, fichier, "application/pdf", "Le PDF source");
      let faits = 0;
      await enParallele(sig.pages, 4, async (s) => {
        const p = pages[s.index];
        await envoyerPut(s.url, s.vignette ? p.vignette : p.image, p.type, `La page ${s.index + 1}`);
        faits++;
        etape(`Envoi des images : ${faits} sur ${sig.pages.length}…`);
      });

      etape("Envoi des empreintes de pages…");
      const gris = await compresser(encoderGris(pages.map((p) => p.gris)));
      if (gris.size > 4 * 1024 * 1024) throw new Refus("Les empreintes de pages dépassent 4 Mo une fois compressées : trop de pages pour un tour.");
      const repGris = await fetch(`/api/admin/collectif/editions/${id}/bat/fichier?tour=${tourId}&quoi=gris`, {
        method: "POST",
        headers: { "content-type": "application/gzip" },
        body: gris,
      });
      if (!repGris.ok) throw new Refus(`Les empreintes de pages n'ont pas été enregistrées (erreur ${repGris.status}).`);

      etape("Enregistrement du tour…");
      const cle = new Map(sig.pages.map((s) => [`${s.index}${s.vignette ? "v" : ""}`, s.key]));
      const r = (await poster(id, {
        action: "enregistrer_pages",
        tourId,
        pages: pages.map((p, k) => ({
          index: p.index,
          image_key: cle.get(String(p.index)),
          vignette_key: cle.get(`${p.index}v`) ?? null,
          empreinte: p.empreinte,
          mots: p.mots,
          apparie_a: comparaison[k].apparie_a,
          zones: comparaison[k].zones,
        })),
      })) as { resume: { nouvelles: number; modifiees: number; retirees: number[] } };
      const phrase = ouvert.precedent
        ? ` Depuis le tour ${ouvert.precedent.numero} : ${r.resume.modifiees} page(s) modifiée(s), ${r.resume.nouvelles} nouvelle(s), ${r.resume.retirees.length} retirée(s).`
        : "";
      setTravail({ texte: `Tour ${ouvert.tour.numero} rendu : ${pages.length} pages.${phrase} ${avertissements.join(" ")}`.trim(), erreur: false, fini: true });
      router.refresh();
    } catch (e) {
      setTravail({ texte: e instanceof Error ? e.message : "Le rendu a échoué.", erreur: true, fini: false });
    }
  }

  async function deposerCouverture(rang: number, face: "c1" | "c2" | "c3", fichier: File) {
    if (!brouillon) return;
    setOccupe(true);
    setMessage(null);
    try {
      const reduite = await reduireImage(fichier);
      const rep = await fetch(`/api/admin/collectif/editions/${id}/bat/fichier?tour=${brouillon.id}&quoi=${face}&rang=${rang}`, {
        method: "POST",
        headers: { "content-type": reduite.type },
        body: reduite.blob,
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!rep.ok) throw new Refus(json.message ?? `Refusé (erreur ${rep.status}).`);
      router.refresh();
    } catch (e) {
      dire(e instanceof Error ? e.message : "Image refusée.", true);
    } finally {
      setOccupe(false);
    }
  }

  const nbPropositions = bat.edition.nb_propositions_couverture;
  const rangsCouv = Array.from(
    { length: Math.max(nbPropositions ?? 0, bat.couvertures.length + (nbPropositions === null ? 1 : 0), bat.couvertures.length) },
    (_, k) => k + 1
  );

  return (
    <div className="eca-fiche">
      <div className="eca-colonne">
        <section className="ate-carte">
          <h2 className="ate-carte-titre">
            Magazine {magazine.rang} · {magazine.nom}
          </h2>
          {valide ? <p className="eca-message eca-message--ok">Bon à tirer validé par le client. Plus de nouveau tour.</p> : null}
          {publies.length === 0 ? (
            <p className="eca-vide">Aucun tour publié. Le client ne voit rien tant qu&apos;un tour n&apos;est pas publié.</p>
          ) : (
            <ul className="eca-mag-liste">
              {publies.map((t) => (
                <TourPublie key={t.id} t={t} actuel={t.id === publies[publies.length - 1].id} />
              ))}
            </ul>
          )}
          {publies.length ? (
            <p className="eca-champ-aide">
              <a href={`/edition/${bat.edition.token_responsable}/bat?m=${magazine.rang}`} target="_blank" rel="noopener noreferrer">
                Ouvrir le bon à tirer comme le client (lien du responsable)
              </a>
            </p>
          ) : null}
        </section>

        {!valide ? (
          <section className="ate-carte">
            <h2 className="ate-carte-titre">{brouillon ? `Tour ${brouillon.numero} · brouillon` : `Tour ${publies.length + 1} · à ouvrir`}</h2>
            <p className="eca-champ-aide">
              Le PDF est rendu dans ce navigateur, rogné au format fini, en images de {LARGEUR_RENDU_PX} px de large{" "}
              <span className="eca-afixer">[À FIXER : largeur provisoire, PRD §12.10]</span>. Il reste au coffre et n&apos;est jamais
              montré au client. Un tour publié est figé : un nouveau PDF fera un nouveau tour.
            </p>
            <label className="eca-champ">
              <span className="eca-champ-label">{brouillon?.pdf ? "Remplacer le PDF de ce brouillon" : "Déposer le PDF exporté d'Affinity"}</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="eca-fichier"
                disabled={occupeTravail || Boolean(bat.edition.archive_le)}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void deposer(f);
                }}
              />
            </label>
            {travail ? (
              <p className={travail.erreur ? "eca-message eca-message--erreur" : travail.fini ? "eca-message eca-message--ok" : "eca-message"} role="status">
                {travail.texte}
              </p>
            ) : null}

            {brouillon && brouillon.pages.length ? (
              <>
                <p className="eca-sous">
                  {brouillon.pages.length} pages
                  {brouillon.resume && brouillon.precedent
                    ? ` · depuis le tour ${brouillon.precedent} : ${brouillon.resume.modifiees} modifiée(s), ${brouillon.resume.nouvelles} nouvelle(s)${
                        brouillon.resume.retirees.length ? `, retirée(s) : ${brouillon.resume.retirees.map((r) => r + 1).join(", ")}` : ""
                      }`
                    : ""}
                </p>
                <div className="eca-bat-pages">
                  {brouillon.pages.map((p) => (
                    <figure key={p.index} className="eca-bat-page">
                      {p.vignette ? <img src={p.vignette} alt={`Page ${p.index + 1}`} loading="lazy" /> : <span />}
                      <figcaption>
                        {p.index + 1}
                        {brouillon.precedent ? (p.apparie_a === null ? " · nouvelle" : p.zones ? ` · ${p.zones} zone(s)` : "") : ""}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </>
            ) : null}

            {!brouillon ? (
              <div className="eca-barre">
                <button type="button" className="adm-btn adm-btn--ghost" disabled={occupe || Boolean(bat.edition.archive_le)} onClick={ouvrir}>
                  Ouvrir le brouillon du tour {publies.length + 1}
                </button>
                <span className="eca-champ-aide">(pour déposer les couvertures avant le PDF)</span>
              </div>
            ) : null}

            {brouillon && bat.couverturesModifiables ? (
              <div className="eca-bat-couvertures">
                <h3 className="eca-legende">Propositions de couverture</h3>
                <p className="eca-champ-aide">
                  {nbPropositions === null ? (
                    <span className="eca-afixer">[À FIXER] Nombre de propositions à régler dans les réglages de l&apos;édition : la publication l&apos;exige.</span>
                  ) : (
                    `${nbPropositions} proposition(s) attendue(s), chacune avec sa 1re, sa 2e et sa 3e de couverture.`
                  )}
                </p>
                {rangsCouv.map((rang) => {
                  const c = bat.couvertures.find((x) => x.rang === rang) ?? null;
                  return (
                    <div key={rang} className="eca-bat-couv">
                      <strong>Proposition {rang}</strong>
                      <div className="eca-bat-faces">
                        {(["c1", "c2", "c3"] as const).map((face, k) => {
                          const url = c ? c[face] : null;
                          return (
                            <label key={face} className="eca-bat-face">
                              <span className="eca-bat-face-image">{url ? <img src={url} alt="" /> : <span>{k + 1}{k === 0 ? "re" : "e"}</span>}</span>
                              <span className="eca-champ-aide">{k + 1}{k === 0 ? "re" : "e"} de couverture</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="eca-fichier"
                                disabled={occupe || (face !== "c1" && !c)}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  e.target.value = "";
                                  if (f) void deposerCouverture(rang, face, f);
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                      {c ? (
                        <div className="eca-barre">
                          <input
                            className="eca-input"
                            placeholder="Légende (« La photo de groupe, sur fond blanc. »)"
                            value={legendes[rang] ?? ""}
                            onChange={(e) => setLegendes((l) => ({ ...l, [rang]: e.target.value }))}
                          />
                          <button type="button" className="adm-btn adm-btn--ghost" disabled={occupe} onClick={() => agir({ action: "legende", tourId: brouillon.id, rang, legende: legendes[rang] ?? "" }, "Légende enregistrée.")}>
                            Enregistrer
                          </button>
                          <button
                            type="button"
                            className="adm-btn adm-btn--ghost"
                            disabled={occupe}
                            onClick={async () => {
                              if (await agir({ action: "retirer_couverture", tourId: brouillon.id, rang })) router.refresh();
                            }}
                          >
                            Retirer
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {brouillon ? (
              <>
                <label className="eca-champ">
                  <span className="eca-champ-label">Retours attendus avant le (heure de Paris)</span>
                  <span className="eca-barre">
                    <input type="datetime-local" className="eca-input" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost"
                      disabled={occupe}
                      onClick={async () => {
                        if (await agir({ action: "echeance", tourId: brouillon.id, echeance_local: echeance }, "Échéance enregistrée.")) router.refresh();
                      }}
                    >
                      Enregistrer
                    </button>
                  </span>
                </label>

                {!verif ? (
                  <div className="eca-barre">
                    <button
                      type="button"
                      className="adm-btn"
                      disabled={occupe || occupeTravail}
                      onClick={async () => {
                        const r = await agir({ action: "publier", tourId: brouillon.id, verifier: true });
                        if (r) setVerif({ ...(r as unknown as Verification), explication: (r.geste as { explication: string }).explication });
                      }}
                    >
                      Publier le tour {brouillon.numero}…
                    </button>
                  </div>
                ) : (
                  <div className="eca-confirm">
                    <p>
                      <strong>Publier le tour {verif.tour}</strong> ({verif.pages} pages) :{" "}
                      {verif.de === verif.vers ? `l'édition reste en « ${verif.vers} ».` : `l'édition passe de « ${verif.de} » à « ${verif.vers} ».`}
                    </p>
                    {verif.precedent ? (
                      <p>
                        Depuis le tour {verif.precedent} : {verif.resume.modifiees} page(s) modifiée(s), {verif.resume.nouvelles} nouvelle(s),{" "}
                        {verif.resume.retirees.length} retirée(s).
                      </p>
                    ) : null}
                    <p>{verif.explication}</p>
                    <div className="eca-barre">
                      <button
                        type="button"
                        className="adm-btn"
                        disabled={occupe}
                        onClick={async () => {
                          const r = await agir({ action: "publier", tourId: brouillon.id }, "Tour publié : le client le voit.");
                          setVerif(null);
                          if (r) router.refresh();
                        }}
                      >
                        Confirmer la publication
                      </button>
                      <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setVerif(null)}>
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
            {message ? <p className={message.erreur ? "eca-message eca-message--erreur" : "eca-message eca-message--ok"} role="status">{message.texte}</p> : null}
          </section>
        ) : null}
      </div>

      <aside className="eca-colonne">
        <section className="ate-carte">
          <h2 className="ate-carte-titre">Couverture</h2>
          <p>{magazine.couverture || "Pas encore choisie"}</p>
          {magazine.couverture_note ? (
            <p className="eca-sous">
              Note du client : <q>{magazine.couverture_note}</q>
            </p>
          ) : null}
          {!bat.tours.some((t) => t.publie) && bat.couvertures.length === 0 ? <p className="eca-vide">Les propositions partent avec le premier tour.</p> : null}
          {bat.tours.some((t) => t.publie) && bat.couvertures.length ? (
            <div className="eca-bat-propositions">
              {bat.couvertures.map((c) => (
                <figure key={c.rang} data-choisie={magazine.couverture === `Proposition ${c.rang} choisie`}>
                  {c.c1 ? <img src={c.c1} alt={`Proposition ${c.rang}`} /> : null}
                  <figcaption>
                    Proposition {c.rang}
                    {c.legende ? ` · ${c.legende}` : ""}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : null}
        </section>

        <section className="ate-carte">
          <h2 className="ate-carte-titre">Les notes du client</h2>
          {bat.notes.length === 0 ? (
            <p className="eca-vide">Aucune note envoyée. Le client les envoie en lot quand il a fini de relire.</p>
          ) : (
            <ul className="eca-mag-liste">
              {bat.notes.map((n) => (
                <li key={n.id} className="eca-bat-note">
                  <span className="eca-mag-ligne">
                    <span>
                      <strong>{n.numero}.</strong> {TYPES_NOTE.find((t) => t.cle === n.type)?.libelle ?? n.type}
                    </span>
                    <span className="eca-sous">
                      Tour {n.tour} · {n.page === null ? "note générale" : `page ${n.page + 1}`} · {n.resolue ? "résolue" : "à traiter"}
                    </span>
                  </span>
                  <span className="eca-bat-note-corps">
                    {n.photo ? <img src={n.photo} alt="Photo demandée" /> : null}
                    <span>{n.resume}</span>
                  </span>
                  <span className="eca-sous">Envoyée le {n.envoyeeTexte}</span>
                  <span className="eca-barre">
                    <input
                      className="eca-input"
                      placeholder="Répondre (« Corrigé dans le tour 2. »)"
                      value={reponses[n.id] ?? ""}
                      onChange={(e) => setReponses((r) => ({ ...r, [n.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost"
                      disabled={occupe || !(reponses[n.id] ?? "").trim() || (reponses[n.id] ?? "") === (n.reponse ?? "")}
                      onClick={async () => {
                        if (await agir({ action: "repondre", noteId: n.id, reponse: reponses[n.id] }, "Réponse enregistrée.")) router.refresh();
                      }}
                    >
                      {n.reponse ? "Modifier" : "Répondre"}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

function TourPublie({ t, actuel }: { t: TourAtelier; actuel: boolean }) {
  return (
    <li>
      <span className="eca-mag-ligne">
        <span>
          Tour {t.numero}
          {actuel ? " · en cours chez le client" : " · archivé"}
        </span>
        <span className="eca-sous">
          publié le {t.publieTexte} · {t.nbPages ?? "?"} pages
        </span>
      </span>
      <span className="eca-sous">
        {t.echeanceTexte ? `Retours attendus avant le ${t.echeanceTexte}` : "Sans échéance"}
        {t.resume && t.precedent ? ` · depuis le tour ${t.precedent} : ${t.resume.modifiees} modifiée(s), ${t.resume.nouvelles} nouvelle(s), ${t.resume.retirees.length} retirée(s)` : ""}
      </span>
    </li>
  );
}
