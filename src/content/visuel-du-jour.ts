/* ════════════════════════════════════════════════════════════
   Le visuel du jour, côté SERVEUR (composants serveur, routes).

   = les rotations réglées dans l'admin (table `visuels_rotations`) placées
     AVANT celles de media.ts, puis la règle pure `visuelPour`.

   - Cache court (60 s) étiqueté `visuels-site` : chaque écriture de l'admin
     l'expire tout de suite (`revalidateTag`).
   - La base ne répond pas, ou la table manque : on calcule avec les seules
     rotations du code. Le site ne casse jamais pour un visuel.
   - Aperçu de l'admin : en mode brouillon Next (`draftMode`, ouvert par
     /api/admin/visuels/apercu) ET avec un cookie admin valide, le jour et
     l'option « brouillons » viennent du cookie `bj_apercu_visuels`.

   ⚠️ Une page statique calcule « aujourd'hui » quand elle est construite :
   une page qui montre un visuel daté doit se reconstruire (export
   `revalidate` littéral sur la page), sinon le changement de jour attend
   le prochain déploiement.
   ════════════════════════════════════════════════════════════ */

import { unstable_cache } from 'next/cache'
import { cookies, draftMode, headers } from 'next/headers'
import { makeSupabase } from '@/lib/supabase'
import { ADMIN_COOKIE, verifierCookieAdmin } from '@/lib/admin-auth'
import { MEDIA, visuelPour, type Emplacement, type NomEmplacement, type Visuel } from './media'
import {
  COLONNES_ROTATION,
  COOKIE_APERCU_VISUELS,
  TAG_VISUELS,
  lireCookieApercu,
  rotationsFusionnees,
  type LigneRotation,
} from '@/lib/visuels/rotation'
import { ENTETE_APERCU, lireValeurApercu } from '@/lib/visuels/apercu'

/** Toutes les lignes de la table. Une erreur rend une liste vide (repli sur le code). */
async function lireLignes(): Promise<LigneRotation[]> {
  try {
    const { data, error } = await makeSupabase().from('visuels_rotations').select(COLONNES_ROTATION)
    if (error) {
      console.error('[visuels] lecture des rotations impossible', error.code, error.message)
      return []
    }
    return (data ?? []) as LigneRotation[]
  } catch (err) {
    console.error('[visuels] lecture des rotations : exception', (err as Error)?.message)
    return []
  }
}

const lignesEnCache = unstable_cache(lireLignes, ['visuels-rotations'], { revalidate: 60, tags: [TAG_VISUELS] })

export type ApercuVisuels = { jour: string; brouillons: boolean; source: 'adresse' | 'cookie' }

/**
 * Le jour et l'option d'aperçu, seulement pour l'atelier en mode brouillon.
 * L'adresse (`?apercu_jour=`, recopiée en en-tête par le middleware) passe
 * AVANT le cookie : c'est elle qui permet deux dates côte à côte.
 * ⚠️ `headers()` n'est lu qu'APRÈS le contrôle du mode brouillon : hors aperçu,
 * une page statique doit le rester.
 */
export async function apercuVisuels(): Promise<ApercuVisuels | null> {
  try {
    const brouillon = await draftMode()
    if (!brouillon.isEnabled) return null
    const jar = await cookies()
    if (!(await verifierCookieAdmin(jar.get(ADMIN_COOKIE)?.value))) return null
    const parAdresse = lireValeurApercu((await headers()).get(ENTETE_APERCU))
    if (parAdresse) return { ...parAdresse, source: 'adresse' }
    const parCookie = lireCookieApercu(jar.get(COOKIE_APERCU_VISUELS)?.value)
    return parCookie ? { ...parCookie, source: 'cookie' } : null
  } catch {
    /* Hors requête (construction, script) : pas d'aperçu. */
    return null
  }
}

/** L'emplacement avec ses rotations de l'admin, pour un calcul ou un affichage. */
export async function emplacementDuSite(nom: NomEmplacement): Promise<Emplacement> {
  const lignes = await lignesEnCache()
  return { ...(MEDIA[nom] as Emplacement), rotations: rotationsFusionnees(nom, lignes) }
}

/**
 * Le visuel montré par le site pour cet emplacement, ou `null` s'il ne montre
 * rien (emplacement vide, ou rotation « vide » ce jour-là).
 */
export async function visuelDuJour(nom: NomEmplacement, instant: Date = new Date()): Promise<Visuel | null> {
  const [e, ap] = await Promise.all([emplacementDuSite(nom), apercuVisuels()])
  const table = { [nom]: e } as Record<string, Emplacement>
  if (ap) return visuelPour(nom, new Date(`${ap.jour}T12:00:00+01:00`), table, { brouillons: ap.brouillons })
  return visuelPour(nom, instant, table)
}
