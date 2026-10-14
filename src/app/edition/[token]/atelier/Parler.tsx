"use client";

/* « Parler à l'atelier » (PRD §7, révision §14.5, maquette RendezVous).

   UN fil réunit tout : les messages, les demandes de modification (un
   message du client qui EST une demande devient une carte,
   `lireMessageDemande`) et les propositions complémentaires de l'atelier
   (des documents, avec Accepter / En reparler). La zone d'écriture reste en
   bas ; son « + » joint un fichier ou CITE un document de l'édition, qui
   s'affiche en étiquette au-dessus du message. À droite : le rendez-vous
   (le lien Google de la fiche, PRD §0.5) et « Vos demandes ».

   « L'atelier vous répond ici » : pas de mail en phase 2 (PRD §0.5). Le lien
   d'équipe lit le fil, sans zone d'écriture. Le fil se relit toutes les
   3,5 s, onglet visible (useMessagerie) ; « marquer lu » se fait par un
   effet, jamais au rendu. */

import { useEffect, useMemo, useRef, useState } from "react";
import { formaterHeureParis, formaterJourParis } from "@/lib/collectif/dates";
import { demandesDuFil, lireMessageDemande } from "@/lib/collectif/livraison";
import { filDeConversation, lirePieceJointe, type Message } from "@/lib/collectif/messages";
import { EnTeteEcran } from "../../_composants/Ecran";
import Fenetre from "../../_composants/Fenetre";
import { useMessagerie, type Joint } from "../../_composants/useMessagerie";
import { EVENEMENT_MESSAGES_LUS } from "../Coquille";
import type { DocumentDossier } from "../donnees";
import DemandeModification from "./DemandeModification";
import CarteProposition from "./Propositions";
import "./atelier.css";

type DocumentCite = { id: string; libelle: string; libelleType: string };

type Props = {
  token: string;
  initiaux: Message[];
  documents: DocumentCite[];
  propositions: DocumentDossier[];
  /** Le responsable : écrire, demander, répondre aux propositions. */
  ecrire: boolean;
  /** Avant la validation du bon à tirer seulement. */
  demandePossible: boolean;
  rdvUrl: string | null;
  tu: boolean;
};

async function appeler(url: string, corps: Record<string, unknown> | FormData) {
  const rep = await fetch(url, {
    method: "POST",
    headers: corps instanceof FormData ? undefined : { "content-type": "application/json" },
    body: corps instanceof FormData ? corps : JSON.stringify(corps),
  });
  const json = (await rep.json().catch(() => ({}))) as { messages?: Message[]; message?: Message | string };
  return { rep, json };
}

function IconeDocument() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}

