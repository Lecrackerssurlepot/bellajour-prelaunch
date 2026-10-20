/**
 * Le journal de l'Édition collective, en français (patron de atelier/recit.ts).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * ⚠️ AUCUN TOKEN DANS LE JOURNAL. Régénérer un lien écrit QUEL lien a changé,
 * jamais sa valeur : le journal se lit à l'écran, et un token lu est un accès.
 */

import { EVT_ECHEC, phraseEchec } from "./echecs";
import { GESTES, type GesteCle } from "./gestes";
import { LIBELLE_CHAMP } from "./saisie";

const LIBELLE_LIEN: Record<string, string> = {
  responsable: "du responsable",
  equipe: "de l'équipe",
  depot: "de dépôt des participants",
};

function nom(v: unknown): string {
  return typeof v === "string" && v ? v : "l'atelier";
}

function champs(v: unknown): string {
  if (!Array.isArray(v) || v.length === 0) return "";
  return v
    .map((c) => (typeof c === "string" ? LIBELLE_CHAMP[c] ?? c : ""))
    .filter(Boolean)
    .join(", ");
}

/**
 * Les lignes écrites UNE FOIS PAR LOT de photos (25 au plus) : des centaines
 * par édition. La fiche de l'atelier ne les lit pas dans son journal (ses 100
 * dernières lignes), sinon elles chassaient tout le reste (T-167). Elles
 * restent écrites et lisibles en base. Depuis T-194 et T-171, aussi la
 * machinerie du rattrapage (un démarrage, une fin sans photo retrouvée) et les
 * vignettes fabriquées après un lot ; `photos_rattrapees` (au moins une photo
 * retrouvée) et `echec` restent lus.
 */
export const JOURNAL_DE_LOT = ["photos_confirmees", "metadonnees_lues", "rattrapage_demarre", "rattrapage_fini", "vignettes_fabriquees"] as const;

