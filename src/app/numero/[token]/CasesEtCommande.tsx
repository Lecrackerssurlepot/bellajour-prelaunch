'use client'

/**
 * Les deux cases et le bouton de commande — état 2 (PRD §8, invariant nº3).
 *
 * « Aucun paiement possible sans les deux cases cochées et horodatées. »
 * Elles sont donc écrites EN BASE au clic, pas seulement dans le composant :
 * une case qui ne vit que dans le navigateur ne prouve rien le jour où une
 * cliente conteste la fabrication d'un bien personnalisé.
 *
 * LA SECONDE CASE relève de l'article 17.º, nº 1, alinéa c), du DL 24/2014 —
 * droit PORTUGAIS, le vendeur étant établi à Lisbonne et les CGV désignant ce
 * droit. (Le PRD §8 citait l'article L221-28 3° français : même règle
 * européenne, directive 2011/83/UE, mais ce n'est pas notre texte applicable.)
 *
 * ⚠️ ELLE NE FAIT PAS RENONCER ICI. L'article 8.3 des CGV fixe l'extinction du
 * droit de rétractation à la VALIDATION DE LA MAQUETTE — état 4, pas état 2.
 * Le libellé précédent (« la fabrication démarre immédiatement ») était donc
 * faux deux fois : rien ne part en fabrication au paiement, on compose d'abord
 * la maquette ; et la renonciation ne mordait pas encore. Ce qui est recueilli
 * ici est l'information préalable exigée par l'article 8.5 — sans laquelle
 * l'exception ne serait pas opposable du tout. Jusqu'à la validation, la
 * cliente garde droit au remboursement intégral (CGV art. 4bis.9 et 8.2).
 *
 * Si l'enregistrement échoue, la case revient à sa position précédente. Une
 * case cochée à l'écran mais absente en base est le pire des deux mondes :
 * le paiement serait refusé plus loin sans que personne ne comprenne pourquoi.
 *
 * Le montant affiché ici DESCEND DU SERVEUR, calculé depuis le nombre de pages
 * (invariant nº2). Il n'est jamais renvoyé au serveur : /api/atelier/checkout
 * ne reçoit que le token et rechoisit le prix lui-même.
 */

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formaterCentimes } from '@/lib/atelier/prix'
/* `pays.ts` est PUR et sans montant : la liste des pays a précisément
   déménagé là pour pouvoir descendre dans le navigateur (cf. son en-tête).
   `PAYS_TRIES` est l'ordre des menus : France, Belgique, Luxembourg, Suisse,
   puis l'Europe par ordre alphabétique. */
import { PAYS_LIBELLE, PAYS_TRIES, PAYS_DEFAUT, paysValide } from '@/lib/atelier/pays'
/* `HORS_UE` ne porte aucun montant non plus : c'est la liste des trois
   destinations hors Union, et elle sert à DIRE les droits de douane avant le
   paiement plutôt qu'à les découvrir à la livraison. */
import { HORS_UE } from '@/lib/atelier/livraison'
import FeuilleAjustement from './FeuilleAjustement'

