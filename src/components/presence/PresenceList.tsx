'use client'

import { useState } from 'react'
import { Inscription, Presence, User } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

interface PresenceListProps {
  tempsId: string
  inscriptions: Inscription[]
  presences: Presence[]
  stagiaires: User[]
  currentUserId: string
  onValider: (stagiaireId: string, inscriptionId: string) => Promise<void>
  onAnnuler: (stagiaireId: string) => Promise<void>
}

export function PresenceList({
  inscriptions,
  presences,
  stagiaires,
  currentUserId: _currentUserId,
  onValider,
  onAnnuler,
}: PresenceListProps) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  if (inscriptions.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Aucun stagiaire inscrit à ce temps.
      </div>
    )
  }

  const handleToggle = async (
    stagiaireId: string,
    inscriptionId: string,
    estPresent: boolean
  ) => {
    setLoadingIds(prev => new Set(prev).add(stagiaireId))
    try {
      if (estPresent) {
        await onAnnuler(stagiaireId)
      } else {
        await onValider(stagiaireId, inscriptionId)
      }
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(stagiaireId)
        return next
      })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {inscriptions.map(insc => {
        const stagiaire = stagiaires.find(s => s.uid === insc.stagiaireId)
        if (!stagiaire) return null

        const presence = presences.find(
          p => p.stagiaireId === insc.stagiaireId
        )
        const estPresent = presence?.present === true
        const isLoading = loadingIds.has(insc.stagiaireId)

        return (
          <div
            key={insc.id}
            className="flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-3"
          >
            <div className="pt-0.5">
              <Checkbox
                checked={estPresent}
                disabled={isLoading}
                onCheckedChange={() =>
                  handleToggle(insc.stagiaireId, insc.id, estPresent)
                }
                aria-label={`Présence de ${stagiaire.prenom} ${stagiaire.nom}`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">
                {stagiaire.prenom} {stagiaire.nom}
              </p>
              {stagiaire.typeStagiaire && (
                <p className="text-xs text-muted-foreground">
                  {stagiaire.typeStagiaire}
                </p>
              )}
              {estPresent && presence && (
                <p className="text-xs text-green-600 mt-0.5">
                  Validé à {formatHeure(presence.dateValidation?.toDate?.())}
                </p>
              )}
            </div>

            <div className="shrink-0">
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
              ) : estPresent ? (
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={() =>
                    handleToggle(insc.stagiaireId, insc.id, true)
                  }
                >
                  Annuler
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="xs"
                  onClick={() =>
                    handleToggle(insc.stagiaireId, insc.id, false)
                  }
                >
                  Valider
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatHeure(date: Date | undefined): string {
  if (!date) return '–'
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