/** Une ligne de journal → une phrase. Un type inconnu reste lisible (son nom brut). */
export function phraseEvenement(type: string, payload: Record<string, unknown>): string {
  const par = nom(payload.par);
  switch (type) {
    case "edition_creee":
      return `Édition ouverte par ${par}.`;
    case "reglages_modifies": {
      const c = champs(payload.champs);
      return c ? `Réglages modifiés par ${par} : ${c}.` : `Réglages modifiés par ${par}.`;
    }
    case "magazines_modifies":
      return `Magazines modifiés par ${par}.`;
    case "magazine_retire": {
      /* T-190 : un magazine encore vide retiré en réglages ; les suivants ont pris son numéro. */
      const titre = typeof payload.nom === "string" && payload.nom ? `« ${payload.nom} »` : "Un magazine";
      const rang = typeof payload.rang === "number" ? ` (magazine ${payload.rang})` : "";
      return `${titre}${rang} retiré par ${par}.`;
    }
    case "geste": {
      const g = GESTES[payload.cle as GesteCle];
      return g ? `${g.libelle}, par ${par}.` : `Geste ${String(payload.cle)}, par ${par}.`;
    }
    case "lien_regenere": {
      const quel = LIBELLE_LIEN[String(payload.quel)] ?? "";
      /* T-196 : les liens de contribution portent le token des participants, ils tombent avec lui. */
      const n = typeof payload.liensCoupes === "number" ? payload.liensCoupes : 0;
      const coupes = n > 0 ? ` ; ${n} lien${n > 1 ? "s" : ""} de contribution ${n > 1 ? "ont" : "a"} changé avec lui` : "";
      return `Lien ${quel} régénéré par ${par} : l'ancien ne fonctionne plus${coupes}.`;
    }
    case "message_client":
      return `Message du client (${par}).`;
    case "message_atelier":
      return `Message de l'atelier, par ${par}.`;
    case "plafond_client":
      return `Photos par participant réglées à ${String(payload.valeur)} par ${par}.`;
    case "document_pose":
      return `Document déposé par ${par} : ${String(payload.libelle ?? "")}.`;
    case "photos_confirmees":
      return `${String(payload.n)} photo(s) arrivée(s) (${payload.role === "responsable" ? "le responsable" : "un participant"}).`;
    case "metadonnees_lues":
      return `Métadonnées lues : ${String(payload.traitees ?? 0)} photo(s), ${String(payload.lieux ?? 0)} lieu(x).`;
    case "photos_rattrapees":
      return `${String(payload.n ?? 0)} photo(s) retrouvée(s) au coffre sans confirmation (page fermée avant la fin de l'envoi), confirmée(s) par le serveur.`;
    case "rattrapage_demarre":
      return `Rattrapage des photos lancé (${String(payload.candidates ?? 0)} à regarder).`;
    case "rattrapage_fini":
      return payload.cede === true ? "Rattrapage des photos : un autre passage tournait déjà." : `Rattrapage des photos : aucune photo retrouvée (${String(payload.absentes ?? 0)} absente(s) du coffre).`;
    case "vignettes_fabriquees":
      return `Vignettes fabriquées par le serveur : ${String(payload.n ?? 0)} (${String(payload.ratees ?? 0)} ratée(s)).`;
    case EVT_ECHEC:
      return phraseEchec(payload);
    case "photo_preselectionnee":
      return "Une photo ajoutée à la présélection du client.";
    case "photo_deselectionnee":
      return "Une photo retirée de la présélection du client.";
    case "preselection_toutes":
      return `Tout sélectionné : ${String(payload.n ?? 0)} photo(s) ajoutée(s) à la présélection du client.`;
    case "preselection_aucune":
      return `Tout désélectionné : ${String(payload.n ?? 0)} photo(s) retirée(s) de la présélection du client.`;
    case "photo_signalee":
      return "Une photo signalée « à ne pas publier ».";
    case "photo_designalee":
      return "Un signalement de photo retiré.";
    case "provenance_creee":
      return `Lien de dépôt créé${payload.via === "atelier" ? ` par l'atelier${payload.par ? ` (${String(payload.par)})` : ""}` : ""} : ${String(payload.libelle ?? "")}${payload.sansPlafond ? " (sans plafond)" : ""}.`;
    case "brief_style_choisi":
      return `Magazine ${String(payload.magazine)} : style ${String(payload.style ?? "")} choisi par le client.`;
    case "brief_valide":
      return `Magazine ${String(payload.magazine)} : brief validé par le client.`;
    case "brief_rouvert":
      return `Magazine ${String(payload.magazine)} : brief rouvert par le client.`;
    case "brief_modifie": {
      const partie = { palette: "la palette", texte: "la place du texte", doubles: "les doubles pages" }[String(payload.partie)] ?? "une partie";
      return `Magazine ${String(payload.magazine)} : ${partie} du brief modifiée par le client.`;
    }
    case "brief_repris":
      return `Magazine ${String(payload.magazine)} : composition reprise du magazine ${String(payload.depuis)}.`;
    case "brief_piece":
      return `Magazine ${String(payload.magazine)} : ${payload.retiree ? "une double page retirée" : `${String(payload.piece ?? "une pièce")} prise`}${payload.style ? ` du style ${String(payload.style)}` : ""} par le client.`;
    case "couverture_aimee":
      return `Magazine ${String(payload.magazine)} : une couverture aimée.`;
    case "couverture_retiree":
      return `Magazine ${String(payload.magazine)} : une couverture n'est plus aimée.`;
    case "tour_cree":
      return `Magazine ${String(payload.magazine)} : tour ${String(payload.tour)} ouvert par ${par}.`;
    case "tour_pages":
      return `Magazine ${String(payload.magazine)} : tour ${String(payload.tour)} rendu (${String(payload.pages)} pages) par ${par}.`;
    case "tour_echeance":
      return `Magazine ${String(payload.magazine)} : échéance du tour ${String(payload.tour)} réglée par ${par}.`;
    case "tour_couverture":
      return `Magazine ${String(payload.magazine)} : proposition de couverture ${String(payload.rang)} déposée par ${par}.`;
    case "tour_couverture_retiree":
      return `Magazine ${String(payload.magazine)} : proposition de couverture ${String(payload.rang)} retirée par ${par}.`;
    case "tour_publie":
      return `Magazine ${String(payload.magazine)} : tour ${String(payload.tour)} publié par ${par}.`;
    case "notes_envoyees":
      return `Magazine ${String(payload.magazine)} : ${String(payload.n)} note(s) envoyée(s) par le client.`;
    case "note_resolue":
      return `Magazine ${String(payload.magazine)} : une note marquée résolue par le client.`;
    case "note_rouverte":
      return `Magazine ${String(payload.magazine)} : une note rouverte par le client.`;
    case "note_repondue":
      return `Magazine ${String(payload.magazine)} : réponse de l'atelier à une note, par ${par}.`;
    case "couverture_choisie":
      return payload.sansPreference
        ? `Magazine ${String(payload.magazine)} : couverture « sans préférence ».`
        : `Magazine ${String(payload.magazine)} : proposition de couverture ${String(payload.rang)} choisie.`;
    case "couverture_note":
      return `Magazine ${String(payload.magazine)} : note sur la couverture.`;
    case "bat_valide":
      return `Magazine ${String(payload.magazine)} : bon à tirer VALIDÉ par le client.`;
    case "contenu_recu":
      return `Contenu reçu du client : ${String(payload.type ?? "")}${payload.nom ? ` (${String(payload.nom)})` : ""}.`;
    case "contenu_remplace":
      return `Contenu remplacé par le client : ${String(payload.type ?? "")}${payload.nom ? ` (${String(payload.nom)})` : ""}, l'ancienne version reste à l'atelier.`;
    case "dossier_range":
      return `Dossier de photos rangé : « ${String(payload.avant ?? "")} » devient « ${String(payload.apres ?? "")} ».`;
    case "provenance_supprimee":
      return `Lien de contribution supprimé : « ${String(payload.libelle ?? "")} » ; ses photos restent.`;
    case "provenance_plafond":
      return `Lien « ${String(payload.libelle ?? "")} » : ${payload.sansPlafond ? "sans limite" : `${String(payload.plafond ?? "?")} photos par personne`}.`;
    case "dossier_renomme":
      return `Dossier de photos renommé : « ${String(payload.avant ?? "")} » devient « ${String(payload.apres ?? "")} ».`;
    case "modification_demandee":
      return `Demande de modification du client : ${String(payload.motif ?? "")}.`;
    case "proposition_acceptee":
      return `Proposition complémentaire acceptée par le client : ${String(payload.libelle ?? "")}.`;
    case "proposition_a_reparler":
      return `Le client veut reparler de la proposition : ${String(payload.libelle ?? "")}.`;
    case "rdv_pris":
      return `Rendez-vous pris avec ${String(payload.avec ?? "l'atelier")} : ${String(payload.quand ?? "")} (${par}).`;
    case "rdv_deplace":
      return `Rendez-vous avec ${String(payload.avec ?? "l'atelier")} déplacé : ${String(payload.avant ?? "")} → ${String(payload.quand ?? "")} (${par}).`;
    case "rdv_annule":
      return `Rendez-vous avec ${String(payload.avec ?? "l'atelier")} du ${String(payload.quand ?? "")} annulé (${par}).`;
    case "interlocuteur_choisi":
      return `Interlocuteur de l'atelier : ${String(payload.prenom ?? "aucun")}, choisi par ${par}.`;
    case "livraison_reglee":
      return `Adresse ou jour de livraison réglés par ${par}.`;
    case "style_cree":
      return `Style créé par ${par}.`;
    case "style_modifie": {
      const c = Array.isArray(payload.champs) ? payload.champs.join(", ") : "";
      return c ? `Style modifié par ${par} (${c}).` : `Style modifié par ${par}.`;
    }
    case "style_publie":
      return `Style publié sur le mur par ${par}.`;
    case "style_depublie":
      return `Style retiré du mur par ${par}.`;
    case "style_image":
      return `Image ajoutée par ${par}.`;
    case "style_tailles": {
      /* T-172 : le rattrapage des images d'avant (scripts/collectif-styles-vignettes.ts). */
      const n = typeof payload.images === "number" ? payload.images : 0;
      return `Tailles réduites posées sur ${n} image${n > 1 ? "s" : ""} (${par}).`;
    }
    /* ── les planches du 20/10 : personnes et corbeille (migration 20261023) ── */
    case "participant_presente":
      return `Un participant s'est présenté par son adresse : ${String(payload.prenom ?? "?")}${payload.a ? ` (${String(payload.a)})` : ""}.`;
    case "telephone_oublie":
      return "« Ce n'est pas toi ? » : un téléphone ne parle plus pour sa personne (ses photos lui restent).";
    /* ── l'audit du 20/10 (S5, S7, S9) ── */
    case "participant_retrouve":
      return `Adresse retrouvée : ${String(payload.prenom ?? "?")}${payload.a ? ` (${String(payload.a)})` : ""} s'est présenté de nouveau.`;
    case "participant_nom_different":
      return `Une adresse connue${payload.a ? ` (${String(payload.a)})` : ""} a été présentée sous un autre nom : « ${String(payload.propose ?? "?")} » au lieu de « ${String(payload.nom ?? "?")} ». Le nom n'a pas changé ; le responsable peut le corriger.`;
    case "fusion_interrompue":
      return "Fusion interrompue au milieu : la défaire remet chaque photo à sa personne.";
    case "objets_a_effacer":
      return `Effacement du coffre préparé (${String(payload.n ?? 0)} photo(s)).`;
    case "objets_effaces":
      return payload.reprise === true ? "Effacement du coffre repris : des objets restés sont partis." : "Effacement du coffre fait.";
    /* ── T-159 : la fin de conservation, 30 jours après « Marquer livrée » ── */
    case "retention_a_effacer":
      return `Fin de conservation préparée : ${String(payload.n ?? 0)} objet(s) du coffre à effacer (${payload.par === "auto" ? "passage quotidien" : "script"}).`;
    case "retention_effacee":
      return payload.gardees === true
        ? "Fin de conservation : objets gardés (la base n'avait pas fini, l'édition sera reprise)."
        : payload.reprise === true
          ? "Fin de conservation reprise : des objets restés au coffre sont partis."
          : "Fin de conservation : objets du coffre effacés.";
    case "coffre_efface": {
      const restes = typeof payload.objets_restes === "number" && payload.objets_restes > 0 ? `, ${payload.objets_restes} encore au coffre (repris au passage suivant)` : "";
      const personnes = typeof payload.personnes_effacees === "number" ? ` ; ${payload.personnes_effacees} personne(s) et leur adresse supprimées` : "";
      return `Photos supprimées, ${String(payload.delai_jours ?? "?")} jours après la livraison : ${String(payload.objets_effaces ?? 0)} objet(s) effacé(s)${restes}${personnes} ; le PDF des tours et les documents restent (${payload.par === "auto" ? "passage quotidien" : "script"}).`;
    }
    case "personne_renommee":
      return `Personne renommée : « ${String(payload.avant ?? "?")} » devient « ${String(payload.apres ?? "?")} » (${String(payload.n ?? 0)} photo(s)).`;
    case "personnes_fusionnees":
      return `Personnes fusionnées : « ${String(payload.nomPart ?? "?")} » rejoint « ${String(payload.nomAvant ?? "?")} », sous le nom « ${String(payload.nomApres ?? "?")} » (${String(payload.n ?? 0)} photo(s)).`;
    case "fusion_defaite":
      return `Fusion défaite : ${String(payload.n ?? 0)} photo(s) rendue(s) à leur personne.`;
    case "photos_supprimees": {
      const qui = payload.par === "auteur" ? "par leur auteur" : payload.par === "atelier" ? "par l'atelier" : "par le responsable";
      return `${String(payload.n ?? 0)} photo(s) mise(s) à la corbeille ${qui}.`;
    }
    case "photos_restaurees":
      return `${String(payload.n ?? 0)} photo(s) restaurée(s) de la corbeille.`;
    case "photos_effacees":
      return payload.par === "purge"
        ? `${String(payload.n ?? 0)} photo(s) effacée(s) pour de bon (30 jours à la corbeille).`
        : `${String(payload.n ?? 0)} photo(s) effacée(s) pour de bon par l'atelier.`;
    case "photos_marquees":
      return payload.preselection === true
        ? `${String(payload.n ?? 0)} photo(s) cochée(s) ajoutée(s) à la présélection du client.`
        : payload.preselection === false
          ? `${String(payload.n ?? 0)} photo(s) cochée(s) retirée(s) de la présélection du client.`
          : payload.signalee === true
            ? `${String(payload.n ?? 0)} photo(s) cochée(s) signalée(s) « à ne pas publier ».`
            : `${String(payload.n ?? 0)} signalement(s) de photo retiré(s).`;
    case "mail_envoye":
      return `Mail ${libelleMail(payload.code)} envoyé à ${String(payload.a ?? "?")}.`;
    case "mail_echec":
      return `Mail ${libelleMail(payload.code)} NON parti (${String(payload.statut ?? "?")}) à ${String(payload.a ?? "?")}.`;
    default:
      return type;
  }
}

/** Le nom d'un mail des éditions dans le journal, d'après son code (`mails.ts`). */
function libelleMail(code: unknown): string {
  const c = String(code ?? "");
  if (c.startsWith("ESPACE")) return "« Votre espace est prêt »";
  return `« ${c} »`;
}
