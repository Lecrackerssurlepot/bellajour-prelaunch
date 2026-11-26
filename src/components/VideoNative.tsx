'use client'

/* La vidéo native de la charte (fiche J) : un poster, deux encodages.
   - muette, en boucle, en ligne (iPhone) : jamais de son imposé ;
   - elle ne tourne qu'à l'écran (IntersectionObserver) et se met en pause hors champ ;
   - « réduire les animations » : le poster reste, avec les commandes pour la lancer ;
   - preload="none" : rien n'est téléchargé avant qu'elle approche de l'écran. */

import { useEffect, useRef } from 'react'

type Props = { poster: string; mp4: string; webm?: string; label: string; className?: string }

export default function VideoNative({ poster, mp4, webm, label, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.controls = true
      return
    }
    if (!('IntersectionObserver' in window)) {
      v.play().catch(() => {})
      return
    }
    const io = new IntersectionObserver(
      (en) => en.forEach((x) => (x.isIntersecting ? v.play().catch(() => {}) : v.pause())),
      { threshold: 0.25 },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [])

  return (
    <video ref={ref} className={className} muted loop playsInline preload="none" poster={poster} aria-label={label}>
      {webm && <source src={webm} type="video/webm" />}
      {mp4 && <source src={mp4} type="video/mp4" />}
    </video>
  )
}
