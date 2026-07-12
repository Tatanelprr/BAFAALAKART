'use client'

import { useState } from 'react'
import { Creneau, Temps, Inscription, TypeStagiaire } from '@/types'
import { getTempsVisiblesParStagiaire } from '@/lib/utils/planning'
import { peutSInscrire } from '@/lib/utils/inscriptions'
import { TempsCard } from './TempsCard'

interface CreneauCardProps {
  creneau: Creneau
  tempsListe: Temps[]
  inscriptions: Inscription[]
  stagiaireId: string
  typeStagiaire: TypeStagiaire
  tempsCreneauMap: Record<string, string>
  onInscrire: (tempsId: string, creneauId: string) => Promise<void>
  onChanger: (inscriptionId: string, creneauId: string, newTempsId: string) => Promise<void>
}

export function CreneauCard({
  creneau,
  tempsListe,
  inscriptions,
  stagiaireId,
  typeStagiaire,
  tempsCreneauMap,
  onInscrire,
  onChanger,
}: CreneauCardProps) {
  const [loadingTempsId, setLoadingTempsId] = useState<string | null>(null)

  const tempsVisibles = getTempsVisiblesParStagiaire(
    tempsListe.filter(t => t.creneauId === creneau.id),
    typeStagiaire
  )

  if (tempsVisibles.length === 0) return null

  const inscriptionDuCreneau = inscriptions.find(
    i => i.creneauId === creneau.id && i.stagiaireId === stagiaireId
  )
  const creneauOccupe = Boolean(inscriptionDuCreneau)
  const verrouilleDuCreneau = inscriptionDuCreneau?.verrouille ?? false

  const handleInscrire = async (tempsId: string) => {
    setLoadingTempsId(tempsId)
    try {
      await onInscrire(tempsId, creneau.id)
    } finally {
      setLoadingTempsId(null)
    }
  }

  const handleChanger = async (newTempsId: string) => {
    if (!inscriptionDuCreneau || verrouilleDuCreneau) return
    setLoadingTempsId(newTempsId)
    try {
      await onChanger(inscriptionDuCreneau.id, creneau.id, newTempsId)
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
              creneauOccupe={creneauOccupe && !inscrit}
              changerDisabled={verrouilleDuCreneau}
              loading={loadingTempsId === temps.id}
              onInscrire={() => { if (canJoin) handleInscrire(temps.id) }}
              onChanger={() => handleChanger(temps.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
