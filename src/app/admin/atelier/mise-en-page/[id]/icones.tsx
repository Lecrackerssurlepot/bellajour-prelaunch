/* Les pictogrammes de l'éditeur : un trait, `currentColor`, rien d'autre. */

const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, "aria-hidden": true } as const;

export const Ico = {
  loupe: <svg width="14" height="14" viewBox="0 0 16 16" {...base}><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" /></svg>,
  annuler: <svg width="16" height="16" viewBox="0 0 16 16" {...base}><path d="M5 3 2 6l3 3" /><path d="M2 6h7a4 4 0 0 1 0 8H6" /></svg>,
  retablir: <svg width="16" height="16" viewBox="0 0 16 16" {...base}><path d="m11 3 3 3-3 3" /><path d="M14 6H7a4 4 0 0 0 0 8h3" /></svg>,
  oeil: <svg width="15" height="15" viewBox="0 0 16 16" {...base}><path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8Z" /><circle cx="8" cy="8" r="2" /></svg>,
  oeilBarre: <svg width="15" height="15" viewBox="0 0 16 16" {...base}><path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8Z" /><circle cx="8" cy="8" r="2" /><path d="M2.5 13.5l11-11" /></svg>,
  panneau: <svg width="16" height="16" viewBox="0 0 16 16" {...base}><rect x="1.5" y="2.5" width="13" height="11" rx="2" /><path d="M6 2.5v11" /></svg>,
  fermer: <svg width="14" height="14" viewBox="0 0 16 16" {...base} strokeWidth={1.7}><path d="m4 4 8 8M12 4l-8 8" /></svg>,
  retour: <svg width="16" height="16" viewBox="0 0 16 16" {...base} strokeWidth={1.7}><path d="M10 3 5 8l5 5" /></svg>,
  bas: <svg width="10" height="10" viewBox="0 0 10 10" {...base}><path d="m2 4 3 3 3-3" /></svg>,
};
