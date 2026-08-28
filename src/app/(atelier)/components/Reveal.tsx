'use client'

/* Enveloppe de révélation au scroll — PRD §15 :
   translateY(24px) + opacité, IntersectionObserver à 15 %, UNE SEULE FOIS.
   S'appuie sur le hook maison src/hooks/useReveal.ts, qui fait déjà
   l'unobserve dès la première intersection.
   Le respect de prefers-reduced-motion est porté par .at-rv dans theme.css. */

import { useReveal } from '@/hooks/useReveal'
import { useValeurClient } from '@/hooks/useClient'

export default function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const { ref, isVisible } = useReveal<HTMLDivElement>(0.15)

  /* Filet : sans IntersectionObserver, le hook n'arme rien et le contenu
     resterait invisible à vie. Même garde que S1bAlbum.tsx.
     `false` côté serveur = « l'observateur existe » : le HTML servi cache le
     contenu, comme aujourd'hui. Un navigateur sans observateur le découvre à
     son premier rendu et montre tout. */
  const sansObserver = useValeurClient(
    () => typeof IntersectionObserver === 'undefined',
    false,
  )

  const affiche = isVisible || sansObserver

  return (
    <div
      ref={ref}
      className={`at-rv ${affiche ? 'is-in' : ''} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
