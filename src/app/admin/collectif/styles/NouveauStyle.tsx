"use client";

/* Créer un style : un nom, son adresse (slug, définitive), son public.
   Le reste se remplit dans l'éditeur. Le style naît NON publié. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugDepuisNom } from "@/lib/collectif/styles";

export default function NouveauStyle() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouche, setSlugTouche] = useState(false);
  const [segment, setSegment] = useState("tous");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const slugEffectif = slugTouche ? slug : slugDepuisNom(nom);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      const rep = await fetch("/api/admin/collectif/styles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nom, slug: slugEffectif, segment }),
      });
      const json = (await rep.json().catch(() => ({}))) as { id?: string; erreurs?: { message: string }[] };
      if (!rep.ok || !json.id) {
        setErreur(json.erreurs?.map((x) => x.message).join(" ") ?? `Style non créé (erreur ${rep.status}).`);
        return;
      }
      router.push(`/admin/collectif/styles/${json.id}`);
    } catch {
      setErreur("Le réseau n'a pas répondu. Rien n'est créé.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form className="ate-carte eca-form" onSubmit={creer}>
      <h2 className="ate-carte-titre">Nouveau style</h2>
      <div className="eca-champs">
        <label className="eca-champ">
          <span className="eca-champ-label">Nom *</span>
          <input className="eca-input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Riviera" />
        </label>
        <label className="eca-champ">
          <span className="eca-champ-label">Adresse du style</span>
          <input
            className="eca-input"
            value={slugEffectif}
            onChange={(e) => {
              setSlugTouche(true);
              setSlug(e.target.value);
            }}
          />
          <span className="eca-champ-aide">Définitive : les images du style sont rangées sous elle.</span>
        </label>
        <label className="eca-champ">
          <span className="eca-champ-label">Public</span>
          <select className="eca-select" value={segment} onChange={(e) => setSegment(e.target.value)}>
            <option value="tous">Tous</option>
            <option value="entreprise">Entreprise</option>
            <option value="ecole">École</option>
          </select>
        </label>
      </div>
      <div className="eca-barre">
        <button type="submit" className="adm-btn" disabled={envoi || !nom.trim()}>
          {envoi ? "Création…" : "Créer le style"}
        </button>
        {erreur ? (
          <p className="eca-message eca-message--erreur" role="alert">
            {erreur}
          </p>
        ) : null}
      </div>
    </form>
  );
}
