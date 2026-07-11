'use client'

import { useState } from 'react'
import { Creneau, Temps, Inscription, TypeStagiaire } from '@/types'
import { getTempsVisiblesParStagiaire } from '@/lib/utils/planning'
import { peutSInscrire, peutQuitter } from '@/lib/utils/inscriptions'
import { TempsCard } from './TempsCard'

interface CreneauCardProps {
  creneau: Creneau
  tempsListe: Temps[]
  inscriptions: Inscription[]
  stagiaireId: string
  typeStagiaire: TypeStagiaire
  tempsCreneauMap: Record<string, string>
  onInscrire: (tempsId: string, creneauId: string) => Promise<void>
  onDesinscrire: (inscriptionId: string, creneauId: string) => Promise<void>
}

export function CreneauCard({
  creneau,
  tempsListe,
  inscriptions,
  stagiaireId,
  typeStagiaire,
  tempsCreneauMap,
  onInscrire,
  onDesinscrire,
}: CreneauCardProps) {
  const [loadingTempsId, setLoadingTempsId] = useState<string | null>(null)

  const tempsVisibles = getTempsVisiblesParStagiaire(
    tempsListe.filter(t => t.creneauId === creneau.id),
    typeStagiaire
  )

  if (tempsVisibles.length === 0) return null

  const handleInscrire = async (tempsId: string) => {
    setLoadingTempsId(tempsId)
    try {
      await onInscrire(tempsId, creneau.id)
    } finally {
      setLoadingTempsId(null)
    }
  }

  const handleDesinscrire = async (inscription: Inscription) => {
    setLoadingTempsId(inscription.tempsId)
    try {
      await onDesinscrire(inscription.id, creneau.id)
    } finally {
      setLoadingTempsId(null)
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-muted-foreground">
          {creneau.heureDebut} – {creneau.heureFin}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {tempsVisibles.map(temps => {
          const inscription = inscriptions.find(
            i => i.tempsId === temps.id && i.stagiaireId === stagiaireId
          )
          const inscrit = Boolean(inscription)
          const verrouille = inscription?.verrouille ?? false
          const canJoin = peutSInscrire(stagiaireId, creneau.id, inscriptions, tempsCreneauMap)

          return (
            <TempsCard
              key={temps.id}
              temps={temps}
              inscrit={inscrit}
              verrouille={verrouille}
              loading={loadingTempsId === temps.id}
              onInscrire={() => {
                if (canJoin) {
                  handleInscrire(temps.id)
                }
              }}
              onDesinscrire={() => {
                if (inscription && peutQuitter(inscription)) {
                  handleDesinscrire(inscription)
                }
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
