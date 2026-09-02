/**
 * POST /api/atelier/numero — fin de l'écran 4 du questionnaire (PRD §7.2).
 *
 * Crée la ligne `numeros`, génère le token public et journalise l'événement
 * fondateur du dossier. C'est la PREMIÈRE écriture en base du parcours : les
 * écrans 1 à 3 ne vivent qu'en localStorage.
 *
 * Route distincte de /api/waitlist et /api/checkout, qui servent la prévente :
 * aucune table de la prévente n'est lue ni écrite ici.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { canonicalizeEmail } from "@/lib/email";
import { generateNumeroToken, isValidNumeroToken } from "@/lib/atelier/token";
import { logEvenement } from "@/lib/atelier/evenements";
import { lireNumerosMail, envoyerMailAtelier, type NumeroPourMail } from "@/lib/atelier/mails";
import {
  CHAMPS_QUESTIONNAIRE,
  normaliserTelephone,
  premierManquant,
} from "@/lib/atelier/questionnaire";

export const runtime = "nodejs";

/* Même garde-fou que /api/waitlist : mémoire de l'instance, suffisant pour
   décourager le rejeu, jamais présenté comme une protection forte. */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = process.env.NODE_ENV === "production" ? 5 : 30;
/* PATCH ne crée rien et exige un token valide : le plafond y sert à couper un
   script, pas à rationner une cliente indécise. */
const RATE_LIMIT_MAX_PATCH = process.env.NODE_ENV === "production" ? 30 : 120;
const RATE_LIMIT_WINDOW_MS = process.env.NODE_ENV === "production" ? 60_000 : 10_000;

/* Plafonds de saisie — coupent au lieu de rejeter : personne ne perd son
   texte parce qu'il a écrit trois lignes de trop. */
const MAX = { occasion: 120, histoire: 4000, titre: 34, prenom: 60, telephone: 30 };

/* Sorti du corps de POST pour servir aussi à PATCH : les deux écrivent en
   base et méritent le même garde-fou — mais pas le même plafond, et pas le
   même compteur. Créer un dossier est rare ; cocher, décocher et recocher une
   case de l'état 2 est le geste d'une cliente qui hésite avant de payer. Un
   compteur commun lui répondrait « votre accord n'a pas pu être enregistré »
   au troisième doute, juste avant l'acte d'achat. */
