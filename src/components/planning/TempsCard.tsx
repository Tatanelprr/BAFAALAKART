'use client'

import { Temps } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface TempsCardProps {
  temps: Temps
  inscrit: boolean
  verrouille: boolean
  creneauOccupe: boolean
  changerDisabled: boolean
  changerWarning?: string
  onInscrire: () => void
  onChanger: () => void
  loading?: boolean
}

const colorsByType = {
  bleu: 'bg-blue-50 border border-blue-200',
  orange: 'bg-orange-50 border border-orange-200',
  violet: 'bg-purple-50 border border-purple-200',
  sans_formation: 'bg-slate-100',
}

const joinButtonClass: Partial<Record<string, string>> = {
  orange: 'bg-orange-500 hover:bg-orange-600 text-white',
  violet: 'bg-purple-500 hover:bg-purple-600 text-white',
}

export function TempsCard({
  temps,
  inscrit,
  verrouille,
  creneauOccupe,
  changerDisabled,
  changerWarning,
  onInscrire,
  onChanger,
  loading = false,
}: TempsCardProps) {
  return (
    <div className={`rounded-lg p-3 sm:p-4 flex flex-col gap-2 ${colorsByType[temps.type]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-snug">{temps.nom}</p>
          {temps.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {temps.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {inscrit && (
            <Badge className="bg-green-100 text-green-700 border-green-300">
              Temps choisi
            </Badge>
          )}
          {verrouille && inscrit && (
            <span className="text-sm" title="Verrouillé">🔒</span>
          )}
          {temps.type === 'bleu' && !inscrit && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-300">
              Obligatoire
            </Badge>
          )}
          {temps.type === 'violet' && (
            <Badge className="bg-purple-100 text-purple-700 border-purple-300">
              Atelier
            </Badge>
          )}
          {temps.type === 'sans_formation' && (
            <Badge variant="outline" className="text-slate-500 border-slate-300">
              Libre
            </Badge>
          )}
        </div>
      </div>

      {!inscrit && (
        <div className="flex justify-end">
          {creneauOccupe ? (
            <div className="flex flex-col items-end gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={onChanger}
                disabled={changerDisabled || loading}
                className="text-slate-700 border-slate-300 hover:bg-slate-100"
              >
                {loading ? 'Chargement…' : 'Changer de temps'}
              </Button>
              {changerWarning && (
                <p className="text-xs text-red-600 max-w-[220px] text-right">{changerWarning}</p>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              onClick={onInscrire}
              disabled={loading}
              className={joinButtonClass[temps.type] ?? ''}
            >
              {loading ? 'Chargement…' : 'Rejoindre'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
