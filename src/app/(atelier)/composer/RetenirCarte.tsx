'use client'

/* Noël 2026 (lot 3) : le bouton du mail GC2 mène à /composer?carte=<code>.
   Le code est rangé dans ce navigateur ; le bon de commande de /numero le
   relit et l'applique tout seul au moment de payer. Rien n'est écrit en
   base, rien ne s'affiche ici : la personne compose d'abord. */

import { useEffect } from 'react'
import { CLE_CARTE_RETENUE, normaliserCode } from '@/lib/atelier/carteCadeau'

export default function RetenirCarte() {
  useEffect(() => {
    const code = normaliserCode(new URLSearchParams(window.location.search).get('carte'))
    if (!code) return
    try { window.localStorage.setItem(CLE_CARTE_RETENUE, code) } catch { /* stockage fermé : le code reste dans le mail */ }
  }, [])
  return null
}
