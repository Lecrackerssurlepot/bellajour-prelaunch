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
import { formaterCentimes } from '@/lib/atelier/prix'
/* `pays.ts` est PUR et sans montant : la liste des trois pays a précisément
   déménagé là pour pouvoir descendre dans le navigateur (cf. son en-tête). */
import { PAYS_LIBELLE, paysValide } from '@/lib/atelier/pays'
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
  token, nbPages, euros, livraisonCentimes, pays, commande, portOffert,
  cgvOk, renonciation, joursComposition, joursLivraison, previsualisation = false,
}: Props) {
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
     chiffré, la page se tait exactement comme elle se taisait avant le
     chiffrage du magazine — et le bouton reste inerte. */
  const prixConnu = euros !== null && livraisonCentimes !== null && commande !== null
  const accepte = cgv && reno

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
      {prixConnu && nbPages && commande ? (
        <div className="nu-bon">
          <div className="nu-bon-l">
            <span>Votre numéro, {nbPages} pages</span>
            <b>{formaterCentimes(commande.prix)}</b>
          </div>
          <div className="nu-bon-l">
            <span>Impression et façonnage</span>
            <b>compris</b>
          </div>
          {/* ── LA LIVRAISON, EN SUS (lot 6, 10/09/2026) ──
              Elle a sa ligne, toujours, même offerte : « compris » ne se dit
              plus, le port est devisé par destination et son montant doit se
              lire AVANT le clic. Une ligne absente ne dit rien ; une ligne à
              « offerte » dit quelque chose. */}
          <div className="nu-bon-l">
            <span>
              Livraison
              {pays && paysValide(pays) ? ` en ${PAYS_LIBELLE[pays]}` : ''}
            </span>
            <b>{portOffert ? 'offerte, fondateur' : formaterCentimes(commande.livraison)}</b>
          </div>
          {/* Le crédit de prévente, quand il est dû. Signe MOINS (U+2212), pas
              un tiret : « −30 € » se lit comme un montant retiré, « -30 € »
              avec un trait d'union se lit comme une coquille. */}
          {commande.remise > 0 ? (
            <div className="nu-bon-l">
              <span>Crédit fondateur</span>
              <b>&minus;{formaterCentimes(commande.remise)}</b>
            </div>
          ) : null}
          <div className="nu-bon-t">
            <span>À payer</span>
            <b>{formaterCentimes(commande.total)}</b>
          </div>
        </div>
      ) : (
        <div className="nu-bon">
          <div className="nu-bon-l">
            <span>Votre numéro est en cours de chiffrage.</span>
          </div>
        </div>
      )}

      {/* ── LA PROMESSE PASSE AVANT LE GESTE ──
          Les deux délais vivaient SOUS le bouton, en gris de 15 px. C'est
          pourtant ce qui fait appuyer : on paie un objet qu'on n'a pas encore.
          Les mêmes mots, dans le même ordre — composition, puis livraison
          après validation — mais au-dessus, et en deux lignes qu'on lit d'un
          coup d'œil au lieu d'un paragraphe qu'on saute. */}
      {/* La destination, dite une fois, avec la sortie de secours. Le pays a
          été choisi à l'écran 4 du questionnaire et il décide du port : s'il
          est faux, tout le bon de commande l'est. On ne rouvre pas un select
          ici (le devis est déjà passé, le montant est gelé) — on dit à qui
          s'adresser, ce qui est le geste que l'atelier peut vraiment tenir. */}
      {prixConnu && pays && paysValide(pays) ? (
        <p className="nu-prix-sub">
          Livraison en {PAYS_LIBELLE[pays]}. Un autre pays&nbsp;? Répondez au mail
          de votre couverture.
        </p>
      ) : null}

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
        {occupe
          ? 'Un instant…'
          : confirmer
            ? `Payer${commande ? ` ${formaterCentimes(commande.total)}` : ''}`
            : `Commander${commande ? ` · ${formaterCentimes(commande.total)}` : ''}`}
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
