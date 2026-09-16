/**
 * File d'attente hors-ligne → Supabase.
 * `client_uuid` rend chaque envoi idempotent : un événement rejoué
 * après une coupure réseau ne crée jamais de doublon.
 */
import { db } from './db'
import { supabase } from './supabase'
import type { EvenementLocal, MajMatchLocale } from './types'

type Ecouteur = (enAttente: number, enLigne: boolean) => void
const ecouteurs = new Set<Ecouteur>()
let enCours = false

export function surEtatSynchro(fn: Ecouteur) {
  ecouteurs.add(fn)
  void notifier()
  return () => ecouteurs.delete(fn)
}

async function notifier() {
  const [evenements, suppressions, matchs] = await Promise.all([
    db.outbox.where('synchronise').equals(0).count(),
    db.suppressions.where('synchronise').equals(0).count(),
    db.match_updates.where('synchronise').equals(0).count()
  ])
  const enAttente = evenements + suppressions + matchs
  ecouteurs.forEach(fn => fn(enAttente, navigator.onLine))
}

export async function enregistrerEvenement(ev: EvenementLocal) {
  await db.outbox.put({ ...ev, synchronise: 0 })
  await notifier()
  void vider()
}

export async function annulerEvenement(clientUuid: string, matchId?: string) {
  const local = await db.outbox.get(clientUuid)
  await db.outbox.delete(clientUuid)

  if (local?.synchronise === 0) {
    await notifier()
    return
  }

  const suppression = {
    client_uuid: clientUuid,
    match_id: matchId ?? local?.match_id ?? '',
    cree_le: new Date().toISOString(),
    synchronise: 0 as const
  }
  await db.suppressions.put(suppression)

  if (!navigator.onLine) {
    await notifier()
    return
  }

  const { error } = await supabase.from('evenements').delete().eq('client_uuid', clientUuid)
  if (!error) await db.suppressions.update(clientUuid, { synchronise: 1 })
  await notifier()
}

export async function enregistrerMajMatch(matchId: string, patch: MajMatchLocale['patch']) {
  await db.matchs.update(matchId, patch)
  await db.match_updates.put({
    id: crypto.randomUUID(),
    match_id: matchId,
    patch,
    cree_le: new Date().toISOString(),
    synchronise: 0
  })
  await notifier()
  void vider()
}

export async function vider() {
  if (enCours || !navigator.onLine) return
  enCours = true
  try {
    const majMatchs = await db.match_updates.where('synchronise').equals(0).sortBy('cree_le')
    for (const op of majMatchs) {
      const { error } = await supabase.from('matchs').update(op.patch).eq('id', op.match_id)
      if (error) break
      await db.match_updates.update(op.id, { synchronise: 1 })
    }

    const lot = await db.outbox.where('synchronise').equals(0).sortBy('cree_le')
    for (const ev of lot) {
      const { synchronise, ...payload } = ev
      const { error } = await supabase.from('evenements').upsert(payload, { onConflict: 'client_uuid' })
      if (error) break                      // on garde l'ordre : on réessaiera plus tard
      await db.outbox.update(ev.client_uuid, { synchronise: 1 })
    }

    const suppressions = await db.suppressions.where('synchronise').equals(0).sortBy('cree_le')
    for (const op of suppressions) {
      const { error } = await supabase.from('evenements').delete().eq('client_uuid', op.client_uuid)
      if (error) break
      await db.suppressions.update(op.client_uuid, { synchronise: 1 })
    }
  } finally {
    enCours = false
    await notifier()
  }
}

export function demarrerSynchro() {
  window.addEventListener('online', () => void vider())
  window.addEventListener('offline', () => void notifier())
  setInterval(() => void vider(), 15_000)
  void vider()
}
