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
import { cleDeVisite, decouperAccord, initiales, phraseRetour } from "@/lib/collectif/depotParticipant";
import { deNom } from "@/lib/collectif/espace";
import { NOM_MAX, nettoyerMorceau, nomComplet, premierMot } from "@/lib/collectif/participant";
import { EMAIL_MAX, lireIdentite, normaliserEmail } from "@/lib/collectif/personnes";
import { MoteurDepot } from "../../edition/_composants/depot/moteur";
import { phraseSilence, useSelecteur } from "../../edition/_composants/depot/useSelecteur";
import Album, { type Onglet, type Tete } from "./Album";
import { lirePersonne, oublier, presenter } from "./appels";
import { TeteCarte } from "./Etats";
import { IcoAppareil, IcoSansVideo, IcoTelephone } from "./icones";
import { CarteLienMort } from "./LienMort";

type Props = {
  token: string;
  p: string | null;
  tete: Tete;
  /** Le message d'accueil de l'édition (ou la phrase par défaut, au registre). */
  invitation: string;
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
  const [mode, setMode] = useState<{ ecran: "carte" | "album"; onglet: Onglet; accueil: boolean }>(
    props.moi?.accordAJour ? { ecran: "album", onglet: "album", accueil: true } : { ecran: "carte", onglet: "album", accueil: false }
  );

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
        setEtatEmail({ etat: "erreur", message: tu ? "Trop d'adresses essayées : réessaie dans une minute." : "Trop d'adresses essayées : réessayez dans une minute." });
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
          setErreur(v("La présentation n'a pas abouti : réessayez.", "La présentation n'a pas abouti : réessaie."));
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
              ? v("Trop de demandes en même temps : vos photos ne sont pas parties. Réessayez dans une minute.", "Trop de demandes en même temps : tes photos ne sont pas parties. Réessaie dans une minute.")
              : r.status === 0
                ? v("Connexion interrompue : vos photos ne sont pas parties. Réessayez.", "Connexion interrompue : tes photos ne sont pas parties. Réessaie.")
                : v("La présentation n'a pas abouti : réessayez.", "La présentation n'a pas abouti : réessaie.")
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
        />
      </>
    );
  }

  /* ── la carte : se présenter, l'accord, choisir (planches 6, 8B, 8C) ── */
  const texte = texteAccord(VERSION_ACCORD, { evenement: tete.evenement, deOrganisation: deNom(tete.organisation), lien });
  const accordTexte = decouperAccord(texte ?? "", lien);
  const albumPhrase = lien
    ? `Elles rejoignent l'album de ${lien}, que voient les personnes de ce lien, et l'atelier en fait le magazine.`
    : "Elles rejoignent l'album de ce lien, que voient les personnes qui l'utilisent, et l'atelier en fait le magazine.";
  const lireAdresse = lireIdentite({ email }, tu);
  /* Sans la migration : la formule d'avant (T-192), le nom donné une fois puis figé sur ce téléphone. */
  const formuleAvant = (
    <>
      {nomFixe ? (
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
        <div className="ec-dp-nom">
          <div className="ec-dp-duo">
            <label className="ec-dp-champ">
              <span>{v("Votre prénom", "Ton prénom")}</span>
              <input className="ec-dp-input" value={prenomSaisi} onChange={(e) => setPrenomSaisi(e.target.value)} autoComplete="given-name" autoCapitalize="words" maxLength={NOM_MAX} required />
            </label>
            <label className="ec-dp-champ">
              <span>{v("Votre nom", "Ton nom")}</span>
              <input className="ec-dp-input" value={nomSaisi} onChange={(e) => setNomSaisi(e.target.value)} autoComplete="family-name" autoCapitalize="words" maxLength={NOM_MAX} required />
            </label>
          </div>
          <p className="ec-dp-note">
            {v(
              "Pour que l'organisateur sache de qui viennent les photos. Écrivez-le bien : il ne se change plus ensuite.",
              "Pour que l'organisateur sache de qui viennent les photos. Écris-le bien : il ne se change plus ensuite."
            )}
          </p>
        </div>
      )}
    </>
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
                  Cet appareil n&apos;envoie plus au nom de <b>{oublie}</b>. Ses photos restent à son nom.
                </>
              ) : (
                "Cet appareil n'envoie plus au nom de personne. Les photos déjà envoyées restent à leur nom."
              )}
            </span>
          </p>
        ) : (
          <p className="ec-dp-texte">{reconnu ? props.invitation : `${props.invitation} ${albumPhrase}`}</p>
        )}

        <div className="ec-dp-form">
          {repli ? (
            formuleAvant
          ) : (
            <>
              {reconnu?.par === "telephone" ? null : (
                <label className="ec-dp-champ">
                  <span>{v("Votre email", "Ton email")}</span>
                  <input
                    className={`ec-dp-input${etatEmail.etat === "connu" ? " ec-dp-input--actif" : ""}`}
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => changerEmail(e.target.value)}
                    onBlur={() => {
                      if (email.trim() && !lireAdresse.ok) setEtatEmail({ etat: "erreur", message: lireAdresse.message });
                    }}
                    placeholder="prenom.nom@exemple.fr"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={EMAIL_MAX}
                    aria-describedby="ec-dp-email-note"
                    required
                  />
                </label>
              )}
              {reconnu ? null : (
                <p className="ec-dp-note" id="ec-dp-email-note">
                  {etatEmail.etat === "erreur" && etatEmail.message ? (
                    <span className="ec-dp-note--refus">{etatEmail.message}</span>
                  ) : (
                    v(
                      "L'adresse est nécessaire pour choisir vos photos. Elle sert seulement à vous reconnaître sur un autre appareil ou un autre lien. Nous ne vous écrirons pas pour autre chose.",
                      "L'adresse est nécessaire pour choisir tes photos. Elle sert seulement à te reconnaître sur un autre appareil ou un autre lien. Nous ne t'écrirons pas pour autre chose."
                    )
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
                      {/* Ce qui est sur CE lien et ce qui reste (21/10), plus le total de l'édition. */}
                      <span>
                        {[phraseRetour(reconnu.surCeLien, place, lien, tu), v(`Vous envoyez en tant que ${identite.prenom}.`, `Tu envoies en tant que ${identite.prenom}.`)].filter(Boolean).join(" ")}
                      </span>
                    </span>
                  </div>
                  <button type="button" className="ec-dp-lien ec-dp-lien--doux" onClick={() => void pasMoi()}>
                    Ce n&apos;est pas moi
                  </button>
                </>
              ) : (
                <div className="ec-dp-nom">
                  <div className="ec-dp-duo">
                    <label className="ec-dp-champ">
                      <span>{v("Votre prénom", "Ton prénom")}</span>
                      <input className="ec-dp-input" value={prenomSaisi} onChange={(e) => setPrenomSaisi(e.target.value)} autoComplete="given-name" autoCapitalize="words" maxLength={NOM_MAX} required />
                    </label>
                    <label className="ec-dp-champ">
                      <span>{v("Votre nom", "Ton nom")}</span>
                      <input className="ec-dp-input" value={nomSaisi} onChange={(e) => setNomSaisi(e.target.value)} autoComplete="family-name" autoCapitalize="words" maxLength={NOM_MAX} required />
                    </label>
                  </div>
                  <p className="ec-dp-note">
                    {lien
                      ? v(`C'est votre prénom que verront les personnes de ${lien}.`, `C'est ton prénom que verront les personnes de ${lien}.`)
                      : v("C'est votre prénom que verront les personnes de ce lien.", "C'est ton prénom que verront les personnes de ce lien.")}
                  </p>
                </div>
              )}
            </>
          )}

          <label className="ec-dp-accord">
            <input
              type="checkbox"
              checked={accord}
              onChange={(e) => {
                setAccord(e.target.checked);
                moteur.definirAccord(e.target.checked ? VERSION_ACCORD : null);
              }}
            />
            {/* Le texte LÉGAL, tel que `texteAccord` le rend ; seule la phrase de l'album est encadrée. */}
            <span>
              {accordTexte.principal}
              {accordTexte.album ? <span className="ec-dp-accord-album">{accordTexte.album}</span> : null}
            </span>
          </label>

          <p className="ec-dp-videos">
            <IcoSansVideo />
            <span>{PHOTOS_SEULEMENT}</span>
          </p>
          {entree}
          <button type="button" className="ec-dp-bouton" disabled={!accord || !nomPret} onClick={() => selecteur.ouvrir()}>
            <IcoAppareil />
            Choisir mes photos
          </button>
          {erreur ? <p className="ec-dp-note ec-dp-note--refus">{erreur}</p> : null}
          {!nomPret ? (
            <p className="ec-dp-note">
              {repli
                ? v("Indiquez votre prénom et votre nom pour choisir vos photos.", "Indique ton prénom et ton nom pour choisir tes photos.")
                : !emailLu
                  ? v("Indiquez votre email pour choisir vos photos.", "Indique ton email pour choisir tes photos.")
                  : v("Indiquez votre prénom et votre nom pour choisir vos photos.", "Indique ton prénom et ton nom pour choisir tes photos.")}
            </p>
          ) : !accord ? (
            <p className="ec-dp-note">{v("Cochez l'accord pour choisir vos photos.", "Coche l'accord pour choisir tes photos.")}</p>
          ) : null}

          <p className="ec-dp-pied">
            {props.sansPlafond
              ? "Sans plafond par personne"
              : props.plafond
                ? `${props.plafond} photos au plus par personne`
                : "Le nombre de photos par personne n'est pas encore réglé"}
            {props.cloture ? ` · dépôt ouvert jusqu'au ${props.cloture}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
