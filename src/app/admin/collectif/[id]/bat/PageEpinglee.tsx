"use client";

/* La page telle que le client l'a annotée (maquette BAT du 27/10) : l'image en
   grand du tour, et chaque note posée à l'endroit touché, avec le même numéro
   que chez le client. Cliquer une note de la liste choisit sa page ; cliquer
   une épingle remonte à sa note. Une note sans endroit (note de page ou
   générale) reste dans la liste seulement. */

import type { NoteAtelier, TourAtelier } from "../../donnees";

type Props = {
  tours: TourAtelier[];
  notes: NoteAtelier[];
  choisie: string | null;
  onChoisir: (id: string) => void;
};

/** Les pages qui portent au moins une épingle, dans l'ordre des tours puis des pages. */
export function pagesEpinglees(tours: TourAtelier[], notes: NoteAtelier[]): { tourId: string; tour: number; page: number }[] {
  const vues = new Set<string>();
  const liste: { tourId: string; tour: number; page: number }[] = [];
  for (const n of notes) {
    if (n.page === null || n.x === null || n.y === null) continue;
    const cle = `${n.tourId}:${n.page}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    liste.push({ tourId: n.tourId, tour: n.tour, page: n.page });
  }
  const rang = new Map(tours.map((t) => [t.id, t.numero]));
  return liste.sort((a, b) => (rang.get(a.tourId) ?? 0) - (rang.get(b.tourId) ?? 0) || a.page - b.page);
}

export default function PageEpinglee({ tours, notes, choisie, onChoisir }: Props) {
  const pages = pagesEpinglees(tours, notes);
  if (pages.length === 0) return null;

  const note = notes.find((n) => n.id === choisie) ?? null;
  const visee =
    (note && note.page !== null && note.x !== null ? pages.find((p) => p.tourId === note.tourId && p.page === note.page) : null) ??
    pages.find((p) => notes.some((n) => !n.resolue && n.tourId === p.tourId && n.page === p.page)) ??
    pages[0];
  const tour = tours.find((t) => t.id === visee.tourId);
  const image = tour?.pages.find((p) => p.index === visee.page)?.image ?? null;
  const epingles = notes.filter((n) => n.tourId === visee.tourId && n.page === visee.page && n.x !== null && n.y !== null);
  const plusieursTours = new Set(pages.map((p) => p.tourId)).size > 1;

  return (
    <section className="ate-carte eca-bat-epinglee">
      <h2 className="ate-carte-titre">
        Page {visee.page + 1}
        {plusieursTours ? ` · tour ${visee.tour}` : ""}
      </h2>
      {pages.length > 1 ? (
        <nav className="eca-filtres" aria-label="Pages annotées">
          {pages.map((p) => {
            const premiere = notes.find((n) => n.tourId === p.tourId && n.page === p.page && n.x !== null);
            const courante = p.tourId === visee.tourId && p.page === visee.page;
            return (
              <button
                key={`${p.tourId}:${p.page}`}
                type="button"
                className="eca-filtre"
                aria-current={courante ? "page" : undefined}
                onClick={() => premiere && onChoisir(premiere.id)}
              >
                p. {p.page + 1}
                {plusieursTours ? ` · t${p.tour}` : ""}
              </button>
            );
          })}
        </nav>
      ) : null}
      <div className="eca-bat-feuille">
        {image ? <img src={image} alt={`Page ${visee.page + 1}, tour ${visee.tour}`} decoding="async" /> : <span className="eca-vide">Image indisponible</span>}
        {epingles.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`eca-bat-epingle${n.resolue ? " eca-bat-epingle--resolue" : ""}${n.id === choisie ? " eca-bat-epingle--choisie" : ""}`}
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
            aria-label={`Note ${n.numero}${n.resolue ? ", résolue" : ""}`}
            onClick={() => {
              onChoisir(n.id);
              document.getElementById(`eca-note-${n.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
          >
            {n.numero}
          </button>
        ))}
      </div>
    </section>
  );
}