type Props = {
  token: string
  nbPages: number | null
  euros: number | null
  /* ── LA LIVRAISON, FACTURÉE EN SUS (lot 6, 10/09/2026) ──────────────
     Le port TTC gelé sur le dossier au devis, en centimes, et sa destination.
     `null` = pas encore chiffré : le bon de commande ne montre alors AUCUN
     prix et le bouton reste inerte, parce que le checkout refuserait
     (`livraison_indisponible`). Un total affiché que Stripe ne demandera pas
     est pire qu'un total absent. */
  livraisonCentimes: number | null
  pays: string | null
  /* ── LE PRIX DU MAGAZINE, SEUL (11/09/2026) ──────────────────────────
     `commande` est nul tant que le port n'est pas chiffré : sans ce prix-là,
     le bon de commande ne pourrait rien montrer du tout à quelqu'un à qui
     l'on demande justement de choisir son pays. Il vient du serveur comme
     tout le reste (`centimesDuDossier`), il n'est jamais additionné ici. */
  prixCentimes: number | null
  /* Le décompte, calculé PAR LE SERVEUR (`totalCommande`, livraison.ts) : ce
     composant n'additionne rien, il met en forme. Même invariant que le prix
     depuis toujours. */
  commande: { prix: number; livraison: number; remise: number; total: number } | null
  /** Un fondateur ne paie ni son crédit ni son port. Décidé côté serveur. */
  portOffert: boolean
  cgvOk: boolean
  renonciation: boolean
  /* T2-8 — les deux temps de la promesse, calculés par la page depuis
     DELAIS et JOURS_LIVRAISON (urgence.ts) : jamais de chiffre en dur ici,
     ce sont les délais que l'admin surveille déjà. */
  joursComposition: number
  joursLivraison: number
  /* ── L'ATELIER REGARDE LA PAGE AVANT DE LA PUBLIER (10/09/2026) ──────
     Tout ce qui écrit ou encaisse est alors DÉSARMÉ, à la source et pas
     seulement à l'écran : la page est celle d'un dossier réel, et un clic
     de contrôle ne doit ni ouvrir une session Stripe, ni cocher une case en
     base au nom du client, ni déposer une demande d'ajustement. */
  previsualisation?: boolean
}

