'use client'

import { useEffect } from 'react'

/* Si la page est chargée avec ?ref=… et SANS hash, on ajoute #finalwaitlist
   pour que le navigateur scrolle nativement à la section waitlist.
   La garde !hasHash évite toute boucle (deps [] + re-écriture conditionnelle).
   ?ref= reste intact : on ne touche qu'à location.hash. */
export default function ReferralHashRedirect() {
  useEffect(() => {
    const hasRef = new URLSearchParams(window.location.search).has('ref')
    const hasHash = window.location.hash.length > 0
    if (hasRef && !hasHash) {
      window.location.hash = 'finalwaitlist'
    }
  }, [])
  return null
}