function depasseLePlafond(request: Request, max = RATE_LIMIT_MAX): boolean {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (val.resetAt < now) rateLimitMap.delete(key);
  }
  const ip = `${request.method}:${request.headers.get("x-forwarded-for") ?? "unknown"}`;
  const entry = rateLimitMap.get(ip);
  if (entry && entry.resetAt > now) {
    if (entry.count >= max) return true;
    entry.count++;
    return false;
  }
  rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  return false;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    if (depasseLePlafond(request)) {
      return NextResponse.json(
        { error: "rate_limited", message: "Trop de tentatives. Réessayez dans un instant." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    /* ── TOUTES LES RÉPONSES, OU RIEN ──────────────────────────────────
       Jusqu'au 28/08/2026, seuls le prénom et l'email étaient exigés :
       l'occasion, l'histoire et le titre pouvaient arriver vides, et le
       premier dossier venu de l'extérieur est arrivé sans titre. Un
       questionnaire dont on peut sauter les questions n'est pas un
       questionnaire, c'est un formulaire de contact.

       La règle est celle de questionnaire.ts, la MÊME que celle du
       navigateur. On la revérifie ici parce qu'un navigateur ne garantit
       rien : brouillon d'une version antérieure, onglet resté ouvert
       pendant un déploiement, appel direct. C'est cette route qui décide
       de ce qui entre en base.

       On renvoie LE champ fautif : le questionnaire repose alors la
       cliente sur le bon écran, au lieu d'un « réessayez » devant un
       formulaire qui a l'air complet. */
    const valeurs = {
      occasion: clean(body.occasion, MAX.occasion),
      histoire: clean(body.histoire, MAX.histoire),
      titre: clean(body.titre, MAX.titre),
      prenom: clean(body.prenom, MAX.prenom),
      email: clean(body.email, 200).toLowerCase(),
      telephone: normaliserTelephone(clean(body.telephone, MAX.telephone)),
    };

    const manquant = premierManquant(CHAMPS_QUESTIONNAIRE, (c) => valeurs[c]);
    if (manquant) {
      return NextResponse.json(
        { error: "champ_manquant", champ: manquant },
        { status: 400 },
      );
    }

    const { email, prenom } = valeurs;

    const supabase = makeSupabase();
    const token = generateNumeroToken();

    /* Plus aucun `|| null` : les six champs ont été validés juste au-dessus,
       et une colonne nulle ne peut donc plus vouloir dire « elle a sauté la
       question ». Un null qui subsisterait en base est désormais un dossier
       ANTÉRIEUR au 28/08, jamais un dossier neuf.
       Le téléphone est enregistré NORMALISÉ (« +33769710686 ») : c'est cette
       forme que Cloudprinter attend, et la normaliser au moment de la
       commande obligerait à refaire le même travail des deux côtés. */
    const { data, error } = await supabase
      .from("numeros")
      .insert({
        token,
        etat: "photos_recues",
        occasion: valeurs.occasion,
        histoire: valeurs.histoire,
        titre: valeurs.titre,
        prenom,
        email,
        email_canonical: canonicalizeEmail(email),
        telephone: valeurs.telephone,
      })
      .select("id, token")
      .single();

    if (error || !data) {
      console.error("[atelier/numero] insert échoué", error?.code, error?.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    /* Invariant nº6 — le dossier commence par une ligne de journal. */
    await logEvenement(supabase, data.id, "numero_cree", {
      etat: "photos_recues",
      source: "questionnaire_ecran_4",
    });

    /* ══════════════════════════════════════════════════════════════════
       M0 — L'ACCUSÉ, DANS LA SECONDE.

       Jusqu'ici, rien ne partait ici. Le premier mail du parcours était M1,
       et M1 exige `consent_photos`, c'est-à-dire un dépôt TERMINÉ. Une
       cliente qui s'arrêtait à l'écran 5 donnait donc son adresse et
       recevait le silence : le seul filet était M2, entre 24 et 46 h plus
       tard selon l'heure d'inscription. Le 27/08, une cliente a rempli le
       questionnaire, n'a jamais déposé de photo, et a très probablement cru
       sa demande terminée. Personne, des deux côtés, n'avait de quoi s'en
       apercevoir le jour même.

       M0 fait deux choses qu'aucun autre mail ne peut faire :
         — il dit, tant que c'est encore frais, que le dossier attend ses
           photos. C'est la seule correction possible d'un malentendu qui
           naît à l'écran 4 ;
         — il lui met le LIEN PERMANENT en main tout de suite. Avant lui, le
           token ne vivait que dans le localStorage de son appareil : onglet
           fermé, et le dossier devenait injoignable jusqu'à M2.

       Best-effort, comme tous les envois de l'atelier : le verrou de
       `mails_envoyes` empêche le doublon, un échec Brevo est journalisé et
       la relève réessaiera tant que le dossier a moins de 24 h (codesPour).
       Quoi qu'il arrive, la cliente voit son écran 5 — on ne fait jamais
       échouer une création de dossier sur un mail.
       ══════════════════════════════════════════════════════════════════ */
    await envoyerMailAtelier(supabase, "M0", {
      id: data.id,
      token: data.token,
      titre: valeurs.titre,
      prenom,
      email,
      nb_photos: 0,
      nb_pages: null,
      palier: null,
      apercu_urls: null,
    });

    return NextResponse.json({ token: data.token }, { status: 201 });
  } catch (err) {
    console.error("[atelier/numero] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

/**
 * PATCH /api/atelier/numero — les consentements de la cliente.
 *
 * `consent_photos` est le droit d'usage des photos : la case obligatoire de
 * l'écran 5, posée au clic sur « Envoyer à l'atelier ». `consent_communication`
 * est la case FACULTATIVE de l'écran 6 — sans elle, aucun extrait du numéro ne
 * peut être publié (PRD §14), et elle doit donc pouvoir être décochée.
 *
 * HORODATAGE. La table ne porte pas de colonne `consent_photos_at` (seules les
 * deux cases du paiement en ont une, cgv_ok_at et renonciation_at). La date
 * fait foi par le journal : `evenements` est append-only et c'est, par
 * construction de la PRD §5, la seule trace opposable d'un dossier. Ajouter
 * une colonne dupliquerait une information que le journal porte déjà mieux.
 *
 * LES DEUX CASES DU PAIEMENT passent aussi par ici — `cgv_ok` et
 * `renonciation_retractation`, cochées sur la page d'état 2 (PRD §8). Elles
 * ont, elles, leur horodatage en colonne : c'est une mention légale opposable
 * (article L221-28 3° du code de la consommation) et elle doit se lire sans
 * dépouiller un journal. Elles ne sont acceptées que depuis l'état
 * `apercu_pret` : après paiement, la reconnaissance est acquise et ne se
 * rétracte pas d'un clic. Invariant nº3 — aucun paiement possible sans les
 * deux cases cochées ET horodatées ; c'est /api/atelier/checkout qui le
 * revérifie en base au moment de créer la session.
 *
 * Le token fait foi : pas de compte, pas de session (PRD §7.5).
 */
export async function PATCH(request: Request) {
  try {
    if (depasseLePlafond(request, RATE_LIMIT_MAX_PATCH)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    const maj: Record<string, boolean | string | null> = {};
    /* consent_photos ne se retire pas ici : il conditionne un dépôt déjà
       fait. Un retrait est une demande de suppression, pas une case à
       décocher — elle passe par l'atelier, pas par une requête. */
    if (body.consent_photos === true) maj.consent_photos = true;

    /* ── LE TÉMOIN DU DÉPÔT INCOMPLET (01/09) ─────────────────────────
       Depuis que le bouton « Envoyer à l'atelier » s'ouvre sans attendre la
       fin des transferts, le clic peut arriver alors que des photos montent
       encore. Elles montent DEPUIS LE NAVIGATEUR : onglet fermé, elles
       s'arrêtent, et aucun serveur ne peut les reprendre.

       Le navigateur annonce donc combien il comptait en envoyer. Ce nombre
       n'entre PAS dans `numeros` (aucune colonne, aucune migration) : il va
       au journal, qui est append-only et fait foi (PRD §5). L'écart entre lui
       et `nb_photos` est la seule chose qui distingue « elle voulait 40
       photos » de « elle en voulait 78 et l'onglet s'est fermé ». Sans lui,
       les deux dossiers sont identiques à l'écran de l'atelier.

       Jamais cru comme une vérité : plafonné, entier, et seulement s'il
       dépasse le compte déjà en base. */
    const attendues =
      typeof body.photos_attendues === "number" &&
      Number.isFinite(body.photos_attendues) &&
      body.photos_attendues > 0
        ? Math.min(Math.floor(body.photos_attendues), 500)
        : null;
    if (typeof body.consent_communication === "boolean") {
      maj.consent_communication = body.consent_communication;
    }

    /* Les deux cases de l'état 2. Décocher efface l'horodatage : une date
       d'acceptation qui survivrait au retrait de l'accord ne prouverait rien
       et se retournerait contre nous. Le journal, lui, garde les deux gestes. */
    const maintenant = new Date().toISOString();
    let casesPaiement = false;
    if (typeof body.cgv_ok === "boolean") {
      casesPaiement = true;
      maj.cgv_ok = body.cgv_ok;
      maj.cgv_ok_at = body.cgv_ok ? maintenant : null;
    }
    if (typeof body.renonciation_retractation === "boolean") {
      casesPaiement = true;
      maj.renonciation_retractation = body.renonciation_retractation;
      maj.renonciation_at = body.renonciation_retractation ? maintenant : null;
    }

    /* T2-13 — « j'ai noté des retouches dans le Canva », le troisième geste
       de l'état 4. Branche DÉDIÉE, jamais dans `maj` : le journal
       `consentements` raconte des cases cochées, pas une demande de
       correction, et les deux gestes ne doivent pas se mélanger. */
    const demandeRetouches = body.retouches_demandees === true;

    if (!Object.keys(maj).length && !demandeRetouches) {
      return NextResponse.json({ error: "rien_a_faire" }, { status: 400 });
    }

    const supabase = makeSupabase();

    /* On lit d'emblée de quoi écrire un mail : la branche consent_photos
       ci-dessous déclenche M1, et repasser une requête pour aller chercher le
       titre et le nombre de photos ne servirait qu'à doubler la latence du
       geste le plus fragile du parcours. */
    const { data: numero, error: lecture } = await lireNumerosMail<
      (NumeroPourMail & { etat: string }) | null
    >((champs) =>
      supabase
        .from("numeros")
        .select(champs)
        .eq("token", token)
        .maybeSingle<NumeroPourMail & { etat: string }>(),
    );

    /* T-043 — une panne de base n'est PAS un token inconnu. Répondre 404 ici
       ferait dire à la cliente que son dossier n'existe pas, au moment même où
       elle clique « Envoyer à l'atelier » : elle n'aurait aucune raison de
       réessayer. Même règle que /valider, /checkout et /presign. */
    if (lecture) {
      console.error("[atelier/numero] lecture échouée", lecture.code, lecture.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    /* Token inconnu → 404 sec, aucune information ne fuite (test §17.7). */
    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    /* Les cases du paiement n'existent qu'à l'état 2. Ailleurs, la demande
       vient d'un onglet resté ouvert pendant que le dossier avançait. */
    if (casesPaiement && numero.etat !== "apercu_pret") {
      return NextResponse.json({ error: "etat_incompatible" }, { status: 409 });
    }

    /* Les retouches n'existent qu'à l'état 4 : ailleurs, la demande vient
       d'un onglet resté ouvert pendant que le dossier avançait. */
    if (demandeRetouches && numero.etat !== "maquette_prete") {
      return NextResponse.json({ error: "etat_incompatible" }, { status: 409 });
    }

    if (demandeRetouches) {
      /* Atomique et idempotent : le `.is(null)` fait qu'un second clic (ou un
         rejeu réseau) ne réécrit pas la date et ne rejournalise rien. La
         suspension de l'auto-validation à J+7 découle de cette colonne
         (doitAutoValider, mails.ts) ; elle est levée quand l'atelier republie
         la maquette. */
      const { data: pose } = await supabase
        .from("numeros")
        .update({ retouches_demandees_le: maintenant })
        .eq("id", numero.id)
        .eq("etat", "maquette_prete")
        .is("retouches_demandees_le", null)
        .select("id");

      /* Invariant nº6 — seulement si le geste a réellement eu lieu. */
      if (pose?.length) {
        await logEvenement(supabase, numero.id, "retouches_demandees", {
          source: "page_numero",
        });
      }
    }

    if (Object.keys(maj).length) {
      const { error } = await supabase.from("numeros").update(maj).eq("id", numero.id);
      if (error) {
        console.error("[atelier/numero] patch consentements échoué", error.code);
        return NextResponse.json({ error: "internal" }, { status: 500 });
      }

      /* Invariant nº6 — et ici, c'est aussi l'horodatage.
         ⚠️ `photos_attendues` s'ajoute au payload SANS jamais passer par
         `maj` : `maj` part en UPDATE sur `numeros`, et cette colonne
         n'existe pas. La clé reste absente quand le navigateur n'a rien
         annoncé — un dossier antérieur au 01/09 n'en portera jamais, et
         l'admin sait lire cette absence. */
      await logEvenement(supabase, numero.id, "consentements", {
        ...maj,
        ...(maj.consent_photos === true && attendues !== null
          ? { photos_attendues: attendues }
          : {}),
      });
    }

    /* M1 « {{titre}}, c'est parti » (PRD §10) — LA FIN DU DÉPÔT.
       C'est le seul signal serveur qui dit « elle a terminé » : le moteur
       d'upload pose consent_photos au clic sur « Envoyer à l'atelier »
       (depot/moteur.ts, finaliser()), après confirmation des photos et
       recomptage de nb_photos. Il n'y a rien d'autre à écouter.

       Le rejeu est inoffensif : le verrou de `mails_envoyes` fait qu'un
       réessai réseau du navigateur n'envoie pas un second mail. L'envoi ne
       throw jamais et n'est pas awaité pour sa valeur : quoi qu'il arrive,
       la cliente voit son écran 6.

       ⚠️ SON COMPTE DE PHOTOS, DEPUIS LE 01/09. Le clic peut désormais
       arriver avec des transferts en cours : `NB_PHOTOS` est alors un
       PLANCHER, pas un total. C'est assumé, et c'est le moindre mal.
         — Le chiffre vient de `numero.nb_photos`, relu en base juste
           au-dessus : c'est ce que le serveur a réellement mesuré sur R2 à
           cet instant. Il n'invente rien, et il ne peut que SOUS-estimer,
           jamais sur-promettre. Une cliente qui lit « vos 42 photos » et en
           retrouve 55 sur sa page n'a perdu personne ; l'inverse, si.
         — Attendre la fin des transferts pour l'envoyer rouvrirait le trou
           que M0 a été écrit pour boucher : jusqu'à 24 h de silence après le
           clic le plus décisif du parcours, dans le cas exact où l'onglet se
           ferme. Le filet existe (codesPour rend M1 tant qu'il n'est pas
           parti), mais un filet à 24 h n'est pas un accusé.
         — Le seuil de faisabilité, lui, est compté sur les photos
           CONFIRMÉES (paliers.ts) : ce plancher vaut donc toujours au moins
           MIN_PHOTOS. Il n'y a pas de « vos 3 photos ». */
    if (maj.consent_photos === true && numero.etat === "photos_recues") {
      await envoyerMailAtelier(supabase, "M1", numero);
    }

    /* ── LE RETOUR DE L'ÉTAT 1b (PRD §6 : « 1b → retour à 1 ») ──────────
       Sans ce bloc, l'état 1b est un cul-de-sac : l'atelier demande plus de
       photos, la cliente en redépose, et le dossier reste marqué « photos
       insuffisantes ». Personne ne voit rien remonter dans la table de
       travail, elle attend une couverture qui ne viendra jamais.

       Le dépôt accepte déjà les états 1 et 1b (photos/presign) et sa page lui
       propose bien de reprendre — il ne manquait que le chemin du retour.

       `etat_maj_le` repart de zéro : c'est lui qui fait courir les 48 h de la
       promesse. Un dossier revenu doit avoir un délai neuf, pas celui de son
       premier passage.

       Pas de mail : M1 est déjà parti au premier dépôt et son verrou tient.
       Le signal, c'est la remontée dans /admin. */
    if (maj.consent_photos === true && numero.etat === "photos_insuffisantes") {
      const { data: retour } = await supabase
        .from("numeros")
        .update({ etat: "photos_recues", etat_maj_le: maintenant })
        .eq("id", numero.id)
        .eq("etat", "photos_insuffisantes")
        .select("id");

      /* Invariant nº6 — et zéro ligne touchée veut dire que l'atelier est
         passé entre-temps : on ne rejournalise pas une transition qui n'a
         pas eu lieu. */
      if (retour?.length) {
        await logEvenement(supabase, numero.id, "etat_change", {
          de: "photos_insuffisantes",
          vers: "photos_recues",
          par: "cliente",
          source: "depot_repris",
          nb_photos: numero.nb_photos,
        });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[atelier/numero] exception PATCH", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
