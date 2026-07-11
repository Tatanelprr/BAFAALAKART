import { Timestamp } from 'firebase/firestore'

export type UserRole = 'stagiaire' | 'formateur' | 'admin'
export type TypeStagiaire = 'Base' | 'Approfondissement'
export type TypeTemps = 'bleu' | 'orange' | 'violet' | 'sans_formation'
export type OrigineInscription = 'auto' | 'choix' | 'admin'

export interface User {
  uid: string
  nom: string
  prenom: string
  identifiant: string
  role: UserRole
  typeStagiaire?: TypeStagiaire
  createdAt: Timestamp
}

export interface Session {
  id: string
  nom: string
  lieu: string
  dateDebut: Timestamp
  dateFin: Timestamp
}

export interface Creneau {
  id: string
  jour: string        // ISO date ex: "2026-07-12"
  heureDebut: string  // ex: "09:00"
  heureFin: string    // ex: "11:00"
  ordre: number
}

export interface Temps {
  id: string
  nom: string
  description: string
  type: TypeTemps
  creneauId: string
  obligatoireBase: boolean
  obligatoireAppro: boolean
  atelierId?: string
  capaciteMin: number
}

export interface Atelier {
  id: string
  nom: string
  description: string
}

export interface Inscription {
  id: string
  stagiaireId: string
  tempsId: string
  creneauId: string
  dateCreation: Timestamp
  origine: OrigineInscription
  verrouille: boolean
}

export interface Presence {
  id: string
  stagiaireId: string
  tempsId: string
  present: boolean
  validePar: string
  dateValidation: Timestamp
}

export interface HistoriqueEntry {
  id: string
  action: string
  utilisateurId: string
  details: Record<string, unknown>
  date: Timestamp
}
