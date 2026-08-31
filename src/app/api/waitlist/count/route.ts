import { NextResponse } from 'next/server'
import { makeSupabase } from '@/lib/supabase'

// Source de vérité = table `waitlist` Supabase (là où /api/waitlist insère).
// Base nettoyée → 0. +1 à chaque inscription réelle.
// Pas de fallback gonflé : en cas d'erreur on renvoie 0 plutôt qu'un nombre inventé.
export async function GET() {
  try {
    const supabase = makeSupabase()
    const { count, error } = await supabase
      .from('waitlist')
      .select('id', { count: 'exact', head: true })

    if (error || typeof count !== 'number') {
      /* T-012 — le 0 de repli reste (pas de nombre inventé), mais la panne
         parle : muette, elle affichait « 0 inscrite » sans laisser de trace. */
      if (error) console.error('[waitlist/count] lecture échouée', error.code)
      return NextResponse.json({ count: 0 }, { status: 200 })
    }

    return NextResponse.json(
      { count },
      {
        headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' },
      }
    )
  } catch (err) {
    /* Même repli, même voix : 0 affiché, panne loguée. */
    console.error('[waitlist/count] exception', (err as Error)?.message)
    return NextResponse.json({ count: 0 }, { status: 200 })
  }
}
