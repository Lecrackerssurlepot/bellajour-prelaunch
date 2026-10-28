"use client";

/* Le dépôt d'un participant (PRD §5.1, planches 6, 7 et 8 du 20/10) : d'abord
   sur téléphone.

   ══════════════════════════════════════════════════════════════════════════
   LE PARCOURS (contrat `docs/produit/collectif/CONTRAT-PERSONNES-CORBEILLE.md`)

   1. Se présenter (planche 6) : l'ADRESSE d'abord. Dès qu'elle est complète,
      la page demande au serveur s'il la connaît (`depot/participant`, action
      `presenter`, sans nom : rien n'est écrit pour une adresse inconnue).
      Connue : « Content de te revoir, Léa » (8B), et ce téléphone parle pour
      elle ; inconnue : prénom ET nom, et la personne n'est créée qu'au choix
      des photos, AVANT l'envoi (le serveur rattache la photo à la personne du
      téléphone : présenter d'abord, envoyer ensuite).
   2. L'accord, puis « Choisir mes photos ». Puis l'album du lien (planche 7) :
      « Mes photos » s'ouvre, chaque photo y avance, la barre du bas compte ce
      qui ARRIVE (`Album.tsx`).
   3. Le même téléphone qui revient (8A) s'ouvre sur l'album s'il a déjà
      accepté le texte d'aujourd'hui (`accordAJour`) ; sinon la carte le
      reconnaît et redemande l'accord. « Ce n'est pas toi ? » (action
      `oublier`) : le téléphone repart de zéro et le dit (8C).

   ⚠️ L'adresse n'est PAS vérifiée : une personne retrouvée ne montre que son
   PRÉNOM (jamais son nom de famille) ; le nom complet ne s'affiche que s'il
   vient d'être tapé ici. La phrase sous le champ dit à quoi elle sert, et à
   rien d'autre.

   ⚠️ Le texte de l'accord est un texte LÉGAL : il vient de `texteAccord`
   (accord.ts), jamais écrit ici. Sa VERSION est `VERSION_ACCORD` : cocher la
   donne au moteur, qui l'envoie avec chaque photo ; le serveur refuse un
   participant sans elle et l'enregistre horodatée (T-184). L'accord est
   redemandé sur chaque nouveau téléphone.

   SANS LA MIGRATION 20261023 (`personnes` faux, ou la présentation qui répond
   503 `migration_personnes_absente`) : la règle d'avant, sans adresse. Le nom
   se GARDE sur le téléphone (T-180, propre à ce lien depuis T-198) et ne se
   CHANGE plus une fois des photos choisies (participant.ts) ; le serveur fait
   foi (`nomConnu`, lu par le cookie de l'appareil). L'album reste lisible,
   rien ne s'y supprime.
   ⚠️ Aucune promesse que l'écran ne tient pas : l'envoi ne continue pas page
   fermée (iOS surtout), on le dit.

   Retours de Mathias du 21/10 : la carte « Content de vous revoir » dit ce qui
   est sur CE lien et ce qui reste (`phraseRetour` : « 2 photos déjà sur
   « Bateau 1 ». Vous pouvez encore en envoyer 3. »), plus le total de
   l'édition ; « cet appareil » partout (un ordinateur n'est pas un
   téléphone) ; un 404 de la présentation (le lien régénéré ou supprimé
   pendant que la page est ouverte) fait basculer toute la page sur « Ce lien
   ne fonctionne plus » (`CarteLienMort`).
   ══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { texteAccord, VERSION_ACCORD } from "@/lib/collectif/accord";
import { TAILLE_PAGE_ALBUM } from "@/lib/collectif/album";
import { PHOTOS_SEULEMENT } from "@/lib/collectif/depot";
import { BOUTON_REPRENDRE, cleDeVisite, coupeesADire, decouperAccord, initiales } from "@/lib/collectif/depotParticipant";
import { type ChampManquant, libellePasMoi, ligneReste, limiteDeCarte, messageManquant, phraseDejaSurLien, piedDeCarte } from "@/lib/collectif/phrasesDepot";
import { useMoteur } from "../../edition/_composants/depot/useMoteur";
import { deNom } from "@/lib/collectif/espace";
import { NOM_MAX, nettoyerMorceau, nomComplet, premierMot } from "@/lib/collectif/participant";
import { EMAIL_MAX, lireIdentite, normaliserEmail } from "@/lib/collectif/personnes";
import { MoteurDepot } from "../../edition/_composants/depot/moteur";
import { phraseSilence, useSelecteur } from "../../edition/_composants/depot/useSelecteur";
import Album, { type Onglet, type Tete } from "./Album";
import { lirePersonne, oublier, presenter } from "./appels";
import { TeteCarte } from "./Etats";
import { IcoAppareil, IcoTelephone } from "./icones";
import { CarteLienMort } from "./LienMort";

type Props = {
  token: string;
  p: string | null;
  tete: Tete;
  /** Le message d'accueil de l'édition (ou la phrase par défaut, au registre). */
  invitation: string;
  /** L'organisateur l'a-t-il écrite ? La phrase par défaut répète le titre : elle ne s'affiche pas. */
  invitationEcrite: boolean;
  plafond: number | null;
  sansPlafond: boolean;
  cloture: string;
  /** La migration 20261023 est-elle là (adresse, « Ce n'est pas toi ? », supprimer) ? */
  personnes: boolean;
  /** La personne pour qui CE téléphone parle déjà (lue au serveur) : son prénom seulement ; `surCeLien` : ses photos sur CE lien. */
  moi: { prenom: string; photos: number; ceTelephone: number; surCeLien: number; accordAJour: boolean } | null;
  /** La place qui reste (serveur) : nombre, `null` sans limite, `undefined` inconnue. */
  place: number | null | undefined;
  /** Sans la migration : le nom que CE téléphone a déjà donné dans l'édition, ou `null`. */
  nomConnu: string | null;
  /** Sans la migration : ses photos déjà arrivées dans l'édition. */
  dejaArrivees: number;
  /** 2A : les photos que CET appareil a déclarées sans qu'elles arrivent (un envoi coupé), lues au serveur. */
  coupees: number;
};

