export type AppRole = 'super_admin' | 'pco' | 'visiteur'
export type MemberRole = 'joueur' | 'president' | 'entraineur'
export type MatchStatus = 'a_venir' | 'en_cours' | 'pause' | 'termine'
export type EventType =
  | 'but' | 'carton_jaune' | 'carton_rouge' | 'carton_bleu'
  | 'debut_periode' | 'fin_periode'

export interface Profil { id: string; nom: string; role: AppRole }

export interface Tournoi {
  id: string; nom: string; saison: string | null; lieu: string | null
  duree_periode_sec: number; nb_periodes: number
  duree_carton_bleu_sec: number; max_joueurs_par_equipe: number; actif: boolean
}

export interface Equipe {
  id: string; tournoi_id: string; poule_id: string | null
  nom: string; surnom: string | null; quartier: string | null
  couleur_primaire: string; couleur_secondaire: string
  logo_url: string | null
  statut_inscription: 'en_attente' | 'validee' | 'rejetee'
}

export interface Membre {
  id: string; equipe_id: string; nom: string; role: MemberRole
  photo_url: string; qr_token: string; licence_num: string | null; actif: boolean
  empreinte_faciale?: number[] | null
}

export interface Match {
  id: string; tournoi_id: string; poule_id: string | null; phase: string
  equipe_dom: string; equipe_ext: string; pco_id: string | null
  debut_prevu: string | null; terrain: string | null
  statut: MatchStatus; periode: number
  chrono_demarre_a: string | null; chrono_offset_sec: number
  score_dom: number; score_ext: number
  resume_ia: string | null; resume_ia_style: string | null
}

export interface Evenement {
  id: string; match_id: string; equipe_id: string | null; membre_id: string | null
  type: EventType; minute: number; chrono_sec: number
  expire_a: string | null; source: 'tactile' | 'vocal' | 'import'
  client_uuid: string; cree_le: string
}

/** Événement en attente de synchronisation (mode hors-ligne). */
export interface EvenementLocal extends Omit<Evenement, 'id' | 'cree_le'> {
  cree_le: string
  synchronise: 0 | 1
}

export interface SuppressionLocale {
  client_uuid: string
  match_id: string
  cree_le: string
  synchronise: 0 | 1
}

export interface MajMatchLocale {
  id: string
  match_id: string
  patch: Partial<Pick<Match, 'statut' | 'chrono_demarre_a' | 'chrono_offset_sec' | 'periode'>>
  cree_le: string
  synchronise: 0 | 1
}
