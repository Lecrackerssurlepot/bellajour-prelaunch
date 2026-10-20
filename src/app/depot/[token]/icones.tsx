/* Les pictogrammes de la page de dépôt (planches 6 à 9 du 20/10) : un trait,
   la couleur du texte (`currentColor`), aucune image chargée. */

type P = { taille?: number };

function Svg({ taille = 18, children, plein = false }: P & { children: React.ReactNode; plein?: boolean }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={plein ? 2.4 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IcoAppareil = (p: P) => (
  <Svg {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Svg>
);
export const IcoPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IcoSansVideo = (p: P) => (
  <Svg {...p}>
    <path d="M3 3l18 18" />
    <path d="M15 10.5l5-3v9l-5-3" />
    <path d="M13 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1M9 7h4a2 2 0 0 1 2 2v4" />
  </Svg>
);
export const IcoHorloge = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);
export const IcoCadenas = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);
export const IcoLienCasse = (p: P) => (
  <Svg {...p}>
    <path d="M9 15.5l-1.6 1.6a3.3 3.3 0 0 1-4.6-4.6l3-3a3.3 3.3 0 0 1 4.6 0" />
    <path d="M15 8.5l1.6-1.6a3.3 3.3 0 0 1 4.6 4.6l-3 3a3.3 3.3 0 0 1-4.6 0" />
    <path d="M8.5 2.5v3M2.5 8.5h3M15.5 21.5v-3M21.5 15.5h-3" />
  </Svg>
);
export const IcoTelephone = (p: P) => (
  <Svg {...p}>
    <rect x="7" y="3" width="10" height="18" rx="2" />
    <path d="M11 18h2" />
  </Svg>
);
export const IcoCorbeille = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </Svg>
);
export const IcoCoche = (p: P) => (
  <Svg {...p} plein>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IcoAttention = (p: P) => (
  <Svg {...p} plein>
    <path d="M12 7v6M12 17h.01" />
  </Svg>
);