export default function CasesEtCommande({
  token, nbPages, euros, livraisonCentimes, pays, prixCentimes, commande, portOffert,
  cgvOk, renonciation, joursComposition, joursLivraison, previsualisation = false,
}: Props) {
  const router = useRouter()
  const [cgv, setCgv] = useState(cgvOk)
  const [reno, setReno] = useState(renonciation)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [confirmer, setConfirmer] = useState(false)
  const [feuille, setFeuille] = useState(false)

  const enregistrer = useCallback(
    async (champ: 'cgv_ok' | 'renonciation_retractation', valeur: boolean) => {
      const poser = champ === 'cgv_ok' ? setCgv : setReno
      poser(valeur)
      setErreur(null)
      /* En prévisualisation la case bouge à l'écran et RIEN ne part : une
         coche enregistrée ici serait un consentement écrit par l'atelier au
         nom du client, exactement ce que l'invariant nº3 interdit. */
      if (previsualisation) return
      try {
        const r = await fetch('/api/atelier/numero', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, [champ]: valeur }),
        })
        if (!r.ok) throw new Error('patch')
      } catch {
        poser(!valeur)
        setErreur('Votre accord n’a pas pu être enregistré. Réessayez dans un instant.')
      }
    },
    [token, previsualisation]
  )

  const commander = useCallback(async () => {
    /* Ceinture : le bouton est déjà désactivé, mais un raccourci clavier ou
       un rendu futur ne doit pas pouvoir ouvrir une caisse depuis ici. */
    if (previsualisation) return
    setOccupe(true)
    setErreur(null)
    try {
      /* Le navigateur n'envoie que le token : ni prix, ni palier, ni pages.
         Le serveur relit la ligne, revérifie les deux cases et choisit le
         price_id lui-même. */
      const r = await fetch('/api/atelier/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = (await r.json().catch(() => ({}))) as { url?: string }
      if (!r.ok || !data.url) throw new Error('checkout')
      window.location.href = data.url
    } catch {
      setErreur(
        'Le paiement n’a pas pu démarrer. Répondez au mail de votre couverture, on s’en occupe.'
      )
      setOccupe(false)
    }
  }, [token, previsualisation])

  /* ⚠️ « CONNU » VEUT DIRE LES DEUX. Depuis que la livraison se facture à
     part, un prix de magazine sans port n'est pas un prix : la cliente
     lirait 37 € et Stripe en demanderait 48. Tant que le port n'est pas
     chiffré, le bouton reste inerte — le checkout refuserait de toute façon
     (`livraison_indisponible`). */
  /* ⚠️ ET « CONNU » VEUT DIRE TROIS, DEPUIS LE 11/09 : le pays en fait partie.
     Un dossier peut porter un port gelé sans destination (montant saisi à la
     main à la publication) : ce port a été chiffré pour un pays que personne
     n'a écrit, alors que Stripe, lui, laissera choisir n'importe lequel de la
     zone. On demande donc la destination avant d'encaisser, plutôt que
     d'expédier vers un pays dont le transport n'a pas été payé. */
  const prixConnu =
    euros !== null && livraisonCentimes !== null && commande !== null && paysValide(pays)
  const accepte = cgv && reno

  /* ══════════════════════════════════════════════════════════════════════
     LE CLIENT CHOISIT SA DESTINATION (11/09/2026)

     ⚠️ C'EST DÉSORMAIS LE SEUL ENDROIT OÙ LA QUESTION SE POSE. Le
     questionnaire l'a portée du 10 au 11/09 (un select à l'écran 4) ; Mathias
     l'en a retirée : « je ne veux pas que ce soit compliqué au niveau de la
     livraison ». Deux populations arrivent donc ici, et elles ne voient pas
     la même chose :
       — celle dont le dossier porte déjà un pays (l'atelier le connaissait
         et l'a posé à la publication, ou le client l'a choisi ici lors d'une
         visite précédente) : le port est devisé, le bon de commande est
         complet. Elle garde quand même la main : « Changer de pays » rouvre
         le menu, et le port est REdevisé. Un port gelé sur la mauvaise
         destination est un colis qui n'arrive pas ;
       — celle dont le dossier n'a aucun pays, ce qui est désormais le cas
         NORMAL : c'est elle qui choisit, ici, et le port est chiffré à cet
         instant, AVANT le paiement. Le bouton reste éteint jusque-là, et il
         dit pourquoi : un bouton mort sans explication se lit comme une
         panne.

     Rien n'est calculé dans ce composant : il envoie un code pays, le serveur
     devise chez l'imprimeur, écrit, et la page se recharge avec le montant. */
  const paysGele = paysValide(pays) ? pays : null
  const portConnu = paysGele !== null && livraisonCentimes !== null
  /* Le magazine est chiffré même quand le port ne l'est pas : on peut donc
     montrer un bon de commande partiel plutôt qu'une page muette. */
  const magazineConnu = nbPages !== null && (commande !== null || prixCentimes !== null)
  const [choixPays, setChoixPays] = useState<string>(paysGele ?? PAYS_DEFAUT)
  const [changer, setChanger] = useState(false)
  const [calcul, setCalcul] = useState(false)
  /* Le menu s'affiche à la place de la ligne « Livraison » tant que rien
     n'est chiffré, et à la demande ensuite. */
  const choixOuvert = !portConnu || changer
  const douane = paysGele !== null && HORS_UE.includes(paysGele)

  const calculerLivraison = useCallback(async () => {
    /* Même désarmement que le paiement et les cases : en prévisualisation,
       l'atelier REGARDE la page du client, il n'écrit pas à sa place. */
    if (previsualisation || calcul) return
    setCalcul(true)
    setErreur(null)
    try {
      const r = await fetch('/api/atelier/livraison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, pays: choixPays }),
      })
      if (!r.ok) throw new Error('devis')
      setChanger(false)
      /* La page est SERVEUR : elle relit la ligne, recalcule le total par
         `totalCommande` et redescend les props. On ne recopie pas le montant
         rendu par la route dans un état local — ce serait une seconde vérité,
         et c'est exactement ce que l'invariant du prix interdit. */
      router.refresh()
    } catch {
      setErreur(
        'Nous n’avons pas pu chiffrer la livraison. Réessayez dans un instant, ou répondez au mail de votre couverture.'
      )
    } finally {
      setCalcul(false)
    }
  }, [token, choixPays, previsualisation, calcul, router])

  /* T2 — refonte mobile (02/09) : sous la visionneuse, l'écran reste dégagé —
     le prix et « Commander », rien d'autre. Les deux accords obligatoires sont
     RÉVÉLÉS au tap, de façon compacte, avant le paiement (ils restent cochés ET
     enregistrés en base avant tout checkout : le serveur les revérifie de son
     côté). Une cliente qui a déjà accepté (retour sur la page) paie d'un seul
     geste. */
  const onCommander = useCallback(() => {
    setErreur(null)
    if (previsualisation || !prixConnu || occupe) return
    if (accepte) void commander()
    else setConfirmer(true)
  }, [accepte, prixConnu, occupe, commander, previsualisation])

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════
          LE BON DE COMMANDE — 08/09/2026.

          Ce qui était là avant : un encart de verre dépoli portant
          « IMPRESSION ET FAÇONNAGE COMPRIS » en capitales de 11 px, puis
          « 32 pages · 35 € » où le nombre de pages et le montant avaient
          EXACTEMENT le même corps, et un bouton qui disait « Commander »
          sans le prix.

          Trois défauts, et le même en trois endroits : au moment où l'on
          engage de l'argent, ce qui doit dominer, c'est le montant.
            — le premier mot lu décrivait un procédé industriel plutôt que
              ce qu'on achète ;
            — le total ne se distinguait pas du nombre de pages ;
            — le montant n'était pas sur le geste qui l'engage.

          Ce qui le remplace énonce une commande : ce qu'on prend, ligne à
          ligne, puis un total qui domine. Rien n'a changé dans le calcul —
          `euros` vient toujours du serveur, jamais du navigateur. */}
      {magazineConnu ? (
        <div className="nu-bon">
          <div className="nu-bon-l">
            <span>Votre numéro, {nbPages} pages</span>
            <b>{formaterCentimes(commande ? commande.prix : prixCentimes ?? 0)}</b>
          </div>
          <div className="nu-bon-l">
            <span>Impression et façonnage</span>
            <b>compris</b>
          </div>
          {/* ── LA LIVRAISON, EN SUS (lot 6, 10/09/2026) ──
              Elle a sa ligne, toujours, même offerte : « compris » ne se dit
              plus, le port est devisé par destination et son montant doit se
              lire AVANT le clic. Une ligne absente ne dit rien ; une ligne à
              « offerte » dit quelque chose.
              ⚠️ Depuis le 11/09, quand la destination n'est pas connue, cette
              ligne devient LA QUESTION : un menu et un bouton, à l'endroit
              exact où le montant s'affichera. */}
          {paysGele !== null && livraisonCentimes !== null && commande && !choixOuvert ? (
            <div className="nu-bon-l">
              <span>
                Livraison en {PAYS_LIBELLE[paysGele]}
                {/* La sortie de secours, discrète et à sa place : le pays
                    décide du port, s'il est faux tout le bon l'est. On ne
                    renvoie plus vers un mail (l'atelier devait alors le faire
                    à la main) : le client rouvre le menu et on redevise. */}
                <button
                  type="button"
                  className="nu-bon-changer"
                  onClick={() => setChanger(true)}
                  disabled={previsualisation}
                >
                  Changer de pays
                </button>
              </span>
              <b>{portOffert ? 'offerte, fondateur' : formaterCentimes(commande.livraison)}</b>
            </div>
          ) : (
            <div className="nu-bon-choix">
              <label className="nu-bon-choix-lbl" htmlFor="nu-pays">
                Pays de livraison
              </label>
              <div className="nu-bon-choix-l">
                <select
                  id="nu-pays"
                  className="nu-select"
                  value={choixPays}
                  onChange={(e) => setChoixPays(e.target.value)}
                  disabled={previsualisation || calcul}
                  autoComplete="country"
                >
                  {PAYS_TRIES.map((code) => (
                    <option key={code} value={code}>{PAYS_LIBELLE[code]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="nu-bon-calc"
                  onClick={() => void calculerLivraison()}
                  disabled={previsualisation || calcul}
                  title={previsualisation ? 'Prévisualisation' : undefined}
                >
                  {calcul ? 'Un instant…' : 'Calculer la livraison'}
                </button>
              </div>
              {/* Ce que le menu engage, dit ici et pas après le paiement. */}
              <p className="nu-bon-choix-mot">
                {portConnu
                  ? 'Le port sera chiffré de nouveau pour cette destination.'
                  : 'Le port est chiffré par notre imprimeur, avant tout paiement.'}
              </p>
              {paysGele !== null && changer ? (
                <button
                  type="button"
                  className="nu-bon-changer nu-bon-changer--annule"
                  onClick={() => { setChanger(false); setChoixPays(paysGele) }}
                >
                  Garder {PAYS_LIBELLE[paysGele]}
                </button>
              ) : null}
            </div>
          )}
          {/* Le crédit de prévente, quand il est dû. Signe MOINS (U+2212), pas
              un tiret : « −30 € » se lit comme un montant retiré, « -30 € »
              avec un trait d'union se lit comme une coquille. */}
          {commande && commande.remise > 0 ? (
            <div className="nu-bon-l">
              <span>Crédit fondateur</span>
              <b>&minus;{formaterCentimes(commande.remise)}</b>
            </div>
          ) : null}
          {/* ⚠️ PAS DE TOTAL TANT QUE LE PORT MANQUE. Un total qui n'inclut
              pas la livraison est un total faux, et c'est la surprise la plus
              chère de tout le tunnel. */}
          {commande && portConnu ? (
            <div className="nu-bon-t">
              <span>À payer</span>
              <b>{formaterCentimes(commande.total)}</b>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="nu-bon">
          <div className="nu-bon-l">
            <span>Votre numéro est en cours de chiffrage.</span>
          </div>
        </div>
      )}

      {/* ── HORS UNION EUROPÉENNE ──
          Royaume-Uni, Suisse, Norvège : le transport est devisé et facturé,
          mais les droits d'importation, eux, sont réclamés au destinataire à
          l'arrivée. Le dire ici coûte une ligne ; ne pas le dire coûte un
          client qui découvre une facture de douane devant sa porte. */}
      {douane ? (
        <p className="nu-bon-note">Droits de douane éventuels à votre charge.</p>
      ) : null}

      {/* ── LA PROMESSE PASSE AVANT LE GESTE ──
          Les deux délais vivaient SOUS le bouton, en gris de 15 px. C'est
          pourtant ce qui fait appuyer : on paie un objet qu'on n'a pas encore.
          Les mêmes mots, dans le même ordre — composition, puis livraison
          après validation — mais au-dessus, et en deux lignes qu'on lit d'un
          coup d'œil au lieu d'un paragraphe qu'on saute. */}
      {/* La destination n'a plus besoin d'être redite ici : depuis le
          11/09/2026 elle est DANS le bon de commande, sur la ligne du port,
          avec « Changer de pays » à côté. Le paragraphe qui renvoyait au mail
          (« un autre pays ? répondez ») a disparu AVEC sa cause : le client
          n'a plus à écrire à l'atelier pour changer de destination, il le
          fait lui-même et le port est redevisé. */}

      {prixConnu ? (
        <ul className="nu-promesse">
          <li>
            <i aria-hidden="true" />
            <span>Votre numéro complet <b>sous {joursComposition} jours ouvrés</b></span>
          </li>
          <li>
            <i aria-hidden="true" />
            <span>Chez vous <b>sous {joursLivraison} jours</b> après votre validation</span>
          </li>
        </ul>
      ) : magazineConnu ? (
        /* Le bouton est éteint et il DIT pourquoi : sans destination, il n'y a
           pas de total, et un bouton mort sans explication se lit comme une
           panne — sur le bouton qui encaisse. */
        <p className="nu-prix-sub">Choisissez votre pays pour connaître la livraison.</p>
      ) : (
        <p className="nu-prix-sub">Le prix vous sera confirmé par mail, avant tout paiement.</p>
      )}

      <button
        type="button"
        className="nu-order nu-order--plein"
        onClick={confirmer ? () => void commander() : onCommander}
        disabled={previsualisation || occupe || !prixConnu || (confirmer && !accepte)}
        /* Le mot dit POURQUOI le bouton ne répond pas : un bouton éteint sans
           explication se lit comme une panne, et c'est le bouton qui encaisse. */
        title={previsualisation ? 'Prévisualisation' : undefined}
      >
        {/* Le montant est SUR le bouton dès le premier temps. Il n'y était
            qu'au second (« Payer 35 € ») : on demandait donc de cliquer
            « Commander » en allant chercher le prix ailleurs sur l'écran. */}
        {/* LE TOTAL, pas le prix du magazine : c'est ce qui sera débité, port
            compris et crédit déduit. Afficher 37 € sur un bouton qui en
            prélève 48 est la surprise qui coûte le plus cher de tout le
            tunnel. */}
        {/* ⚠️ LE MONTANT NE S'AFFICHE QUE S'IL EST COMPLET. Un dossier au port
            gelé sans destination a bien un `commande` calculable, mais ce
            total-là n'est pas celui qu'on encaissera tant que le pays n'est
            pas choisi : l'écrire sur un bouton éteint promettrait un prix
            qu'on va rechiffrer. */}
        {occupe
          ? 'Un instant…'
          : confirmer
            ? `Payer${prixConnu && commande ? ` ${formaterCentimes(commande.total)}` : ''}`
            : `Commander${prixConnu && commande ? ` · ${formaterCentimes(commande.total)}` : ''}`}
      </button>

      {/* Ce qui vient après le clic, dit avant. Deux accords, pas une
          surprise : le panneau qui s'ouvre plus bas ne doit pas donner
          l'impression qu'une étape s'ajoute au dernier moment. */}
      {!confirmer && prixConnu && (
        <p className="nu-accords-mot">Deux accords à cocher avant le paiement.</p>
      )}

      {/* Révélé au tap sur « Commander », directement sous l'encart. Replié, il
          ne prend aucune place et n'est pas focusable (tabIndex -1). Le texte
          des cases est INCHANGÉ — il porte l'information légale de l'art. 8.5. */}
      <div className={`nu-confirmer${confirmer ? ' is-open' : ''}`} aria-hidden={!confirmer}>
       <div className="nu-confirmer-inner">
        <p className="nu-confirmer-titre">Deux accords, puis le paiement.</p>
        <div className="nu-cases">
          <label className="nu-check">
            <input
              type="checkbox"
              checked={cgv}
              onChange={(e) => enregistrer('cgv_ok', e.target.checked)}
              tabIndex={confirmer ? 0 : -1}
            />
            <span>
              J’accepte les{' '}
              <a className="nu-lien" href="/cgv" target="_blank" rel="noopener noreferrer">
                conditions générales de vente
              </a>
              .
            </span>
          </label>

          <label className="nu-check">
            <input
              type="checkbox"
              checked={reno}
              onChange={(e) => enregistrer('renonciation_retractation', e.target.checked)}
              tabIndex={confirmer ? 0 : -1}
            />
            <span>
              Je reconnais que ce numéro est personnalisé et que mon droit de
              rétractation s’éteindra au moment où je validerai la maquette.
              Jusque-là, je peux demander le remboursement intégral.
            </span>
          </label>
        </div>
       </div>
      </div>

      {confirmer && !accepte && (
        <p className="nu-confirmer-aide">Cochez les deux accords pour continuer.</p>
      )}

      {/* T2-8 — la promesse en deux temps a REMONTÉ au-dessus du bouton
          (08/09/2026). Elle ne se répète pas ici : c'est ce qui décide, pas
          une note de bas de page. Voir `.nu-promesse` plus haut. */}

      {erreur && <p className="nu-erreur" role="alert">{erreur}</p>}

      {/* T-091 — la porte de sortie douce : plus « répondez au mail », mais une
          feuille d'ajustement en deux gestes, sans écrire de mail. */}
      {/* Elle POSTE une demande d'ajustement au journal du dossier : éteinte
          en prévisualisation, au même titre que le paiement. */}
      <button
        type="button"
        className="nu-ajuster"
        onClick={() => setFeuille(true)}
        disabled={previsualisation}
        title={previsualisation ? 'Prévisualisation' : undefined}
      >
        Ce n’est pas tout à fait ça&nbsp;? Dites-le-nous.
      </button>

      <FeuilleAjustement token={token} ouvert={feuille} onFermer={() => setFeuille(false)} />
    </>
  )
}
