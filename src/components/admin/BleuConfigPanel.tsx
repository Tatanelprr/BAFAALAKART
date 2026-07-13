'use client'

import { useState, useMemo } from 'react'
import { Check } from 'lucide-react'
import { Temps, Creneau } from '@/types'
import { updateTemps } from '@/services/temps'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface RowState {
  obligatoireBase: boolean
  obligatoireAppro: boolean
  groupeBase: string
  groupeAppro: string
  libelleGroupe: string
  saving: boolean
  saved: boolean
}

function initRow(t: Temps): RowState {
  return {
    obligatoireBase: t.obligatoireBase,
    obligatoireAppro: t.obligatoireAppro,
    groupeBase: t.groupeBase ?? '',
    groupeAppro: t.groupeAppro ?? '',
    libelleGroupe: t.libelleGroupe ?? '',
    saving: false,
    saved: false,
  }
}

interface Props {
  temps: Temps[]
  creneaux: Creneau[]
}

export function BleuConfigPanel({ temps, creneaux }: Props) {
  const bleus = temps.filter(t => t.type === 'bleu')

  // Edits locaux (l'utilisateur modifie les champs avant de sauvegarder)
  const [edits, setEdits] = useState<Record<string, Partial<RowState>>>({})

  // Etat final = base Firestore + edits locaux
  const rows = useMemo<Record<string, RowState>>(() => {
    const result: Record<string, RowState> = {}
    bleus.forEach(t => {
      result[t.id] = { ...initRow(t), ...edits[t.id] }
    })
    return result
  }, [bleus, edits])

  const setRow = (id: string, patch: Partial<RowState>) =>
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const handleSave = async (t: Temps) => {
    const row = rows[t.id]
    if (!row) return
    setRow(t.id, { saving: true, saved: false })
    try {
      await updateTemps(t.id, {
        obligatoireBase: row.obligatoireBase,
        obligatoireAppro: row.obligatoireAppro,
        ...(row.groupeBase ? { groupeBase: row.groupeBase } : { groupeBase: '' }),
        ...(row.groupeAppro ? { groupeAppro: row.groupeAppro } : { groupeAppro: '' }),
        ...(row.libelleGroupe ? { libelleGroupe: row.libelleGroupe } : { libelleGroupe: '' }),
      })
      setRow(t.id, { saving: false, saved: true })
      setTimeout(() => setRow(t.id, { saved: false }), 2000)
    } catch {
      setRow(t.id, { saving: false })
    }
  }

  const formatCreneau = (creneauId: string) => {
    const c = creneaux.find(c => c.id === creneauId)
    if (!c) return ''
    const [, , day] = c.jour.split('-')
    return `${day}/${c.heureDebut.slice(0, 5)}`
  }

  if (bleus.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Aucun temps bleu.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Configure les obligations et les groupes &quot;1 parmi&quot; pour chaque temps bleu.
      </p>

      {bleus.map(t => {
        const row = rows[t.id]
        if (!row) return null
        return (
          <div key={t.id} className="rounded-lg border bg-blue-50/40 p-3 flex flex-col gap-3">
            {/* Nom + créneau */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{t.nom}</p>
                <p className="text-xs text-muted-foreground">{formatCreneau(t.creneauId)}</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleSave(t)}
                disabled={row.saving}
                className={row.saved ? 'bg-green-500 hover:bg-green-500 text-white' : ''}
              >
                {row.saving ? '…' : row.saved ? <><Check className="h-3.5 w-3.5 mr-1 inline" />Sauvé</> : 'Sauvegarder'}
              </Button>
            </div>

            {/* Obligatoire Base / Appro */}
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={row.obligatoireBase}
                  onCheckedChange={v => setRow(t.id, { obligatoireBase: v === true })}
                />
                <span className="text-xs">Obligatoire Base</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={row.obligatoireAppro}
                  onCheckedChange={v => setRow(t.id, { obligatoireAppro: v === true })}
                />
                <span className="text-xs">Obligatoire Appro</span>
              </label>
            </div>

            {/* Groupes */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Libellé groupe</p>
                <Input
                  className="h-7 text-xs"
                  value={row.libelleGroupe}
                  onChange={e => setRow(t.id, { libelleGroupe: e.target.value })}
                  placeholder="ex: Connaissance de l'enfant"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Groupe Base</p>
                <Input
                  className="h-7 text-xs"
                  value={row.groupeBase}
                  onChange={e => setRow(t.id, { groupeBase: e.target.value })}
                  placeholder="ex: connaissance-enfant"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Groupe Appro</p>
                <Input
                  className="h-7 text-xs"
                  value={row.groupeAppro}
                  onChange={e => setRow(t.id, { groupeAppro: e.target.value })}
                  placeholder="ex: hms-appro"
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
