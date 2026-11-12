import { classesPolices } from "./polices";

/**
 * Le layout PROPRE à l'éditeur (lot C) : il pose, sur tout ce que rend `/admin/atelier/mise-en-page/[id]`, les variables CSS des
 * polices du catalogue de styles (`polices.ts`, next/font/google, `preload: false`). La liste des gabarits et les autres écrans
 * de l'atelier ne les chargent pas. `display: contents` : le conteneur n'existe pas pour la mise en page.
 */
export default function LayoutEditeur({ children }: { children: React.ReactNode }) {
  return <div className={classesPolices} style={{ display: "contents" }}>{children}</div>;
}
