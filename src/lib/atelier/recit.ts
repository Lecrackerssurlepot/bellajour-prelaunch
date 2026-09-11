/**
 * Le journal, en français.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI TRADUIRE PLUTÔT QU'AFFICHER
 *
 * `evenements` est fait pour le débogage : un `type` et un `payload` bruts.
 * C'est parfait quand on cherche pourquoi un dossier est coincé, et illisible
 * quand on veut simplement savoir ce qui s'est passé. « etat_change
 * {"de":"payee","vers":"maquette_prete","par":"Mathias"} » ne se lit pas, il
 * se déchiffre.
 *
 * Ce module rend une PHRASE. Le payload brut reste accessible d'un clic sur
 * la fiche : on ajoute une lecture, on n'en retire aucune.
 *
 * Module PUR — aucune base, aucun réseau, aucune date « maintenant ».
 * ══════════════════════════════════════════════════════════════════════════
 */

import { LIBELLE_ETAT, type Etat } from "./transitions";
import { OBJET_MAIL } from "./mails";
import { PAYS_LIBELLE } from "./pays";

/** Qui a agi : ça décide de la couleur et du verbe. */
export type Ton = "nous" | "elle" | "mail" | "alerte" | "neutre";

export type Recit = {
  texte: string;
  /** Précision facultative, affichée en gris à la suite. */
  detail: string | null;
  ton: Ton;
};

/* Ce que chaque mail dit vraiment. « M3 est parti » n'apprend rien à qui n'a
   pas le PRD sous les yeux.

   ⚠️ La table vit dans mails.ts, pas ici : elle y sert aussi à la page santé,
   et deux copies des mêmes dix libellés auraient divergé au premier mail
   dont on change le propos. */
function texteMail(code: string): string {
  const objet = OBJET_MAIL[code as keyof typeof OBJET_MAIL];
  return objet ? `${code} — « ${objet} »` : code;
}

/* Un sous-objet du payload, ou un objet vide : le journal est du jsonb libre
   et une ligne écrite par une version antérieure ne doit jamais faire
   disparaître une phrase du récit. */
function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function auteur(payload: Record<string, unknown>): string | null {
  const par = payload.par;
  return typeof par === "string" && par.trim() ? par.trim() : null;
}

/* « Mathias a publié l'aperçu » si on sait qui, « L'aperçu a été publié »
   sinon. Les dossiers d'avant les comptes nominatifs n'ont pas de prénom :
   la phrase doit rester correcte sans lui. */
function fait(qui: string | null, verbeAvecSujet: string, verbePassif: string): string {
  return qui ? `${qui} ${verbeAvecSujet}` : verbePassif;
}

/**
 * La phrase d'un événement.
 *
 * Ne throw jamais et n'échoue jamais : un type inconnu (un événement écrit
 * par un lot futur) ressort tel quel plutôt que de faire disparaître une
 * ligne du journal. Un récit incomplet vaut mieux qu'un récit muet.
 */