export default function Parler(p: Props) {
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);
  const [demande, setDemande] = useState(false);
  const fil = useRef<HTMLDivElement>(null);
  const { messages, envoyer, envoi, erreur, ajouter } = useMessagerie({
    initiaux: p.initiaux,
    lecteur: "client",
    charger: async (depuis) => {
      try {
        const { rep, json } = await appeler("/api/collectif/messages", { token: p.token, depuis });
        return rep.ok ? json.messages ?? [] : null;
      } catch {
        return null;
      }
    },
    envoyer: async (t, joint) => {
      try {
        let corps: Record<string, unknown> | FormData = { token: p.token, texte: t, documentId: joint?.documentId ?? null };
        if (joint?.fichier) {
          const f = new FormData();
          f.set("token", p.token);
          f.set("texte", t);
          if (joint.documentId) f.set("documentId", joint.documentId);
          f.set("fichier", joint.fichier);
          corps = f;
        }
        const { rep, json } = await appeler("/api/collectif/messages/envoyer", corps);
        if (rep.ok && json.message && typeof json.message === "object") return json.message;
        return typeof json.message === "string" ? json.message : `Message non envoyé (erreur ${rep.status}).`;
      } catch {
        return "Le réseau n'a pas répondu. Message non envoyé.";
      }
    },
    marquerLus: p.ecrire
      ? async () => {
          try {
            await appeler("/api/collectif/messages/lus", { token: p.token });
            /* La pastille du menu s'éteint sans recharger la page. */
            window.dispatchEvent(new Event(EVENEMENT_MESSAGES_LUS));
          } catch {
            /* un accusé de lecture manqué se rattrape à la visite suivante */
          }
        }
      : undefined,
  });

  const elements = useMemo(() => filDeConversation(messages, p.propositions, formaterJourParis), [messages, p.propositions]);
  const demandes = useMemo(() => demandesDuFil(messages), [messages]);

  /* Le fil s'ouvre sur le plus récent, et y revient à chaque nouveau message. */
  useEffect(() => {
    const f = fil.current;
    if (f) f.scrollTop = f.scrollHeight;
  }, [elements.length]);

  return (
    <section className="ec-ecran ec-parler">
      <EnTeteEcran titre="Parler à l'atelier" sous="Messages, rendez-vous et demandes au même endroit">
        {p.rdvUrl ? (
          <a className="ec-bouton ec-bouton--clair ec-bouton--petit" href={p.rdvUrl} target="_blank" rel="noopener noreferrer">
            Prendre rendez-vous
          </a>
        ) : null}
        {p.ecrire && p.demandePossible ? (
          <button type="button" className="ec-bouton ec-bouton--petit" onClick={() => setDemande(true)}>
            Demander une modification
          </button>
        ) : null}
      </EnTeteEcran>

      <div className="ec-parler-corps">
        <div className="ec-parler-colonne">
          <div className="ec-parler-fil ec-defile" ref={fil} aria-live="polite">
            {elements.length === 0 ? (
              <p className="ec-note ec-parler-vide">
                {p.ecrire ? v("Aucun message pour l'instant. Une question ? Écrivez-nous ci-dessous.", "Aucun message pour l'instant. Une question ? Écris-nous ci-dessous.") : "Aucun message pour l'instant."}
              </p>
            ) : (
              elements.map((el) =>
                el.genre === "jour" ? (
                  <span key={el.cle} className="ec-parler-jour">
                    {el.jour}
                  </span>
                ) : el.genre === "proposition" ? (
                  <CarteProposition key={el.cle} token={p.token} d={el.proposition} ecrire={p.ecrire} tu={p.tu} onMessage={(m) => ajouter([m])} />
                ) : (
                  <Bulle key={el.cle} m={el.message} />
                )
              )
            )}
          </div>
          {p.ecrire ? (
            <Ecrire documents={p.documents} envoi={envoi} erreur={erreur} tu={p.tu} onEnvoyer={envoyer} />
          ) : (
            <p className="ec-note ec-parler-lecture">Ce lien permet de tout lire, sans écrire.</p>
          )}
        </div>

        <aside className="ec-parler-cote ec-defile" aria-label="Rendez-vous et demandes">
          <section className="ec-parler-bloc">
            <span className="ec-parler-etiquette">Rendez-vous</span>
            <strong className="ec-parler-cote-titre">Un appel avec l&apos;atelier</strong>
            {p.rdvUrl ? (
              <>
                <span className="ec-note">{v("Pour relire ensemble ou parler d'une demande. Vous choisissez le créneau sur la page de l'atelier.", "Pour relire ensemble ou parler d'une demande. Tu choisis le créneau sur la page de l'atelier.")}</span>
                <a className="ec-bouton ec-bouton--clair ec-bouton--petit" href={p.rdvUrl} target="_blank" rel="noopener noreferrer">
                  Prendre rendez-vous
                </a>
              </>
            ) : (
              <span className="ec-note">L&apos;atelier ajoutera bientôt son lien de rendez-vous.</span>
            )}
          </section>
          <section className="ec-parler-bloc ec-parler-bloc--filet">
            <span className="ec-parler-etiquette">{v("Vos demandes", "Tes demandes")}</span>
            {demandes.length === 0 && p.propositions.length === 0 ? (
              <span className="ec-note">Aucune demande pour l&apos;instant.</span>
            ) : (
              <ul className="ec-parler-demandes">
                {demandes.map((d) => (
                  <li key={d.quand}>
                    <span>{d.motif}</span>
                    <span className="ec-note">envoyée le {formaterJourParis(d.quand)}</span>
                  </li>
                ))}
                {p.propositions.map((d) => (
                  <li key={d.id}>
                    <span>{d.libelle}</span>
                    {d.statut ? <span className="ec-note">{d.statut}</span> : <span className="ec-parler-accent">Proposition à lire</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="ec-note ec-parler-pied">{v("L'atelier vous répond ici.", "L'atelier te répond ici.")}</p>
        </aside>
      </div>

      {demande ? (
        <Fenetre
          titre="Demander une modification"
          sous={v(
            "Si elle change le devis, l'atelier vous propose un court appel puis une proposition complémentaire, à accepter ici.",
            "Si elle change le devis, l'atelier te propose un court appel puis une proposition complémentaire, à accepter ici."
          )}
          onFermer={() => setDemande(false)}
        >
          <DemandeModification
            token={p.token}
            tu={p.tu}
            onEnvoyee={(m) => {
              if (m) ajouter([m]);
              setDemande(false);
            }}
          />
        </Fenetre>
      ) : null}
    </section>
  );
}

/* Un message : une bulle ; une demande du client : une carte. Le document
   cité s'affiche en étiquette AU-DESSUS du texte, la pièce jointe dessous. */
function Bulle({ m }: { m: Message }) {
  const moi = m.auteur === "client";
  const qui = m.auteur === "atelier" ? `L'atelier${m.qui ? ` · ${m.qui}` : ""}` : m.qui ?? "Vous";
  const heure = formaterHeureParis(m.created_at);
  const demande = moi ? lireMessageDemande(m.texte) : null;
  if (demande) {
    return (
      <div className="ec-parler-carte">
        <span className="ec-parler-etiquette ec-parler-accent">Demande de modification</span>
        <span>
          <strong>{demande.motif}</strong>
          {demande.precision ? ` · ${demande.precision}` : ""}
        </span>
        <span className="ec-parler-qui">
          {qui} · {heure}
        </span>
      </div>
    );
  }
  const texteSeul = !(m.piece && m.texte === `Fichier joint : ${m.piece.nom}`);
  return (
    <div className={moi ? "ec-parler-bulle ec-parler-bulle--moi" : "ec-parler-bulle"}>
      {m.document ? (
        m.document.url ? (
          <a className="ec-parler-cite" href={m.document.url} target="_blank" rel="noopener noreferrer">
            <IconeDocument />
            {m.document.libelle}
          </a>
        ) : (
          <span className="ec-parler-cite">
            <IconeDocument />
            {m.document.libelle}
          </span>
        )
      ) : null}
      {texteSeul ? <span className="ec-parler-texte">{m.texte}</span> : null}
      {m.piece ? (
        m.piece.url ? (
          <a className="ec-parler-cite ec-parler-cite--piece" href={m.piece.url} target="_blank" rel="noopener noreferrer">
            <IconeDocument />
            {m.piece.nom}
          </a>
        ) : (
          <span className="ec-parler-cite ec-parler-cite--piece">
            <IconeDocument />
            {m.piece.nom}
          </span>
        )
      ) : null}
      <span className="ec-parler-qui">
        {qui} · {heure}
      </span>
    </div>
  );
}

/* La zone d'écriture : le texte, le « + » (joindre un fichier, citer un
   document), Envoyer. Ce qui est joint ou cité s'affiche en étiquette au-dessus. */
function Ecrire(e: {
  documents: DocumentCite[];
  envoi: boolean;
  erreur: string | null;
  tu: boolean;
  onEnvoyer: (texte: string, joint?: Joint) => Promise<boolean>;
}) {
  const v = (vous: string, toi: string) => (e.tu ? toi : vous);
  const [texte, setTexte] = useState("");
  const [menu, setMenu] = useState(false);
  const [cite, setCite] = useState<DocumentCite | null>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [refus, setRefus] = useState<string | null>(null);
  const champFichier = useRef<HTMLInputElement>(null);
  const pret = Boolean(texte.trim() || fichier);

  async function soumettre(ev: React.FormEvent) {
    ev.preventDefault();
    if (!pret || e.envoi) return;
    if (await e.onEnvoyer(texte, { documentId: cite?.id ?? null, fichier })) {
      setTexte("");
      setCite(null);
      setFichier(null);
    }
  }

  function choisirFichier(f: File | undefined) {
    if (!f) return;
    const lu = lirePieceJointe(f.name, f.size);
    if (!lu.ok) {
      setRefus(lu.message);
      return;
    }
    setRefus(null);
    setFichier(f);
  }

  return (
    <form className="ec-parler-ecrire" onSubmit={soumettre} onKeyDown={(ev) => ev.key === "Escape" && setMenu(false)}>
      {cite || fichier ? (
        <div className="ec-parler-joints">
          {cite ? (
            <span className="ec-parler-joint">
              <IconeDocument />
              {cite.libelle}
              <button type="button" aria-label="Ne plus citer ce document" onClick={() => setCite(null)}>
                ✕
              </button>
            </span>
          ) : null}
          {fichier ? (
            <span className="ec-parler-joint">
              <IconeDocument />
              {fichier.name}
              <button type="button" aria-label="Retirer le fichier" onClick={() => setFichier(null)}>
                ✕
              </button>
            </span>
          ) : null}
        </div>
      ) : null}
      {menu ? (
        <div className="ec-parler-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(false);
              champFichier.current?.click();
            }}
          >
            Joindre un fichier depuis l&apos;ordinateur
          </button>
          <span className="ec-parler-etiquette ec-parler-menu-titre">Citer un document</span>
          {e.documents.length === 0 ? (
            <span className="ec-note ec-parler-menu-vide">L&apos;atelier n&apos;a encore déposé aucun document.</span>
          ) : (
            e.documents.map((d) => (
              <button
                key={d.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setCite(d);
                  setMenu(false);
                }}
              >
                <IconeDocument />
                <span className="ec-parler-menu-nom">
                  <span>{d.libelle}</span>
                  <span className="ec-note">{d.libelleType}</span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
      <div className="ec-parler-ligne">
        <textarea
          className="ec-champ ec-parler-zone"
          rows={1}
          value={texte}
          maxLength={4000}
          onChange={(ev) => setTexte(ev.target.value)}
          placeholder="Écrire à l'atelier…"
          aria-label={v("Votre message", "Ton message")}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) void soumettre(ev);
          }}
        />
        <button type="button" className="ec-bouton ec-bouton--clair ec-parler-plus" aria-label="Joindre un fichier ou citer un document" aria-expanded={menu} onClick={() => setMenu((x) => !x)}>
          +
        </button>
        <button type="submit" className="ec-bouton" disabled={e.envoi || !pret}>
          {e.envoi ? "Envoi…" : "Envoyer"}
        </button>
      </div>
      <input
        ref={champFichier}
        type="file"
        hidden
        onChange={(ev) => {
          choisirFichier(ev.target.files?.[0]);
          ev.target.value = "";
        }}
      />
      {refus || e.erreur ? (
        <p className="ec-note ec-note--erreur" role="alert">
          {refus ?? e.erreur}
        </p>
      ) : null}
    </form>
  );
}
