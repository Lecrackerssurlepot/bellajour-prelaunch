'use client'

/* Enveloppe de révélation au scroll — PRD §15 :
   translateY(24px) + opacité, IntersectionObserver à 15 %, UNE SEULE FOIS.
   S'appuie sur le hook maison src/hooks/useReveal.ts, qui fait déjà
   l'unobserve dès la première intersection.
   Le respect de prefers-reduced-motion est porté par .at-rv dans theme.css. */

import { useReveal } from '@/hooks/useReveal'

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

  return (
    <div
      ref={ref}
      className={`at-rv ${isVisible ? 'is-in' : ''} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
