'use client'

import { useMemo } from 'react'
import { Temps, TypeStagiaire } from '@/types'

function commonPrefix(strings: string[]): string {
  if (strings.length === 0) return ''
  let prefix = strings[0]
  for (const s of strings.slice(1)) {
    while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1)
  }
  return prefix.trim().replace(/:$/, '').trim()
}

interface ChecklistItem {
  key: string
  label: string
  detail?: string
  covered: boolean
  impossible: boolean  // non couvert ET tous ses créneaux sont pris par un autre temps
}

interface Props {
  temps: Temps[]
  coveredTempsIds: Set<string>
  occupiedCreneaux: Record<string, string>  // creneauId → tempsId sélectionné/inscrit
  typeStagiaire: TypeStagiaire
}

export function ObligationsChecklist({ temps, coveredTempsIds, occupiedCreneaux, typeStagiaire }: Props) {
  const items = useMemo<ChecklistItem[]>(() => {
    const map: Record<string, string[]> = {}
    temps
      .filter(t =>
        t.type === 'bleu' &&
        (typeStagiaire === 'Base' ? t.obligatoireBase : t.obligatoireAppro)
      )
      .forEach(t => {
        const groupe = typeStagiaire === 'Base' ? t.groupeBase : t.groupeAppro
        const key = groupe ?? t.nom
        if (!map[key]) map[key] = []
        map[key].push(t.id)
      })

    return Object.entries(map).map(([key, ids]) => {
      const tempsInGroup = ids
        .map(id => temps.find(t => t.id === id))
        .filter((t): t is Temps => Boolean(t))
      const uniqueNoms = [...new Set(tempsInGroup.map(t => t.nom))]
      const isGroup = uniqueNoms.length > 1
      const libelleGroupe = tempsInGroup.find(t => t.libelleGroupe)?.libelleGroupe
      const label = isGroup
        ? (libelleGroupe ?? commonPrefix(uniqueNoms) ?? key)
        : (uniqueNoms[0] ?? key)
      const covered = ids.some(id => coveredTempsIds.has(id))

      // Impossible : non couvert ET chaque occurrence a son créneau occupé par un autre temps
      const impossible = !covered && ids.every(id => {
        const t = temps.find(t => t.id === id)
        if (!t) return true
        const occupying = occupiedCreneaux[t.creneauId]
        return occupying !== undefined && occupying !== id
      })

      return {
        key,
        label,
        detail: isGroup ? `1 parmi : ${uniqueNoms.join(', ')}` : undefined,
        covered,
        impossible,
      }
    })
  }, [temps, coveredTempsIds, occupiedCreneaux, typeStagiaire])

  const coveredCount = items.filter(i => i.covered).length
  const total = items.length
  const hasImpossible = items.some(i => i.impossible)

  if (total === 0) return null

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold">Temps bleus obligatoires</p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          hasImpossible
            ? 'bg-red-100 text-red-700'
            : coveredCount === total
            ? 'bg-green-100 text-green-700'
            : 'bg-amber-100 text-amber-700'
        }`}>
          {coveredCount}/{total}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map(item => (
          <li key={item.key} className="flex items-start gap-2.5">
            <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
              item.covered
                ? 'bg-green-500 text-white'
                : item.impossible
                ? 'bg-red-500 text-white'
                : 'border-2 border-slate-300'
            }`}>
              {item.covered ? '✓' : item.impossible ? '!' : ''}
            </span>
            <div className="min-w-0">
              <p className={`text-sm leading-snug ${
                item.covered
                  ? 'text-muted-foreground line-through'
                  : item.impossible
                  ? 'text-red-600 font-medium'
                  : ''
              }`}>
                {item.label}
              </p>
              {item.impossible && (
                <p className="text-xs text-red-500 mt-0.5">
                  Plus aucun créneau disponible pour ce temps.
                </p>
              )}
              {!item.impossible && item.detail && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {item.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
