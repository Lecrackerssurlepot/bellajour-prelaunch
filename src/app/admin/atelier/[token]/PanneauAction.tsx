"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionVue, Fiche } from "../types";
import { SLOTS_IMPRESSION } from "@/lib/atelier/impression";

/**
 * L'action du moment — le geste que ce lot remplace.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * DEUX TEMPS, TOUJOURS : ON PRÉPARE, PUIS ON CONFIRME
 *
 * « Publier l'aperçu » ouvre une page de vente et envoie un mail avec un
 * prix. Ça ne se déclenche pas d'un clic distrait. Le premier bouton ne fait
 * qu'INTERROGER le serveur : il renvoie le palier, le prix et le nom de la
 * personne qui va recevoir le mail. Le second écrit.
 *
 * Le prix affiché n'est jamais calculé ici. Il vient du serveur, par le
 * chemin exact qui l'écrira (invariant nº2) : la grille de prix n'entre pas
 * dans le bundle du navigateur, même sur une page protégée.
 * ══════════════════════════════════════════════════════════════════════════
 */

type Verif = {
  action: { cle: string; libelle: string; vers: string; note?: string };
  resume: { nbPages?: number; palier?: string; euros?: number };
  /* T2-3 — le mot de l'atelier tel que le serveur l'a retenu : c'est LUI qui
     partira dans M9, pas la saisie locale. */
  mot?: string;
  destinataire: { prenom: string | null; email: string | null; titre: string | null };
  /* Le récap d'impression, calculé par le serveur (jamais ici) : ce qui va
     réellement partir chez Cloudprinter au clic suivant. */
  impression?: {
    modeManuel: boolean;
    produit: string | null;
    produitLibelle: string | null;
    shippingLevel: string;
    fichiers: Array<{ type: string; cle: string; taille: number; md5: string }>;
    adresse: { nom: string; ville: string; pays: string } | null;
  };
};

type Erreur = { champ: string; message: string };

/* T2-2 — le format normal : la couverture à plat (l'export naturel de Canva)
   plus la double page. La page cliente découpe les deux faces en CSS. */
const SLOTS_PLAT = [
  { cle: "apercu_plat", json: "plat", label: "La couverture à plat (C4 | dos | C1)" },
  { cle: "apercu_double", json: "double", label: "La double page" },
] as const;

/* L'ancien format, en trois fichiers. Il ne s'affiche QUE pour corriger un
   dossier publié avant la couverture à plat : deux formats au choix sur un
   dossier neuf, c'est un formulaire qui demande de choisir sans raison. */
const SLOTS_HISTORIQUE = [
  { cle: "apercu_c1", json: "c1", label: "Première de couverture" },
  { cle: "apercu_c4", json: "c4", label: "Quatrième de couverture" },
  { cle: "apercu_double", json: "double", label: "La double page" },
] as const;

