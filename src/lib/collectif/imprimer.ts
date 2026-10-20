/**
 * Imprimer UNE page HTML, sans imprimer l'écran qui la demande (T-197).
 *
 * Le navigateur imprime le document ouvert : depuis l'espace du responsable ou la
 * fiche de l'atelier, ce serait tout le logiciel, menu compris. On pose donc la
 * page dans un cadre caché, de la taille de rien, et c'est ce cadre qu'on
 * imprime. Aucune fenêtre qu'un bloqueur de pop-up refuserait. Côté NAVIGATEUR
 * seulement (utilisé depuis un clic) ; ne fait rien sur le serveur.
 */
export function imprimerPage(html: string): void {
  if (typeof document === "undefined") return;
  const cadre = document.createElement("iframe");
  cadre.setAttribute("aria-hidden", "true");
  cadre.tabIndex = -1;
  cadre.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  const retirer = () => cadre.remove();
  /* Le focus part dans le cadre pour imprimer : on le rend à ce qui l'avait (le bouton « Imprimer »), sans
     quoi Échap, au clavier, irait dans un cadre caché et la fenêtre qui a appelé ne se fermerait plus. */
  const avant = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  cadre.onload = () => {
    const fenetre = cadre.contentWindow;
    if (!fenetre) return retirer();
    fenetre.addEventListener("afterprint", retirer);
    fenetre.focus();
    fenetre.print();
    /* Le cadre lâche le focus (un bouton qu'on vient de cliquer n'est pas toujours focalisable, Safari) ; Échap revient à la page. */
    cadre.blur();
    window.focus();
    avant?.focus();
    /* Si « afterprint » ne vient jamais (certains navigateurs mobiles), le cadre ne reste pas. */
    setTimeout(retirer, 120_000);
  };
  cadre.srcdoc = html;
  document.body.appendChild(cadre);
}
