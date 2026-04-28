import { NextResponse } from 'next/server'

const FALLBACK_COUNT = 847

export async function GET() {
  try {
    const apiKey = process.env.BREVO_API_KEY
    const listId = Number(process.env.BREVO_WAITLIST_LIST_ID)

    if (!apiKey || !listId) {
      return NextResponse.json({ count: FALLBACK_COUNT }, { status: 200 })
    }

    const res = await fetch(`https://api.brevo.com/v3/contacts/lists/${listId}`, {
      method: 'GET',
      headers: {
        'api-key': apiKey,
        accept: 'application/json',
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return NextResponse.json({ count: FALLBACK_COUNT }, { status: 200 })
    }

    const data = await res.json()
    const count =
      typeof data?.totalSubscribers === 'number'
        ? data.totalSubscribers
        : typeof data?.uniqueSubscribers === 'number'
          ? data.uniqueSubscribers
          : FALLBACK_COUNT

    return NextResponse.json(
      { count },
      {
        headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
      }
    )
  } catch {
    return NextResponse.json({ count: FALLBACK_COUNT }, { status: 200 })
  }
}