export default function PanneauAction({ fiche, demo }: { fiche: Fiche; demo?: boolean }) {
  const router = useRouter();
  /* T2-6 — à l'état 2, la seule action est « Corriger l'aperçu » : une
     correction, pas l'étape suivante. La présélectionner déployait son
     formulaire en pleine page alors qu'on attend le paiement — le panneau
     dit d'abord QUI on attend, la correction se déplie derrière un lien. */
  const [choisie, setChoisie] = useState<ActionVue | null>(
    fiche.actions.length === 1 && fiche.actions[0].cle !== "corriger_apercu"
      ? fiche.actions[0]
      : null,
  );
  const [saisie, setSaisie] = useState<Record<string, string>>({
    nb_pages: fiche.ligne.nbPages ? String(fiche.ligne.nbPages) : "",
    apercu_plat: fiche.apercuBrut.plat ?? "",
    apercu_c1: fiche.apercuBrut.c1 ?? "",
    apercu_c4: fiche.apercuBrut.c4 ?? "",
    apercu_double: fiche.apercuBrut.double ?? "",
    canva_url: fiche.canvaUrl ?? "",
    maquette_pdf_url: fiche.maquettePdfUrl ?? "",
    pdf_produit: fiche.impressionFichiers.product ?? "",
    pdf_couverture: fiche.impressionFichiers.cover ?? "",
    pdf_interieur: fiche.impressionFichiers.book ?? "",
    transporteur: fiche.transporteur ?? "",
    tracking_url: fiche.trackingUrl ?? "",
  });
  const [apercus, setApercus] = useState<Record<string, string>>({
    apercu_plat: fiche.apercu.plat ?? "",
    apercu_c1: fiche.apercu.c1 ?? "",
    apercu_c4: fiche.apercu.c4 ?? "",
    apercu_double: fiche.apercu.double ?? "",
  });
  const [envoiEnCours, setEnvoiEnCours] = useState<string | null>(null);
  /* Les noms lisibles des PDF d'impression déposés — une clé de coffre seule
     ne dit rien à l'écran. Préremplis depuis la fiche si un dépôt a eu lieu. */
  const [pdfNoms, setPdfNoms] = useState<Record<string, string>>(() => {
    const noms: Record<string, string> = {};
    for (const s of SLOTS_IMPRESSION) {
      const cle = fiche.impressionFichiers[s.type];
      if (cle) noms[s.cle] = cle.split("/").pop() ?? cle;
    }
    return noms;
  });
  const [erreurs, setErreurs] = useState<Erreur[]>([]);
  const [verif, setVerif] = useState<Verif | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [fait, setFait] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const erreurDe = (champ: string) => erreurs.find((e) => e.champ === champ)?.message;
  const set = (champ: string, v: string) => {
    setSaisie((s) => ({ ...s, [champ]: v }));
    setVerif(null);
    setErreurs((e) => e.filter((x) => x.champ !== champ));
  };

  /* ── le dépôt d'un visuel ───────────────────────────────────────────
     Le fichier part DIRECTEMENT vers le coffre : il ne traverse jamais
     Vercel. La vignette affichée est l'objet local, pas un aller-retour
     réseau — l'atelier voit immédiatement ce qu'il vient de déposer. */
  async function televerser(champ: string, json: string, file: File) {
    setEnvoiEnCours(champ);
    setErreurs((e) => e.filter((x) => x.champ !== champ));
    try {
      const r = await fetch("/api/admin/atelier/apercu/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: fiche.ligne.token,
          slot: json,
          nom: file.name,
          type: file.type,
          taille: file.size,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        const messages: Record<string, string> = {
          format_refuse: "Format refusé. JPEG, PNG, WebP ou HEIC.",
          taille_refusee: "Fichier trop lourd (50 Mo maximum).",
        };
        setErreurs((e) => [
          ...e,
          { champ, message: messages[data?.error] ?? "Envoi impossible." },
        ]);
        return;
      }

      /* ⚠️ On ne pose PAS Content-Length à la main : le navigateur le calcule
         et il DOIT valoir exactement la taille déclarée à la signature. Un
         octet d'écart, R2 répond 403 sans en-tête CORS, ce qui s'affiche
         comme une trompeuse erreur d'accès (piège nº1 du mémo d'upload). */
      const put = await fetch(data.url, {
        method: "PUT",
        headers: { "content-type": data.contentType },
        body: file,
      });
      if (!put.ok) {
        setErreurs((e) => [...e, { champ, message: "Le coffre a refusé le fichier." }]);
        return;
      }

      set(champ, data.key);
      setApercus((a) => ({ ...a, [champ]: URL.createObjectURL(file) }));

      /* T2-2 — un plat qui arrive vide c1/c4 de la saisie : le serveur les
         ignorerait de toute façon (le plat gagne), mais une saisie qui porte
         les deux formats à la fois finirait par mentir à quelqu'un. */
      if (champ === "apercu_plat") {
        setSaisie((s) => ({ ...s, apercu_c1: "", apercu_c4: "" }));
      }
    } catch {
      setErreurs((e) => [...e, { champ, message: "Envoi interrompu. Réessaie." }]);
    } finally {
      setEnvoiEnCours(null);
    }
  }

  /* ── le dépôt du PDF print-ready ───────────────────────────────────
     Même mécanique que les visuels, autre route : PDF seulement, plafond
     dédié, et l'envoi DOIT rester un seul PUT — l'empreinte md5 qui part
     chez Cloudprinter est l'ETag de cet objet. */
  async function televerserPdf(champ: string, slot: string, file: File) {
    setEnvoiEnCours(champ);
    setErreurs((e) => e.filter((x) => x.champ !== champ));
    try {
      const r = await fetch("/api/admin/atelier/impression/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: fiche.ligne.token,
          slot,
          nom: file.name,
          type: file.type,
          taille: file.size,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        const messages: Record<string, string> = {
          format_refuse: "PDF uniquement.",
          taille_refusee: "Fichier trop lourd (200 Mo maximum).",
        };
        setErreurs((e) => [...e, { champ, message: messages[data?.error] ?? "Envoi impossible." }]);
        return;
      }

      const put = await fetch(data.url, {
        method: "PUT",
        headers: { "content-type": data.contentType },
        body: file,
      });
      if (!put.ok) {
        setErreurs((e) => [...e, { champ, message: "Le coffre a refusé le fichier." }]);
        return;
      }

      set(champ, data.key);
      setPdfNoms((n) => ({ ...n, [champ]: `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} Mo)` }));
    } catch {
      setErreurs((e) => [...e, { champ, message: "Envoi interrompu. Réessaie." }]);
    } finally {
      setEnvoiEnCours(null);
    }
  }

  async function appeler(verifier: boolean) {
    if (!choisie) return;
    if (demo) {
      /* En démonstration, la vérification est simulée pour que le parcours
         se déroule en entier ; rien ne part, ni en base, ni chez Brevo. */
      setVerif({
        action: { cle: choisie.cle, libelle: choisie.libelle, vers: choisie.vers, note: choisie.note },
        resume: simulerResume(choisie.cle, saisie.nb_pages),
        destinataire: {
          prenom: fiche.ligne.prenom,
          email: fiche.ligne.email,
          titre: fiche.ligne.titre,
        },
      });
      if (!verifier) setFait("Rien n'a été écrit : c'est la démonstration.");
      return;
    }

    setOccupe(true);
    setErreurs([]);
    try {
      const r = await fetch("/api/admin/atelier/transition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: fiche.ligne.token,
          action: choisie.cle,
          saisie,
          verifier,
        }),
      });
      const data = await r.json();

      if (r.status === 422) {
        setErreurs(data.erreurs ?? []);
        setVerif(null);
        return;
      }
      if (r.status === 409) {
        setFait(
          data?.error === "deja_commande"
            ? `La commande d'impression est déjà passée (nº ${data.orderId}). La page se recharge.`
            : "Le dossier a changé pendant que tu remplissais. La page se recharge.",
        );
        router.refresh();
        return;
      }
      if (!r.ok) {
        setErreurs([
          {
            champ: "action",
            message:
              data?.error === "cloudprinter" && data?.message
                ? `${data.message} Rien n'a été écrit.`
                : "L'opération a échoué. Rien n'a été écrit.",
          },
        ]);
        return;
      }

      if (verifier) {
        setVerif(data as Verif);
        return;
      }

      const mail = data.mail;
      setFait(
        mail
          ? mail.statut === "envoye"
            ? `C'est fait. Le mail ${mail.code} est parti.`
            : mail.statut === "deja_envoye"
              ? `C'est fait. Le mail ${mail.code} était déjà parti.`
              : `C'est fait, mais le mail ${mail.code} n'est pas parti (${mail.statut}). La relève réessaiera.`
          : "C'est fait. Aucun mail n'était prévu à cette étape.",
      );
      setVerif(null);
      router.refresh();
    } catch {
      setErreurs([{ champ: "action", message: "Réseau interrompu. Vérifie l'état avant de recommencer." }]);
    } finally {
      setOccupe(false);
    }
  }

  if (!fiche.actions.length) {
    return (
      <section className="ate-carte ate-action">
        <h2 className="ate-carte-titre">L&apos;action du moment</h2>
        <p className="ate-faint">
          Rien à faire depuis « {fiche.ligne.libelleEtat} ». La suite ne dépend pas de nous.
        </p>
      </section>
    );
  }

  const besoinApercu = choisie?.cle === "publier_apercu" || choisie?.cle === "corriger_apercu";

  /* T2-2 — quel jeu de cadres ? Le format à plat, sauf pour corriger un
     dossier publié en trois fichiers avant ce format (c1/c4 en base, pas de
     plat) : là, on corrige dans son format d'origine. */
  const modeHistorique = !fiche.apercuBrut.plat && Boolean(fiche.apercuBrut.c1 || fiche.apercuBrut.c4);
  const slotsApercu = modeHistorique ? SLOTS_HISTORIQUE : SLOTS_PLAT;

  return (
    <section className="ate-carte ate-action">
      <h2 className="ate-carte-titre">L&apos;action du moment</h2>

      {fiche.actions.length > 1 ? (
        <div className="ate-choix">
          {fiche.actions.map((a) => (
            <button
              key={a.cle}
              type="button"
              className={choisie?.cle === a.cle ? "ate-choix-btn ate-choix-btn--actif" : "ate-choix-btn"}
              onClick={() => {
                setChoisie(a);
                setVerif(null);
                setErreurs([]);
              }}
            >
              {a.libelle}
            </button>
          ))}
        </div>
      ) : null}

      {/* ── T2-6 : l'état 2 attend LE PAIEMENT, pas un geste de l'atelier.
          Les mots viennent de la même vérité que la page cliente (« c'est à
          elle ») ; la correction reste à un clic, repliée. */}
      {!choisie && fiche.actions.length === 1 && fiche.actions[0].cle === "corriger_apercu" ? (
        <>
          <p className="ate-attente">On attend son paiement.</p>
          <p className="ate-faint">
            Sa page montre la couverture, la pagination et le prix. La relance M3b
            partira toute seule si elle tarde.
          </p>
          <button
            type="button"
            className="ate-lien-discret"
            onClick={() => {
              setChoisie(fiche.actions[0]);
              setVerif(null);
              setErreurs([]);
            }}
          >
            Corriger l&apos;aperçu (visuels ou pagination)
          </button>
        </>
      ) : null}

      {choisie ? (
        <>
          <p className="ate-action-explication">{choisie.explication}</p>

          {besoinApercu ? (
            <>
              <div className="ate-slots">
                {slotsApercu.map((s) => (
                  <div key={s.cle} className="ate-slot">
                    <span className="ate-slot-label">{s.label}</span>
                    <button
                      type="button"
                      className={apercus[s.cle] ? "ate-slot-zone ate-slot-zone--pleine" : "ate-slot-zone"}
                      onClick={() => inputs.current[s.cle]?.click()}
                      disabled={envoiEnCours !== null}
                    >
                      {apercus[s.cle] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={apercus[s.cle]} alt="" className="ate-slot-img" />
                      ) : envoiEnCours === s.cle ? (
                        <span className="ate-slot-vide">Envoi…</span>
                      ) : (
                        <span className="ate-slot-vide">Choisir le fichier</span>
                      )}
                    </button>
                    <input
                      ref={(el) => {
                        inputs.current[s.cle] = el;
                      }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) televerser(s.cle, s.json, f);
                        e.target.value = "";
                      }}
                    />
                    {erreurDe(s.cle) ? <span className="ate-erreur">{erreurDe(s.cle)}</span> : null}
                  </div>
                ))}
              </div>

              <label className="ate-champ ate-champ--court">
                <span className="ate-champ-label">Nombre de pages composées</span>
                <input
                  className="adm-input"
                  type="number"
                  min={20}
                  max={50}
                  inputMode="numeric"
                  value={saisie.nb_pages}
                  onChange={(e) => set("nb_pages", e.target.value)}
                  placeholder="34"
                />
                <span className="ate-champ-aide">
                  Le prix en découle. De 20 à 50 pages, jamais saisi à la main.
                </span>
                {erreurDe("nb_pages") ? <span className="ate-erreur">{erreurDe("nb_pages")}</span> : null}
              </label>
            </>
          ) : null}

          {choisie.cle === "publier_maquette" ? (
            <>
              <label className="ate-champ">
                <span className="ate-champ-label">Lien Canva à PARTAGER</span>
                <input
                  className="adm-input"
                  type="url"
                  value={saisie.canva_url}
                  onChange={(e) => set("canva_url", e.target.value)}
                  placeholder="https://www.canva.com/design/…"
                />
                {/* PRD §11 : en édition, elle casse les fonds perdus, écrase une
                    police ou insère du 72 dpi, et ça se découvre à la livraison. */}
                <span className="ate-champ-aide ate-champ-aide--attention">
                  Mode COMMENTAIRE uniquement. Jamais le lien d&apos;édition.
                </span>
                {erreurDe("canva_url") ? <span className="ate-erreur">{erreurDe("canva_url")}</span> : null}
              </label>

              <label className="ate-champ">
                <span className="ate-champ-label">PDF feuilletable (facultatif)</span>
                <input
                  className="adm-input"
                  type="url"
                  value={saisie.maquette_pdf_url}
                  onChange={(e) => set("maquette_pdf_url", e.target.value)}
                  placeholder="https://…"
                />
                {erreurDe("maquette_pdf_url") ? (
                  <span className="ate-erreur">{erreurDe("maquette_pdf_url")}</span>
                ) : null}
              </label>
            </>
          ) : null}

          {choisie.cle === "envoyer_impression" ? (
            fiche.cloudprinterOrderId ? (
              /* Jamais deux commandes : si le numéro en porte déjà une, le
                 bouton disparaît et l'écran dit laquelle. */
              <p className="ate-fait">
                Commande nº {fiche.cloudprinterOrderId} déjà passée chez l&apos;imprimeur.
              </p>
            ) : (
              <>
                <div className="ate-slots">
                  {/* Quels cadres ? Ceux du produit : l'agrafé (20 p.) prend UN
                      PDF complet, le dos carré prend la couverture enveloppante
                      ET le bloc. Le serveur revalide — ici on n'affiche que les
                      cadres utiles pour ne pas faire déposer un fichier de trop. */}
                  {SLOTS_IMPRESSION.filter((s) =>
                    fiche.ligne.nbPages === 20 ? s.type === "product" : s.type !== "product",
                  ).map((s) => (
                    <div key={s.cle} className="ate-slot">
                      <span className="ate-slot-label">{s.label}</span>
                      <button
                        type="button"
                        className={saisie[s.cle] ? "ate-slot-zone ate-slot-zone--pleine" : "ate-slot-zone"}
                        onClick={() => inputs.current[s.cle]?.click()}
                        disabled={envoiEnCours !== null}
                      >
                        {envoiEnCours === s.cle ? (
                          <span className="ate-slot-vide">Envoi…</span>
                        ) : pdfNoms[s.cle] ? (
                          <span className="ate-slot-vide">{pdfNoms[s.cle]}</span>
                        ) : (
                          <span className="ate-slot-vide">Choisir le fichier</span>
                        )}
                      </button>
                      <input
                        ref={(el) => {
                          inputs.current[s.cle] = el;
                        }}
                        type="file"
                        accept="application/pdf"
                        hidden
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) televerserPdf(s.cle, s.slot, f);
                          e.target.value = "";
                        }}
                      />
                      {erreurDe(s.cle) ? <span className="ate-erreur">{erreurDe(s.cle)}</span> : null}
                    </div>
                  ))}
                </div>
                <span className="ate-champ-aide">
                  Les fichiers print-ready, pas le feuilletable : ce sont EUX qui partent chez
                  l&apos;imprimeur, avec l&apos;adresse collectée par Stripe.
                </span>
              </>
            )
          ) : null}

          {choisie.cle === "marquer_expediee" ? (
            <>
              <label className="ate-champ ate-champ--court">
                <span className="ate-champ-label">Transporteur</span>
                <input
                  className="adm-input"
                  value={saisie.transporteur}
                  onChange={(e) => set("transporteur", e.target.value)}
                  placeholder="Colissimo"
                />
                {erreurDe("transporteur") ? <span className="ate-erreur">{erreurDe("transporteur")}</span> : null}
              </label>
              <label className="ate-champ">
                <span className="ate-champ-label">Lien de suivi (facultatif)</span>
                <input
                  className="adm-input"
                  type="url"
                  value={saisie.tracking_url}
                  onChange={(e) => set("tracking_url", e.target.value)}
                  placeholder="https://…"
                />
                {erreurDe("tracking_url") ? <span className="ate-erreur">{erreurDe("tracking_url")}</span> : null}
              </label>
            </>
          ) : null}

          {choisie.cle === "photos_insuffisantes" ? (
            <label className="ate-champ">
              <span className="ate-champ-label">Un mot pour elle (facultatif)</span>
              <textarea
                className="adm-input ate-mot"
                rows={3}
                maxLength={500}
                value={saisie.mot ?? ""}
                onChange={(e) => set("mot", e.target.value)}
                placeholder="Ex. : vos photos sont belles mais trop sombres pour l'impression, si vous avez les originaux…"
              />
              {/* T2-3 — le cas réel : le problème était la QUALITÉ des photos,
                  pas leur nombre. Le mail générique tombait à côté. */}
              <span className="ate-champ-aide">
                Affiché dans M9, encart « Un mot de l&apos;atelier ». Vide : le mail part sans encart.
              </span>
            </label>
          ) : null}

          {erreurDe("action") ? <p className="ate-erreur ate-erreur--bloc">{erreurDe("action")}</p> : null}
          {erreurDe("etat") ? <p className="ate-erreur ate-erreur--bloc">{erreurDe("etat")}</p> : null}

          {/* ── l'écran de confirmation ─────────────────────────────────
              Ce que la cliente va recevoir, avant que ça parte. C'est la
              réponse à « est-ce que j'ai bien envoyé les bonnes infos au bon
              client ». */}
          {verif ? (
            <div className="ate-confirm">
              <h3 className="ate-confirm-titre">Avant de confirmer</h3>
              <dl className="ate-confirm-liste">
                {verif.resume.nbPages ? (
                  <>
                    <dt>Pagination</dt>
                    <dd>{verif.resume.nbPages} pages</dd>
                    <dt>Prix</dt>
                    <dd className="ate-confirm-prix">
                      {verif.resume.euros}&nbsp;€ <span className="ate-faint">({verif.resume.palier})</span>
                    </dd>
                  </>
                ) : null}
                {verif.impression ? (
                  <>
                    <dt>Produit</dt>
                    <dd>
                      {verif.impression.produitLibelle}{" "}
                      <span className="ate-faint">({verif.impression.produit})</span>
                    </dd>
                    <dt>{verif.impression.fichiers.length > 1 ? "Fichiers" : "Fichier"}</dt>
                    <dd>
                      {verif.impression.fichiers.length
                        ? verif.impression.fichiers
                            .map((f) => `${f.type} : ${(f.taille / (1024 * 1024)).toFixed(1)} Mo`)
                            .join(" · ") + ", empreintes vérifiées"
                        : "—"}
                    </dd>
                    <dt>Livraison</dt>
                    <dd>
                      {verif.impression.adresse
                        ? `${verif.impression.adresse.nom}, ${verif.impression.adresse.ville} (${verif.impression.adresse.pays})`
                        : "—"}{" "}
                      <span className="ate-faint">{verif.impression.shippingLevel}</span>
                    </dd>
                    {verif.impression.modeManuel ? (
                      <>
                        <dt>Imprimeur</dt>
                        <dd>
                          <span className="ate-alerte">
                            Cloudprinter n&apos;est pas branché (clé absente) : la commande est à
                            passer À LA MAIN sur leur interface. Seul l&apos;état changera ici.
                          </span>
                        </dd>
                      </>
                    ) : (
                      <>
                        <dt>Imprimeur</dt>
                        <dd>La commande partira chez Cloudprinter au clic suivant.</dd>
                      </>
                    )}
                  </>
                ) : null}
                {verif.mot ? (
                  <>
                    <dt>Votre mot</dt>
                    <dd>« {verif.mot} »</dd>
                  </>
                ) : null}
                <dt>Destinataire</dt>
                <dd>
                  {verif.destinataire.prenom || "—"}{" "}
                  <span className="ate-faint">{verif.destinataire.email}</span>
                </dd>
                <dt>Mail</dt>
                <dd>
                  {/* Le mail vient de la RÈGLE d'envoi, projetée sur ce
                      dossier : ce qui est annoncé ici est ce qui partira une
                      seconde plus tard, pas ce qu'une table déclarait. */}
                  {choisie.mail ? (
                    choisie.mail.absent ? (
                      <span className="ate-alerte">
                        {choisie.mail.code} n&apos;est pas encore câblé — elle ne sera PAS prévenue.
                        Préviens-la à la main.
                      </span>
                    ) : (
                      <>Le mail {choisie.mail.code} partira maintenant.</>
                    )
                  ) : (
                    "Aucun mail ne partira maintenant."
                  )}
                  {verif.action.note ? (
                    <span className="ate-faint"> {verif.action.note}</span>
                  ) : null}
                </dd>
              </dl>

              <div className="ate-confirm-boutons">
                <a
                  className="adm-btn adm-btn--ghost"
                  href={`/numero/${fiche.ligne.token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Voir sa page
                </a>
                <button
                  className="adm-btn ate-btn-valider"
                  type="button"
                  disabled={occupe}
                  onClick={() => appeler(false)}
                >
                  {occupe ? "…" : `Confirmer — ${choisie.libelle}`}
                </button>
              </div>
            </div>
          ) : choisie.cle === "envoyer_impression" && fiche.cloudprinterOrderId ? null : (
            <button
              className="adm-btn ate-btn-preparer"
              type="button"
              disabled={occupe || envoiEnCours !== null}
              onClick={() => appeler(true)}
            >
              {occupe ? "…" : "Préparer"}
            </button>
          )}

          {fait ? <p className="ate-fait">{fait}</p> : null}
        </>
      ) : (
        <p className="ate-faint">Choisis une action.</p>
      )}
    </section>
  );
}

/* Le seul calcul de prix côté navigateur de tout le projet, et il n'existe
   QUE pour la démonstration : sans lui, l'écran de confirmation de la démo
   serait vide et le parcours ne se raconterait pas. Il ne sert jamais sur un
   vrai dossier — là, le résumé vient du serveur. */
function simulerResume(cle: string, nbPagesBrut: string) {
  if (cle !== "publier_apercu" && cle !== "corriger_apercu") return {};
  const n = Number(nbPagesBrut);
  if (!Number.isInteger(n)) return {};
  if (n >= 20 && n <= 29) return { nbPages: n, palier: "p30", euros: 30 };
  if (n >= 30 && n <= 39) return { nbPages: n, palier: "p40", euros: 40 };
  if (n >= 40 && n <= 50) return { nbPages: n, palier: "p45", euros: 45 };
  return { nbPages: n };
}
