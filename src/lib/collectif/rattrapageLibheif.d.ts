/**
 * `libheif-js` n'a pas de types. Ce qu'on en utilise (`rattrapageVignettes.ts`,
 * la méthode de `scripts/collectif-heic-rattrapage.ts`), et rien d'autre : un
 * décodeur, des images, leurs pixels. Même version que `public/heic/` (1.19.8).
 */
declare module "libheif-js/wasm-bundle" {
  type ImageHeif = {
    get_width(): number;
    get_height(): number;
    display(cible: { data: Uint8ClampedArray; width: number; height: number }, rappel: (d: { data: Uint8ClampedArray } | null) => void): void;
    free(): void;
  };
  const libheif: { HeifDecoder: new () => { decode(octets: Uint8Array): ImageHeif[] } };
  export default libheif;
}
