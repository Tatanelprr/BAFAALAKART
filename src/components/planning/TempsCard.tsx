'use client'

import { Temps } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface TempsCardProps {
  temps: Temps
  inscrit: boolean
  verrouille: boolean
  onInscrire: () => void
  onDesinscrire: () => void
  loading?: boolean
}

const colorsByType = {
  bleu: 'bg-blue-50 border border-blue-200',
  orange: 'bg-orange-50 border border-orange-200',
  violet: 'bg-purple-50 border border-purple-200',
  sans_formation: 'bg-slate-100',
}

export function TempsCard({
  temps,
  inscrit,
  verrouille,
  onInscrire,
  onDesinscrire,
  loading = false,
}: TempsCardProps) {
  const baseClass = `rounded-lg p-3 sm:p-4 flex flex-col gap-2 ${colorsByType[temps.type]}`

  return (
    <div className={baseClass}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-snug">{temps.nom}</p>
          {temps.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {temps.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {temps.type === 'bleu' && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-300">
              Obligatoire
            </Badge>
          )}
          {temps.type === 'violet' && (
            <>
              <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                Atelier
              </Badge>
              {verrouille && <span className="text-sm" title="Verrouillé">🔒</span>}
            </>
          )}
          {temps.type === 'sans_formation' && (
            <Badge variant="outline" className="text-slate-500 border-slate-300">
              Libre
            </Badge>
          )}
        </div>
      </div>

      {temps.type === 'orange' && (
        <div className="flex justify-end">
          {inscrit ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onDesinscrire}
              disabled={verrouille || loading}
              className="text-orange-700 border-orange-300 hover:bg-orange-100"
            >
              {loading ? 'Chargement…' : 'Quitter'}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onInscrire}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? 'Chargement…' : 'Rejoindre'}
            </Button>
          )}
        </div>
      )}

      {temps.type === 'violet' && !inscrit && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={onInscrire}
            disabled={loading}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            {loading ? 'Chargement…' : 'Rejoindre'}
          </Button>
        </div>
      )}

      {temps.type === 'violet' && inscrit && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={onDesinscrire}
            disabled={verrouille || loading}
            className="text-purple-700 border-purple-300 hover:bg-purple-100"
          >
            {loading ? 'Chargement…' : 'Quitter'}
          </Button>
        </div>
      )}
    </div>
  )
}
