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
      return NextResponse.json({ count: 0 }, { status: 200 })
    }

    return NextResponse.json(
      { count },
      {
        headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' },
      }
    )
  } catch {
    return NextResponse.json({ count: 0 }, { status: 200 })
  }
}
