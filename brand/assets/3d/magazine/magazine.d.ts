/* Les types de magazine.js, pour le TypeScript du site. Le code vit dans magazine.js. */

export type Finition = 'gloss' | 'matte'

export type AngleNomme = {
  libelle: string
  /** 'debout' ou 'a-plat'. */
  pose: string
  /** 0 = fermé, 1 = ouvert à plat. */
  ouverture: number
  /** Le magazine tourné sur lui-même, en degrés. */
  rotation: number
  camera: { elevation: number; distance: number; champ: number }
}

/** Le contenu d'angles.json. */
export type Angles = {
  ordre: string[]
  defaut: string
  angles: Record<string, AngleNomme>
}

/** Ce qui se règle après coup, sur le magazine comme sur le studio. */
export type Reglages = {
  pages?: number
  finition?: Finition
  /** La largeur du dos, en mm. Absente : calculée par dimensions.js. */
  dosMm?: number | null
  couleurDos?: string
  couleurQuatrieme?: string
  /** URL de l'image de 1re de couverture. */
  couverture?: string | null
  /** URL de l'image de 4e. */
  quatrieme?: string | null
  /** URL de l'image de la double page ouverte. */
  doublePage?: string | null
}

export type OptionsMagazine = Reglages & {
  largeurMm?: number
  hauteurMm?: number
  leger?: boolean
  anisotropie?: number
}

export type Magazine = {
  /** Un Group Three.js, à ajouter à une scène. */
  groupe: object
  regler(reglages?: Reglages): Promise<void>
  poserOuverture(ouverture: number): void
  liberer(): void
  mesures(): { L: number; H: number; dos: number; couv: number; bloc: number }
  readonly pages: number
  readonly finition: Finition
}

export type OptionsStudio = OptionsMagazine & {
  angles: Angles
  angle?: string
  /** null = fond transparent. */
  fond?: string | null
  interactif?: boolean
  rotationAuto?: boolean
  largeur?: number
  hauteur?: number
  densite?: number
}

export type Vue = {
  rotation?: number
  elevation?: number
  distance?: number
  champ?: number
  /** 0 = debout, 1 = couché. */
  couche?: number
  ouverture?: number
}

export type Studio = {
  canvas: HTMLCanvasElement
  /** Résolue quand les images sont chargées et la première image rendue. */
  pret: Promise<void>
  allerA(nom: string, options?: { anime?: boolean }): void
  poser(vue?: Vue): void
  regler(reglages?: Reglages & { fond?: string | null }): Promise<void>
  rendre(): void
  capturer(type?: string, qualite?: number): string
  redimensionner(largeur: number, hauteur: number): void
  liberer(): void
  readonly angle: string
}

export function creerMagazine(options?: OptionsMagazine): Magazine
export function creerStudio(conteneur: HTMLElement, options: OptionsStudio): Studio
export function webglDisponible(): boolean
