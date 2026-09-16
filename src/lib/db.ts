/**
 * Stockage local IndexedDB (Dexie).
 * La table de marque écrit toujours ici d'abord : le match continue
 * même sans réseau sur le terrain, la synchro se fait au retour.
 */
import Dexie, { type Table } from 'dexie'
import type { EvenementLocal, Match, Equipe, Membre, SuppressionLocale, MajMatchLocale } from './types'

class MaracanaDB extends Dexie {
  outbox!: Table<EvenementLocal, string>
  suppressions!: Table<SuppressionLocale, string>
  match_updates!: Table<MajMatchLocale, string>
  matchs!: Table<Match, string>
  equipes!: Table<Equipe, string>
  membres!: Table<Membre, string>

  constructor() {
    super('maracana-petit-poteau')
    this.version(1).stores({
      outbox: 'client_uuid, match_id, synchronise, cree_le',
      matchs: 'id, tournoi_id, statut',
      equipes: 'id, tournoi_id',
      membres: 'id, equipe_id'
    })
    this.version(2).stores({
      outbox: 'client_uuid, match_id, synchronise, cree_le',
      suppressions: 'client_uuid, match_id, synchronise, cree_le',
      match_updates: 'id, match_id, synchronise, cree_le',
      matchs: 'id, tournoi_id, statut',
      equipes: 'id, tournoi_id',
      membres: 'id, equipe_id'
    })
  }
}

export const db = new MaracanaDB()

/** Précharge un match pour pouvoir l'arbitrer entièrement hors-ligne. */
export async function mettreEnCache(match: Match, equipes: Equipe[], membres: Membre[]) {
  await db.transaction('rw', db.matchs, db.equipes, db.membres, async () => {
    await db.matchs.put(match)
    await db.equipes.bulkPut(equipes)
    await db.membres.bulkPut(membres)
  })
}