/** Le nom gardé sur ce téléphone (sans la migration), PROPRE à ce lien (T-198 : un téléphone prêté reprenait le nom d'une autre édition). */
function clePrenom(token: string, p: string | null): string {
  return `bj-depot-prenom-${cleDeVisite(token, p).slice("bj-depot-vu-".length)}`;
}
function prenomGarde(cle: string): string {
  try {
    return window.localStorage.getItem(cle) ?? "";
  } catch {
    return "";
  }
}
function garderPrenom(cle: string, v: string) {
  try {
    if (v.trim()) window.localStorage.setItem(cle, v.trim());
    else window.localStorage.removeItem(cle);
  } catch {
    /* rien de gardé : on le redemandera */
  }
}
const sansAbonnement = () => () => {};

type Qui = { prenom: string; nom: string | null };
type EtatEmail = "attente" | "cherche" | "inconnu" | "connu" | "erreur";

export default function Depot(props: Props) {
  const { token, p, tete } = props;
  const { tu, lien } = tete;
  const v = (vous: string, toi: string) => (tu ? toi : vous);

  /* ── la règle d'avant (sans la migration) : le nom gardé sur le téléphone ── */
  const cle = clePrenom(token, p);
  const garde = useSyncExternalStore(sansAbonnement, () => prenomGarde(cle), () => "");
  const [fige, setFige] = useState<string | null>(null);
  const nomFixe = props.nomConnu ?? fige ?? (garde || null);
  const [repliForce, setRepliForce] = useState(false);
  const repli = !props.personnes || repliForce;

  /* ── la personne ── */
  const [identite, setIdentite] = useState<Qui | null>(props.moi ? { prenom: props.moi.prenom, nom: null } : null);
  /* `surCeLien` : ses photos sur CE lien (21/10 : la carte disait le total de l'édition, « 11 photos » sur un lien à 5). */
  const [reconnu, setReconnu] = useState<{ par: "telephone" | "email"; surCeLien: number } | null>(props.moi ? { par: "telephone", surCeLien: props.moi.surCeLien } : null);
  const [oublie, setOublie] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const emailCourant = useRef("");
  const dejaDemande = useRef<string | null>(null);
  const [etatEmail, setEtatEmail] = useState<{ etat: EtatEmail; message: string | null }>({ etat: "attente", message: null });
  const [prenomSaisi, setPrenomSaisi] = useState("");
  const [nomSaisi, setNomSaisi] = useState("");
  const [place, setPlace] = useState(props.place);
  const [erreur, setErreur] = useState<string | null>(null);
  /* Le champ manquant signalé au clic sur le bouton (jamais un bouton grisé avec la raison ailleurs). */
  const [manque, setManque] = useState<ChampManquant | null>(null);
  /* Le lien est mort (un 404 de la présentation) : toute la page le dit. */
  const [mort, setMort] = useState(false);
  const occupe = useRef(false);

  const accordInitial = Boolean(props.moi?.accordAJour);
  const [accord, setAccord] = useState(accordInitial);
  const moteur = useMemo(() => {
    const m = new MoteurDepot({ token, p, tu, apercus: TAILLE_PAGE_ALBUM });
    /* Ce téléphone a déjà accepté le texte d'aujourd'hui pour cette personne (8A) : il n'est pas redemandé. */
    if (accordInitial) m.definirAccord(VERSION_ACCORD);
    return m;
  }, [token, p, tu, accordInitial]);
  /* 2A : un envoi coupé se dit tant que rien n'a été choisi sur cette page (ensuite, le moteur parle). */
  const vueMoteur = useMoteur(moteur);
  const coupees = coupeesADire(props.coupees, vueMoteur.total);
  const [mode, setMode] = useState<{ ecran: "carte" | "album"; onglet: Onglet; accueil: boolean }>(
    props.moi?.accordAJour ? { ecran: "album", onglet: "album", accueil: true } : { ecran: "carte", onglet: "album", accueil: false }
  );

  /* Réseau lent : le formulaire est rendu par le serveur et se tape bien avant l'hydratation. React remet alors
     les champs à l'état (vide) et efface la saisie. Au montage, on reprend donc ce que le DOM contient déjà.
     Le setState dans l'effet est voulu : c'est la seule façon de lire le DOM d'avant l'hydratation. */
  useEffect(() => {
    const lire = (id: string) => (document.getElementById(id) as HTMLInputElement | null) ?? null;
    const mail = lire("ec-dp-f-email")?.value ?? "";
    const prenom = lire("ec-dp-f-prenom")?.value ?? "";
    const nom = lire("ec-dp-f-nom")?.value ?? "";
    const accepte = lire("ec-dp-f-accord")?.checked ?? false;
    if (mail) {
      setEmail(mail);
      emailCourant.current = mail;
    }
    if (prenom) setPrenomSaisi(prenom);
    if (nom) setNomSaisi(nom);
    if (accepte) {
      setAccord(true);
      moteur.definirAccord(VERSION_ACCORD);
    }
    // Une seule fois, au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* Faux côté serveur et pendant l'hydratation, vrai ensuite : tant que la page n'a pas pris la main, le bouton le dit. */
  const pret = useSyncExternalStore(sansAbonnement, () => true, () => false);

  const emailLu = normaliserEmail(email);
  const nomPret = repli ? Boolean(nomFixe ?? nomComplet(prenomSaisi, nomSaisi)) : Boolean(identite ?? (emailLu && nomComplet(prenomSaisi, nomSaisi)));

  /* L'adresse complète : le serveur la reconnaît-il ? (rien n'est écrit pour une adresse inconnue). */
  useEffect(() => {
    if (repli || reconnu || !emailLu || emailLu === dejaDemande.current) return;
    const minuteur = setTimeout(async () => {
      dejaDemande.current = emailLu;
      setEtatEmail({ etat: "cherche", message: null });
      const r = await presenter(token, p, emailLu);
      if (normaliserEmail(emailCourant.current) !== emailLu) return;
      if (r.status === 503) {
        setRepliForce(true);
        return;
      }
      if (r.status === 404) {
        setMort(true);
        return;
      }
      if (r.status === 200 && r.json.statut === "connu") {
        const lu = lirePersonne(r.json, null);
        if (lu) {
          setIdentite({ prenom: lu.prenom, nom: null });
          setReconnu({ par: "email", surCeLien: lu.surCeLien });
          setPlace(lu.place);
          setEtatEmail({ etat: "connu", message: null });
          if (lu.accordAJour) {
            setAccord(true);
            moteur.definirAccord(VERSION_ACCORD);
          }
          return;
        }
      }
      if (r.status === 400) {
        setEtatEmail({ etat: "erreur", message: typeof r.json.message === "string" ? r.json.message : null });
        return;
      }
      if (r.status === 429) {
        dejaDemande.current = null;
        setEtatEmail({ etat: "erreur", message: tu ? "Trop d'essais. Réessaie dans une minute." : "Trop d'essais. Réessayez dans une minute." });
        return;
      }
      /* Inconnue, ou une coupure : on demande prénom et nom ; la création redira si l'adresse était connue. */
      setEtatEmail({ etat: "inconnu", message: null });
    }, 700);
    return () => clearTimeout(minuteur);
  }, [emailLu, repli, reconnu, token, p, tu, moteur]);

  const changerEmail = (valeur: string) => {
    setEmail(valeur);
    emailCourant.current = valeur;
    setErreur(null);
    setManque(null);
    if (etatEmail.etat === "erreur") setEtatEmail({ etat: "attente", message: null });
    /* L'adresse reconnue a changé : ce n'est plus elle (le téléphone sera rattaché à la bonne au choix des photos). */
    if (reconnu?.par === "email" && normaliserEmail(valeur) !== dejaDemande.current) {
      setIdentite(null);
      setReconnu(null);
      setEtatEmail({ etat: "attente", message: null });
      dejaDemande.current = null;
    }
  };

  /* « Ce n'est pas toi ? » : ce téléphone ne parle plus pour personne ; ses photos restent à son nom. */
  const pasMoi = async () => {
    const qui = identite;
    setErreur(null);
    const r = await oublier(token, p);
    if (r.status === 503) {
      setRepliForce(true);
      return;
    }
    if (r.status === 404) {
      setMort(true);
      return;
    }
    if (r.status !== 200) {
      setErreur(v("Connexion interrompue : réessayez.", "Connexion interrompue : réessaie."));
      return;
    }
    setOublie(qui?.prenom ?? null);
    setIdentite(null);
    setReconnu(null);
    setEmail("");
    emailCourant.current = "";
    dejaDemande.current = null;
    setEtatEmail({ etat: "attente", message: null });
    setPrenomSaisi("");
    setNomSaisi("");
    setAccord(false);
    moteur.definirAccord(null);
    setMode({ ecran: "carte", onglet: "album", accueil: false });
    window.scrollTo(0, 0);
  };

  /* Les photos choisies : présenter d'abord (une adresse nouvelle devient une personne), puis envoyer. */
  const choisir = async (fichiers: File[]) => {
    if (!fichiers.length || occupe.current) return;
    setErreur(null);
    let qui = identite;
    let enRepli = repli;
    if (!enRepli && !qui) {
      const adresse = normaliserEmail(email);
      const nomTape = nomComplet(prenomSaisi, nomSaisi);
      if (!adresse || !nomTape) return;
      occupe.current = true;
      const r = await presenter(token, p, adresse, prenomSaisi, nomSaisi);
      occupe.current = false;
      if (r.status === 503) {
        /* La migration manque : la règle d'avant, le nom tapé part avec les photos. */
        enRepli = true;
        setRepliForce(true);
      } else if (r.status === 404) {
        /* Le lien a été régénéré ou supprimé pendant que la page était ouverte. */
        setMort(true);
        return;
      } else if ((r.status === 200 || r.status === 201) && (r.json.statut === "cree" || r.json.statut === "connu")) {
        const lu = lirePersonne(r.json, nettoyerMorceau(nomSaisi));
        if (!lu) {
          setErreur(v("Échec. Réessayez.", "Échec. Réessaie."));
          return;
        }
        qui = { prenom: lu.prenom, nom: lu.nom };
        setIdentite(qui);
        setPlace(lu.place);
      } else {
        setErreur(
          typeof r.json.message === "string"
            ? r.json.message
            : r.status === 429
              ? v("Trop de demandes. Réessayez dans une minute.", "Trop de demandes. Réessaie dans une minute.")
              : r.status === 0
                ? v("Connexion perdue. Réessayez.", "Connexion perdue. Réessaie.")
                : v("Échec. Réessayez.", "Échec. Réessaie.")
        );
        return;
      }
    }
    let nomEnvoye: string | null;
    if (enRepli) {
      /* Le nom part avec les photos, puis il est FIGÉ sur ce téléphone. */
      nomEnvoye = nomFixe ?? nomComplet(prenomSaisi, nomSaisi);
      if (!nomEnvoye) return;
      garderPrenom(cle, nomEnvoye);
      setFige(nomEnvoye);
    } else {
      if (!qui) return;
      /* Aucune adresse ne part avec les photos : la personne est celle que CE téléphone représente
         (la présentation vient d'avoir lieu, ou ce téléphone parlait déjà pour elle). */
      nomEnvoye = qui.nom ? `${qui.prenom} ${qui.nom}` : qui.prenom;
    }
    moteur.definirDeposant(nomEnvoye);
    if (fichiers.length) moteur.ajouter(fichiers);
    setMode({ ecran: "album", onglet: "miennes", accueil: false });
    /* L'album s'ouvre par son en-tête : le bouton était en bas de la carte. */
    window.scrollTo(0, 0);
  };

  /* Le choix des photos ne finit plus en silence (iPhone, grande sélection : useSelecteur). */
  const selecteur = useSelecteur((f) => void choisir(f), { rechargement: true });
  const entree = (
    <>
      <input type="file" accept="image/*,.heic,.heif" multiple hidden {...selecteur.champ} />
      {selecteur.silence ? <p className="ec-dp-note ec-dp-note--refus" role="alert">{phraseSilence(selecteur.silence, tu)}</p> : null}
    </>
  );

  /* Un 404 : le lien a été régénéré ou supprimé pendant que la page était ouverte. */
  if (mort) return <CarteLienMort />;

  /* ── l'album (planches 7 et 8A) ── */
  if (mode.ecran === "album") {
    const quiAlbum: Qui | null = repli
      ? nomFixe
        ? { prenom: premierMot(nomFixe), nom: nettoyerMorceau(nomFixe).slice(premierMot(nomFixe).length).trim() || null }
        : null
      : identite;
    return (
      <>
        {entree}
        <Album
          token={token}
          p={p}
          tete={tete}
          qui={quiAlbum}
          pasMoi={!repli && identite ? () => void pasMoi() : null}
          personnes={!repli}
          moteur={moteur}
          ajouter={() => selecteur.ouvrir()}
          place={place}
          ongletInitial={mode.onglet}
          accueil={mode.accueil && identite ? { prenom: identite.prenom, surCeLien: props.moi?.surCeLien ?? 0 } : null}
          coupees={coupees}
        />
      </>
    );
  }

  /* ── la carte : se présenter, l'accord, choisir (planches 6, 8B, 8C) ── */
  const texte = texteAccord(VERSION_ACCORD, { evenement: tete.evenement, deOrganisation: deNom(tete.organisation), lien });
  const accordTexte = decouperAccord(texte ?? "", lien);
  const lireAdresse = lireIdentite({ email }, tu);

  /* Le bouton reste actif : au clic, le premier champ manquant prend le focus et dit son message à côté de lui. */
  const continuer = () => {
    let champ: ChampManquant | null = null;
    if (!repli && !identite && !emailLu) champ = "email";
    else if (!nomPret) champ = prenomSaisi.trim() ? "nom" : "prenom";
    else if (!accord) champ = "accord";
    if (champ) {
      setManque(champ);
      document.getElementById(`ec-dp-f-${champ}`)?.focus();
      return;
    }
    selecteur.ouvrir();
  };
  /* Entrée : le champ suivant, puis (au dernier) le même geste que le bouton. */
  const entrer = (suite: string | null) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (suite) document.getElementById(suite)?.focus();
    else continuer();
  };
  const messageEmail = manque === "email" ? (email.trim() && !lireAdresse.ok ? lireAdresse.message : messageManquant("email", tu)) : null;
  const messageNom = manque === "prenom" || manque === "nom" ? messageManquant(manque, tu) : null;
  const champsNom = (note: string) => (
    <div className="ec-dp-nom">
      <div className="ec-dp-duo">
        <label className="ec-dp-champ">
          <span>{v("Votre prénom", "Ton prénom")}</span>
          <input
            id="ec-dp-f-prenom"
            className="ec-dp-input"
            value={prenomSaisi}
            onChange={(e) => {
              setPrenomSaisi(e.target.value);
              setManque(null);
            }}
            onKeyDown={entrer("ec-dp-f-nom")}
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={NOM_MAX}
            required
          />
        </label>
        <label className="ec-dp-champ">
          <span>{v("Votre nom", "Ton nom")}</span>
          <input
            id="ec-dp-f-nom"
            className="ec-dp-input"
            value={nomSaisi}
            onChange={(e) => {
              setNomSaisi(e.target.value);
              setManque(null);
            }}
            onKeyDown={entrer(null)}
            autoComplete="family-name"
            autoCapitalize="words"
            enterKeyHint="go"
            maxLength={NOM_MAX}
            required
          />
        </label>
      </div>
      {messageNom ? (
        <p className="ec-dp-note ec-dp-note--refus" role="alert">
          {messageNom}
        </p>
      ) : note ? (
        <p className="ec-dp-note">{note}</p>
      ) : null}
    </div>
  );
  const limite = limiteDeCarte({ coupees, reconnu: Boolean(reconnu), place, plafond: props.plafond, sansPlafond: props.sansPlafond, tu });
  const dejaSurLien = reconnu ? phraseDejaSurLien(reconnu.surCeLien, lien) : "";
  /* Sans la migration : la formule d'avant (T-192), le nom donné une fois puis figé sur ce téléphone. */
  const formuleAvant = nomFixe ? (
    <div className="ec-dp-qui">
      <p>
        {v("Vous envoyez en tant que", "Tu envoies en tant que")} <strong>{nomFixe}</strong>
      </p>
      {props.dejaArrivees ? (
        <p className="ec-dp-note">
          {props.dejaArrivees} photo{props.dejaArrivees > 1 ? "s" : ""} déjà reçue{props.dejaArrivees > 1 ? "s" : ""} depuis cet appareil.
        </p>
      ) : null}
    </div>
  ) : (
    champsNom(v("Définitif : écrivez-le bien.", "Définitif : écris-le bien."))
  );

  return (
    <div className="ec-dp-carte">
      <div className="ec-dp-in">
        <TeteCarte tete={tete} />
        {oublie !== null && !repli ? (
          <p className="ec-dp-info">
            <IcoTelephone />
            <span>
              {oublie ? (
                <>
                  Cet appareil n&apos;envoie plus au nom de <b>{oublie}</b>.
                </>
              ) : (
                "Cet appareil n'envoie plus au nom de personne."
              )}
            </span>
          </p>
        ) : props.invitationEcrite ? (
          <p className="ec-dp-texte">{props.invitation}</p>
        ) : null}

        <div className="ec-dp-form">
          {repli ? (
            formuleAvant
          ) : (
            <>
              {reconnu?.par === "telephone" ? null : (
                <label className="ec-dp-champ">
                  <span>{v("Votre email", "Ton email")}</span>
                  <input
                    id="ec-dp-f-email"
                    className={`ec-dp-input${etatEmail.etat === "connu" ? " ec-dp-input--actif" : ""}`}
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => changerEmail(e.target.value)}
                    onBlur={() => {
                      if (email.trim() && !lireAdresse.ok) setEtatEmail({ etat: "erreur", message: lireAdresse.message });
                    }}
                    onKeyDown={entrer(reconnu ? "ec-dp-f-accord" : "ec-dp-f-prenom")}
                    placeholder="prenom.nom@exemple.fr"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    maxLength={EMAIL_MAX}
                    aria-describedby="ec-dp-email-note"
                    required
                  />
                </label>
              )}
              {reconnu ? null : (
                <p className="ec-dp-note" id="ec-dp-email-note">
                  {messageEmail ? (
                    <span className="ec-dp-note--refus" role="alert">
                      {messageEmail}
                    </span>
                  ) : etatEmail.etat === "erreur" && etatEmail.message ? (
                    <span className="ec-dp-note--refus">{etatEmail.message}</span>
                  ) : (
                    v("Pour vous reconnaître. Seul le prénom se voit.", "Pour te reconnaître. Seul le prénom se voit.")
                  )}
                </p>
              )}
              {reconnu && identite ? (
                <>
                  <div className="ec-dp-reconnu" role="status">
                    <span className="ec-dp-reconnu-ini" aria-hidden="true">
                      {initiales(identite.prenom)}
                    </span>
                    <span>
                      <b>{v(`Content de vous revoir, ${identite.prenom}`, `Content de te revoir, ${identite.prenom}`)}</b>
                      {dejaSurLien ? <span>{dejaSurLien}</span> : null}
                    </span>
                  </div>
                  <button type="button" className="ec-dp-lien ec-dp-lien--doux" onClick={() => void pasMoi()}>
                    {libellePasMoi(tu)}
                  </button>
                </>
              ) : (
                champsNom("")
              )}
            </>
          )}

          <label className="ec-dp-accord">
            <input
              id="ec-dp-f-accord"
              type="checkbox"
              checked={accord}
              onChange={(e) => {
                setAccord(e.target.checked);
                setManque(null);
                moteur.definirAccord(e.target.checked ? VERSION_ACCORD : null);
              }}
            />
            {/* Le texte LÉGAL, tel que `texteAccord` le rend ; seule la phrase de l'album est encadrée. */}
            <span>
              {accordTexte.principal}
              {accordTexte.album ? <span className="ec-dp-accord-album">{accordTexte.album}</span> : null}
            </span>
          </label>
          {manque === "accord" ? (
            <p className="ec-dp-note ec-dp-note--refus" role="alert">
              {messageManquant("accord", tu)}
            </p>
          ) : null}

          {coupees ? (
            <p className="ec-dp-note ec-dp-note--refus" role="status">
              {ligneReste(coupees, place, tu)}
            </p>
          ) : null}
          {entree}
          <button type="button" className="ec-dp-bouton" onClick={continuer} aria-busy={!pret} data-attente={pret ? undefined : ""}>
            <IcoAppareil />
            {coupees ? BOUTON_REPRENDRE : "Choisir mes photos"}
          </button>
          {erreur ? <p className="ec-dp-note ec-dp-note--refus">{erreur}</p> : null}

          <p className="ec-dp-pied">{piedDeCarte(PHOTOS_SEULEMENT.replace(/\.$/, ""), limite, props.cloture)}</p>
        </div>
      </div>
    </div>
  );
}