export function raconter(type: string, payload: Record<string, unknown> = {}): Recit {
  const qui = auteur(payload);
  const vers = typeof payload.vers === "string" ? (payload.vers as Etat) : null;
  const nbPages = typeof payload.nbPages === "number" ? payload.nbPages : null;
  const euros = typeof payload.euros === "number" ? payload.euros : null;
  /* Le PORT, tel que le journal le porte depuis le lot 6 (10/09/2026). Absent
     des lignes plus anciennes : le récit se contente alors de dire la
     pagination et le prix, exactement comme avant. */
  const port = typeof payload.livraison_centimes === "number" ? payload.livraison_centimes : null;
  const portSource = typeof payload.livraison_source === "string" ? payload.livraison_source : "";
  const portNiveau = typeof payload.livraison_niveau === "string" ? payload.livraison_niveau : "";
  const paysPort = typeof payload.pays === "string" ? payload.pays : "";
  const portEncaisse =
    typeof payload.livraison_encaissee === "number" ? payload.livraison_encaissee : null;

  /* « 11,06 € ». Le même format que `formaterCentimes` (prix.ts), recopié
     pour garder ce module PUR et sans dépendance serveur — comme le fait déjà
     `tokenForme.ts` avec `token.ts`. */
  const eur = (centimes: number) => {
    const cts = Math.abs(Math.round(centimes)) % 100;
    const e = Math.floor(Math.abs(Math.round(centimes)) / 100);
    return cts === 0 ? `${e} €` : `${e},${String(cts).padStart(2, "0")} €`;
  };

  switch (type) {
    case "numero_cree":
      return {
        texte: "Dossier ouvert",
        detail: typeof payload.occasion === "string" ? (payload.occasion as string) : null,
        ton: "elle",
      };

    case "consentements": {
      /* Le seul signal serveur de fin de dépôt (cf. mails.ts) : c'est le
         moment où elle a vraiment envoyé ses photos. */
      if (payload.consent_photos === true) {
        return { texte: "Le client a terminé son dépôt", detail: null, ton: "elle" };
      }
      if ("cgv_ok" in payload || "renonciation_retractation" in payload) {
        const coche = payload.cgv_ok === true || payload.renonciation_retractation === true;
        return {
          texte: coche ? "Le client a coché les cases avant paiement" : "Le client a décoché une case",
          detail: null,
          ton: "elle",
        };
      }
      return { texte: "Consentements mis à jour", detail: null, ton: "elle" };
    }

    case "etat_change": {
      const source = typeof payload.source === "string" ? payload.source : "";
      if (vers === "apercu_pret") {
        /* Ce qu'on a annoncé au client, en entier : la pagination, le prix du
           magazine, et le PORT avec sa provenance. Six mois plus tard,
           « pourquoi ce dossier a-t-il payé 11,06 € de livraison ? » se lit
           dans le journal du dossier, pas dans un log effacé au bout d'une
           heure. Le port ne s'affiche que s'il existe : les publications
           d'avant le lot 6 gardent le récit qu'elles avaient. */
        const chiffres = nbPages ? `${nbPages} pages${euros ? `, ${euros} €` : ""}` : null;
        const provenance = [
          paysPort ? paysPort : "",
          portSource === "cloudprinter"
            ? `devis Cloudprinter${portNiveau ? ` ${portNiveau}` : ""}`
            : portSource === "admin"
              ? "saisi à la main"
              : "",
        ]
          .filter(Boolean)
          .join(", ");
        const mentionPort =
          port === null
            ? ""
            : `livraison ${eur(port)}${provenance ? ` (${provenance})` : ""}`;
        return {
          texte: fait(qui, "a publié l'aperçu", "Aperçu publié"),
          detail: [chiffres, mentionPort].filter(Boolean).join(", ") || null,
          ton: "nous",
        };
      }
      if (vers === "photos_insuffisantes") {
        return {
          texte: fait(qui, "a demandé plus de photos", "Photos jugées insuffisantes"),
          detail: null,
          ton: "nous",
        };
      }
      if (vers === "photos_recues" && source === "depot_repris") {
        return { texte: "Le client a redéposé ses photos", detail: null, ton: "elle" };
      }
      if (vers === "payee") {
        /* Le paiement DIT ce qui a été encaissé au titre de la livraison,
           séparément : sans ça, un total qui ne tombe pas juste avec le prix
           du magazine n'a aucune explication lisible. `0` est une information
           (port offert au fondateur), `null` veut dire « pas de ligne de
           livraison » — dossier payé avant le lot 6 — et se tait. */
        const mention =
          portEncaisse === null
            ? ""
            : portEncaisse === 0
              ? "livraison offerte"
              : `livraison ${eur(portEncaisse)}`;
        return {
          texte: "Paiement reçu",
          detail: [euros ? `${euros} €` : "", mention].filter(Boolean).join(", ") || null,
          ton: "elle",
        };
      }
      if (vers === "maquette_prete") {
        /* Une republication après retouches n'est pas une première annonce :
           la nuance dit à celui qui relit pourquoi il y a deux publications. */
        if (source === "republication_retouches") {
          return {
            texte: fait(qui, "a republié la maquette", "Maquette republiée"),
            detail: "Après ses retouches. L'échéance J+7 repart de maintenant",
            ton: "nous",
          };
        }
        return { texte: fait(qui, "a publié la maquette", "Maquette publiée"), detail: null, ton: "nous" };
      }
      if (vers === "validee") {
        /* Le PRD prévoit une validation automatique à J+7 : la distinction
           compte, c'est la différence entre un accord et un silence. */
        return {
          texte: qui === "auto" ? "Validée automatiquement (sans réponse)" : "Le client a validé la maquette",
          detail: null,
          ton: qui === "auto" ? "neutre" : "elle",
        };
      }
      if (vers === "en_production") {
        return { texte: fait(qui, "a lancé l'impression", "Parti à l'impression"), detail: null, ton: "nous" };
      }
      if (vers === "expediee") {
        return {
          texte: fait(qui, "a marqué le numéro expédié", "Expédié"),
          detail: typeof payload.transporteur === "string" ? (payload.transporteur as string) : null,
          ton: "nous",
        };
      }
      if (vers === "livree") {
        /* Le webhook signe `par: "cloudprinter"` : « cloudprinter a marqué
           le numéro livré » se lirait comme un geste humain — on nomme le
           fait, pas la machine. */
        if (qui === "cloudprinter") {
          return { texte: "Le colis est arrivé (signal Cloudprinter)", detail: null, ton: "neutre" };
        }
        return { texte: fait(qui, "a marqué le numéro livré", "Livré"), detail: null, ton: "nous" };
      }
      return {
        texte: vers ? `Passé à « ${LIBELLE_ETAT[vers] ?? vers} »` : "Changement d'état",
        detail: qui,
        ton: "neutre",
      };
    }

    case "apercu_corrige":
      return {
        texte: fait(qui, "a corrigé l'aperçu", "Aperçu corrigé"),
        detail: nbPages ? `${nbPages} pages${euros ? `, ${euros} €` : ""}` : null,
        ton: "nous",
      };

    /* ── LA PRÉVISUALISATION D'UN APERÇU (10/09/2026) ──────────────────
       Le dry-run de l'admin dépose un brouillon dans le journal : c'est lui
       qui alimente /numero/<token>?brouillon=1. La ligne reste SOBRE — c'est
       un geste de contrôle, pas une décision — mais elle existe, parce que
       « qui a regardé cette page, avec quels chiffres, avant l'envoi ? » est
       une question qu'on se pose le jour où le prix annoncé surprend.
       Les nombres vivent sous `resume` et `livraison` (la forme exacte que la
       route rend à l'écran de confirmation), pas à la racine du payload. */
    case "apercu_brouillon": {
      const resume: Record<string, unknown> = estObjet(payload.resume) ? payload.resume : {};
      const bloc: Record<string, unknown> = estObjet(payload.livraison) ? payload.livraison : {};
      const pages = typeof resume.nbPages === "number" ? resume.nbPages : null;
      const prix = typeof resume.euros === "number" ? resume.euros : null;
      /* Le port retenu par le dry-run : le devis, ou le montant saisi. */
      const portVu = typeof bloc.client === "number" ? bloc.client : null;
      return {
        texte: fait(qui, "a prévisualisé la page", "Page prévisualisée"),
        detail:
          [
            pages ? `${pages} pages` : "",
            prix ? `${prix} €` : "",
            portVu === null ? "" : `livraison ${eur(portVu)}`,
          ]
            .filter(Boolean)
            .join(", ") || null,
        ton: "neutre",
      };
    }

    case "mail_envoye":
      return {
        texte: `Mail parti : ${texteMail(String(payload.code ?? ""))}`,
        detail: null,
        ton: "mail",
      };

    /* La relance MANUELLE (11/09/2026). Le mail lui-même écrit déjà sa ligne
       `mail_envoye` : celle-ci dit ce que la première ne peut pas dire, à
       savoir que personne n'a attendu le balayage du lendemain, et QUI l'a
       décidé. Deux lignes, deux choses. */
    case "relance_manuelle": {
      const rang = typeof payload.rang === "number" ? payload.rang : null;
      const motif =
        payload.motif === "apercu"
          ? "son aperçu"
          : payload.motif === "photos"
            ? "son accord"
            : payload.motif === "depot"
              ? "ses photos"
              : null;
      return {
        texte: fait(qui, `a relancé sur ${motif ?? "son dossier"}`, "Relance envoyée à la main"),
        detail: rang ? `${rang}${rang === 1 ? "re" : "e"} relance` : null,
        ton: "nous",
      };
    }

    case "mail_echec":
      return {
        texte: `Mail NON parti : ${texteMail(String(payload.code ?? ""))}`,
        detail: "La relève réessaiera",
        ton: "alerte",
      };

    /* T-007 — la variable BREVO_TEMPLATE_<CODE>_ID manque : le mail saute à
       CHAQUE relève, sans erreur, et rien ne le rattrapera tant que la
       variable n'est pas posée sur Vercel. Écrit UNE fois par dossier+code
       (mails.ts, signalerSansTemplate). Le détail nomme la variable : c'est
       la réparation, pas un indice. */
    case "mail_sans_template":
      return {
        texte: `Mail sauté, template absent : ${texteMail(String(payload.code ?? ""))}`,
        detail:
          typeof payload.variable === "string"
            ? `${payload.variable} manque sur Vercel — la relève ressautera tant qu'elle manque`
            : "La variable du template manque sur Vercel",
        ton: "alerte",
      };

    /* T2-13 — le troisième geste de l'état 4. Il fait basculer le dossier
       dans la pile « à faire » et suspend l'auto-validation à J+7. */
    case "retouches_demandees":
      return {
        texte: "Le client a noté des retouches dans le Canva",
        detail: "L'auto-validation à J+7 est suspendue jusqu'à la republication",
        ton: "elle",
      };

    /* T-091 — la feuille d'ajustement de l'état 2 : un mot laissé AVANT le
       paiement, plutôt que de partir. Motifs cochés et/ou mot libre. */
    case "ajustement_demande": {
      const motifs = Array.isArray(payload.motifs)
        ? (payload.motifs as unknown[]).filter((m): m is string => typeof m === "string").join(" · ")
        : "";
      const mot = typeof payload.mot === "string" ? (payload.mot as string) : "";
      return {
        texte: "Le client a demandé un ajustement avant de payer",
        detail: [motifs, mot].filter(Boolean).join(" — ") || null,
        ton: "elle",
      };
    }

    /* T-093 — la cliente a préféré une autre couverture que celle proposée
       par défaut. Le rang, pas l'URL : l'atelier a la liste dans le même
       ordre sous les yeux. Le rang 0 n'est jamais journalisé par l'écran
       (choisir le défaut, c'est ne rien choisir), mais on sait le dire si
       un rejeu le fait remonter. */
    case "couverture_choisie": {
      /* 11/09/2026 — « je vous fais confiance » est une RÉPONSE, et elle se
         lit en premier : elle dit à l'atelier qu'il peut composer sans
         attendre, là où un rang absent ne disait rien du tout. */
      if (payload.indifferent === true) {
        return {
          texte: "Le client nous laisse choisir la couverture",
          detail: "Sans préférence : l'atelier décide",
          ton: "elle",
        };
      }
      const rang = typeof payload.rang === "number" ? (payload.rang as number) : null;
      return {
        texte:
          rang === null || rang === 0
            ? "Le client garde la couverture proposée"
            : `Le client préfère la couverture ${rang + 1}`,
        detail: null,
        ton: "elle",
      };
    }

    /* Le verrou d'un mail a été retiré pour qu'il reparte — aujourd'hui M5,
       à la republication d'une maquette corrigée. Sans cette ligne, deux
       « Mail parti : M5 » se suivraient sans explication. */
    case "mail_reouvert":
      return {
        texte: `Mail réarmé : ${texteMail(String(payload.code ?? ""))}`,
        detail: "Il repartira avec la nouvelle échéance",
        ton: "neutre",
      };

    /* Une relance retiree A LA MAIN. Le verrou dans `mails_envoyes` suffit a
       ce que le mail ne parte pas, mais il ne dit RIEN : le journal est le
       seul endroit ou l'on saura, dans six mois, pourquoi cette cliente n'a
       jamais ete relancee. */
    case "relance_annulee":
      return {
        texte: `Relance ${String(payload.code ?? "")} retirée à la main${qui ? ` par ${qui}` : ""}`,
        detail: typeof payload.raison === "string" ? (payload.raison as string) : null,
        ton: "neutre",
      };

    /* Le passage de relais. Il fait partie de l'histoire du dossier au même
       titre qu'un changement d'état : « personne n'a rien fait pendant six
       jours » et « il est passé de l'un à l'autre trois fois » ne racontent
       pas la même semaine. */
    case "prise_en_charge": {
      const par = typeof payload.par === "string" ? payload.par : "Quelqu'un";
      if (payload.relache) {
        return { texte: `${par} a relâché le dossier`, detail: "Il n'est plus à personne", ton: "nous" };
      }
      const repris = typeof payload.repris_a === "string" ? payload.repris_a : null;
      return {
        texte: repris ? `${par} a repris le dossier à ${repris}` : `${par} a pris le dossier en main`,
        detail: null,
        ton: "nous",
      };
    }

    /* ── LE TÉLÉPHONE POSÉ OU CORRIGÉ À LA MAIN (11/09/2026) ──
       Les dossiers ouverts avant le 28/08 n'ont pas de téléphone, et
       Cloudprinter en exige un : sans lui, c'est le numéro de la maison qui
       part chez le transporteur. Le numéro est écrit EN TOUTES LETTRES dans
       le récit — c'est l'admin qui lit cette ligne, et la question qu'elle
       doit trancher est « quel numéro a échoué, l'ancien ou le nouveau ». */
    case "telephone_modifie": {
      const apres = typeof payload.apres === "string" ? payload.apres : null;
      const avant = typeof payload.avant === "string" && payload.avant.trim()
        ? (payload.avant as string).trim()
        : null;
      return {
        texte: avant
          ? fait(qui, "a modifié le téléphone", "Le téléphone a été modifié")
          : fait(qui, "a ajouté le téléphone", "Le téléphone a été ajouté"),
        detail: avant ? `${avant} → ${apres ?? "—"}` : apres,
        ton: "nous",
      };
    }

    case "canva_travail":
      return {
        texte: payload.pose
          ? `${qui ?? "L'atelier"} a ouvert un document de travail`
          : `${qui ?? "L'atelier"} a retiré le document de travail`,
        detail: "Interne, jamais partagé avec le client",
        ton: "nous",
      };

    /* Retiré du récit à l'affichage (cf. donnees.ts), mais un vieux dossier
       peut encore en porter : autant qu'il se lise. */
    case "photos_confirmees":
      return {
        texte: `${payload.combien ?? ""} photo(s) reçues`.trim(),
        detail: null,
        ton: "elle",
      };

    case "checkout_expire":
      return { texte: "Panier abandonné (session expirée)", detail: "Le numéro reste commandable", ton: "neutre" };

    case "remboursement":
      return {
        texte: "Remboursement",
        detail: euros ? `${euros} €` : null,
        ton: "alerte",
      };

    /* ── LE DOSSIER EST RATTACHÉ À UN FONDATEUR, À LA MAIN (10/09/2026) ──
       Un fondateur qui compose sous une autre adresse que celle de sa
       prévente n'est reconnu par aucune détection automatique. Un admin le
       désigne alors, et cette ligne est la SEULE trace du geste : elle doit
       nommer l'auteur et le numéro, parce que c'est elle qui explique, six
       mois plus tard, une remise que l'email ne justifie pas. */
    case "fondateur_rattache": {
      const nf = payload.numero_fondateur;
      const place = typeof nf === "number" ? `au fondateur nº${nf}` : "à un fondateur";
      return {
        texte: fait(
          auteur(payload),
          `a rattaché le dossier ${place}`,
          `Dossier rattaché ${place}`,
        ),
        detail:
          "Le crédit de 30 € et les avantages fondateur s'appliqueront tout seuls, "
          + "sans que le client tape quoi que ce soit",
        ton: "nous",
      };
    }

    /* T-021 — le crédit contractuel des fondatrices (CGV art. 5 bis). Le
       code lui-même est dans le payload replié : la phrase dit le geste,
       pas le secret. */
    case "code_fondatrice_cree": {
      const nf = payload.numero_fondateur;
      return {
        texte: fait(
          auteur(payload),
          "a créé le code fondateur de 30 €",
          "Code fondateur de 30 € créé",
        ),
        detail:
          (typeof nf === "number" ? `Fondateur nº${nf}, à usage unique` : "À usage unique")
          + (payload.origine === "rattachement" ? " (dossier rattaché à la main)" : ""),
        ton: "nous",
      };
    }

    /* T-021 — la remise posée D'OFFICE sur la session de paiement (01/09).
       C'est la ligne qui répond à « pourquoi a-t-elle payé 10 € ». Le code
       reste dans le payload replié : la phrase dit le geste, pas le secret. */
    case "credit_fondatrice_applique": {
      const nf = payload.numero_fondateur;
      return {
        texte: "Crédit fondateur de 30 € appliqué automatiquement",
        detail:
          (typeof nf === "number" ? `Fondateur nº${nf}. ` : "") +
          (payload.origine === "rattachement"
            ? "Reconnu par le rattachement posé à la main, pas par son email. "
            : "") +
          "Rien à saisir : la remise était déjà sur la page de paiement",
        ton: "nous",
      };
    }

    /* Le paiement est passé AVEC la remise : le droit contractuel est soldé.
       Écrit par le webhook Stripe, jamais par nous. */
    case "credit_fondatrice_consomme": {
      const m = payload.montant;
      return {
        texte: "Crédit fondateur dépensé",
        detail:
          (typeof m === "number" ? `${(m / 100).toFixed(0)} € déduits. ` : "") +
          "Le droit de l'article 5 bis est soldé : il ne s'appliquera plus",
        ton: "neutre",
      };
    }

    /* ── LE CLIENT A CHOISI SA DESTINATION (11/09/2026) ───────────────
       Le dossier n'avait pas de pays (ouvert avant l'écran 4), la page de
       commande le lui a demandé, et le port a été devisé dans la foulée.
       C'est un geste de CLIENT sur une colonne d'argent : il doit se lire
       dans le récit, avec le montant, sinon « pourquoi 14,80 € de port ? »
       n'a de réponse nulle part. Un changement d'avis se lit aussi. */
    case "livraison_choisie": {
      const nomPays = (v: unknown): string => {
        const c = typeof v === "string" ? v.trim().toUpperCase() : "";
        return c in PAYS_LIBELLE ? PAYS_LIBELLE[c as keyof typeof PAYS_LIBELLE] : c || "?";
      };
      const cts = typeof payload.livraison_centimes === "number" ? payload.livraison_centimes : null;
      const montant =
        cts === null
          ? null
          : `${(cts / 100).toFixed(2).replace(".", ",")} €`;
      const precedent =
        typeof payload.precedent === "string" && payload.precedent.trim()
          ? `Il avait d'abord choisi ${nomPays(payload.precedent)}`
          : null;
      return {
        texte: `Le client a choisi la livraison vers ${nomPays(payload.pays)}`,
        detail: [montant ? `Port devisé : ${montant}` : null, precedent]
          .filter(Boolean)
          .join(" · ") || null,
        ton: "elle",
      };
    }

    /* ── LE PAYS DÉCLARÉ N'EST PAS CELUI DE L'ADRESSE (10/09/2026) ─────
       Le client a annoncé un pays à l'écran 4 (c'est sur lui que le port
       est devisé), Stripe en a rendu un autre au paiement. Rien n'a été
       bloqué, et c'est voulu ; mais quelqu'un doit pouvoir le voir, parce
       que l'écart de port est pour l'atelier. La phrase nomme les DEUX pays
       en toutes lettres : « BE ≠ FR » ne se lit pas. */
    case "pays_livraison_divergent": {
      const nom = (v: unknown): string => {
        const c = typeof v === "string" ? v.trim().toUpperCase() : "";
        return c in PAYS_LIBELLE ? PAYS_LIBELLE[c as keyof typeof PAYS_LIBELLE] : c || "?";
      };
      return {
        texte: "Le pays de livraison ne correspond pas",
        detail:
          `Le pays de l'adresse Stripe (${nom(payload.stripe)}) diffère de celui ` +
          `déclaré (${nom(payload.declare)}). Rien n'a été bloqué : à regarder avant d'expédier`,
        ton: "alerte",
      };
    }

    case "paiement_inattendu":
      return { texte: "Paiement inattendu", detail: "À vérifier chez Stripe", ton: "alerte" };

    /* ── les rebonds (webhook Brevo) ────────────────────────────────────
       « hard_bounce » ne dit rien à qui n'a pas la doc de Brevo sous les
       yeux. La phrase dit la CONSÉQUENCE, parce que c'est elle qui décide
       de ce qu'on fait : appeler, ou corriger l'adresse. */
    case "email_rebond": {
      const raison = typeof payload.raison === "string" ? payload.raison.trim() : "";
      return {
        texte: "Cette adresse ne reçoit pas nos mails",
        detail: raison || "Rebond définitif : à corriger ou à appeler",
        ton: "alerte",
      };
    }

    /* Elle a bien reçu — et l'a signalé comme indésirable. Le dossier reste
       joignable, mais les mails suivants risquent le dossier spam. Deux
       situations différentes, deux phrases différentes : confondre les deux
       ferait appeler une cliente pour lui dire qu'on n'arrive pas à la
       joindre. */
    case "email_plainte":
      return {
        texte: "Un de nos mails a été marqué comme indésirable",
        detail: "L'adresse fonctionne, mais les suivants risquent le dossier spam",
        ton: "alerte",
      };

    /* ── Cloudprinter (PRD §13 phase 2) ─────────────────────────────────
       La commande, puis le fil de production poussé par leurs webhooks.
       Un seul signal change l'état (ItemShipped → « Expédié », rendu par
       etat_change ci-dessus) ; le reste raconte. */
    case "cloudprinter_commande":
      return {
        texte: fait(qui, "a passé la commande chez l'imprimeur", "Commande passée chez l'imprimeur"),
        detail: typeof payload.orderId === "string" ? `nº ${payload.orderId}` : null,
        ton: "nous",
      };

    case "cloudprinter_manuel":
      return {
        texte: fait(qui, "a lancé l'impression en mode manuel", "Impression lancée en mode manuel"),
        detail: "Cloudprinter n'est pas branché : la commande est à passer à la main",
        ton: "neutre",
      };

    case "cloudprinter_signal": {
      const SIGNAUX: Record<string, string> = {
        CloudprinterOrderValidated: "L'imprimeur a validé la commande",
        CloudprinterItemValidated: "L'imprimeur a validé les fichiers",
        ItemValidated: "L'imprimeur a validé les fichiers",
        ItemProduce: "La production a commencé",
        ItemProduced: "L'impression est terminée",
        ItemPacked: "Le colis est emballé",
        ItemDeliveryStarted: "Le transporteur a pris le colis",
        ItemDeliveryCompleted: "Le transporteur annonce la livraison",
      };
      const type = String(payload.type ?? "");
      return {
        texte: SIGNAUX[type] ?? `Signal de l'imprimeur : ${type.replace(/_/g, " ")}`,
        detail: null,
        ton: "neutre",
      };
    }

    case "cloudprinter_erreur": {
      const TYPES_ALERTE: Record<string, string> = {
        ItemCanceled: "L'imprimeur a ANNULÉ la production",
        CloudprinterOrderCanceled: "L'imprimeur a ANNULÉ la commande",
        ItemDeliveryFailed: "La LIVRAISON a échoué",
      };
      return {
        texte: TYPES_ALERTE[String(payload.type ?? "")] ?? "L'imprimeur signale un problème",
        detail:
          [payload.cause, payload.message].filter((v) => typeof v === "string" && v).join(" · ") ||
          "À traiter à la main, avec leur dashboard",
        ton: "alerte",
      };
    }

    case "cloudprinter_echec":
      return {
        texte: "La commande d'impression n'est PAS partie",
        detail: typeof payload.message === "string" ? (payload.message as string) : null,
        ton: "alerte",
      };

    /* La commande existe chez Cloudprinter mais n'a pas pu être enregistrée
       ici (course perdue sur l'écriture). Rarissime, et c'est exactement
       pour ce cas que le journal existe : elle s'annule à leur dashboard. */
    case "cloudprinter_orpheline":
      return {
        texte: "Commande d'impression ORPHELINE",
        detail:
          (typeof payload.orderId === "string" ? `nº ${payload.orderId} — ` : "") +
          "passée chez Cloudprinter mais non enregistrée ici : à vérifier ou annuler sur leur dashboard",
        ton: "alerte",
      };

    case "cloudprinter_signal_inattendu":
      return {
        texte: "Signal d'expédition inattendu",
        detail: `Le dossier n'était pas en production (état « ${String(payload.etat ?? "?")} »)`,
        ton: "alerte",
      };

    /* T-076 — le dossier a été refermé au bout de 90 jours sans activité.
       C'est la SEULE trace lisible de ce qui a disparu : la ligne, elle, ne
       dit plus rien (email, prénom, histoire et titre sont partis). Le
       nombre de photos effacées et la date du préavis y sont, parce que
       « qu'aviez-vous sur moi, et quand l'avez-vous effacé » est une
       question à laquelle il faut savoir répondre. */
    case "dossier_anonymise":
      return {
        texte: "Dossier refermé et anonymisé",
        detail:
          `${payload.jours_inactivite ?? "?"} jours sans activité, ` +
          `${payload.photos_effacees ?? 0} objet(s) effacé(s) du coffre` +
          (typeof payload.preavis_le === "string" && payload.preavis_le.includes("-")
            ? ` — préavis M10 parti le ${payload.preavis_le.slice(0, 10)}`
            : ""),
        ton: "neutre",
      };

    default:
      /* Un événement d'un lot futur ne doit pas disparaître du journal. */
      return { texte: type.replace(/_/g, " "), detail: null, ton: "neutre" };
  }
}
