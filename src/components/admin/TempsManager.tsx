'use client'

import { useState } from 'react'
import { useTemps } from '@/hooks/useTemps'
import { Temps, Creneau, Atelier, TypeTemps } from '@/types'
import {
  createTemps,
  updateTemps,
  deleteTemps,
} from '@/services/temps'
import {
  createCreneau,
  updateCreneau,
  deleteCreneau,
} from '@/services/creneaux'
import {
  createAtelier,
  updateAtelier,
  deleteAtelier,
} from '@/services/ateliers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

const JOURS_ABBR = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']

function formatCreneau(c: Creneau): string {
  const [year, month, day] = c.jour.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  const abbr = JOURS_ABBR[d.getUTCDay()]
  const dayNum = String(d.getUTCDate()).padStart(2, '0')
  const monthNum = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${abbr} ${dayNum}/${monthNum} ${c.heureDebut}–${c.heureFin}`
}

const TYPE_BADGE: Record<TypeTemps, { label: string; className: string }> = {
  bleu: { label: 'Bleu', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  orange: { label: 'Orange', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  violet: { label: 'Violet', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  sans_formation: { label: 'Sans formation', className: 'bg-gray-100 text-gray-600 border-gray-200' },
}

function TypeBadge({ type }: { type: TypeTemps }) {
  const { label, className } = TYPE_BADGE[type]
  return <Badge className={className}>{label}</Badge>
}

// ─────────────────────────────────────────────────────
// Section Créneaux
// ─────────────────────────────────────────────────────

interface CreneauFormState {
  jour: string
  heureDebut: string
  heureFin: string
  ordre: number
  baseOnly: boolean
}

function defaultCreneauForm(): CreneauFormState {
  return { jour: '2026-07-12', heureDebut: '09:00', heureFin: '11:00', ordre: 1, baseOnly: false }
}

function CreneauDialog({
  creneau,
  onSaved,
  trigger,
}: {
  creneau?: Creneau
  onSaved: () => void
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CreneauFormState>(
    creneau
      ? { jour: creneau.jour, heureDebut: creneau.heureDebut, heureFin: creneau.heureFin, ordre: creneau.ordre, baseOnly: creneau.baseOnly ?? false }
      : defaultCreneauForm()
  )
  const [saving, setSaving] = useState(false)

  const handleOpenChange = (val: boolean) => {
    if (val) {
      setForm(
        creneau
          ? { jour: creneau.jour, heureDebut: creneau.heureDebut, heureFin: creneau.heureFin, ordre: creneau.ordre, baseOnly: creneau.baseOnly ?? false }
          : defaultCreneauForm()
      )
    }
    setOpen(val)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (creneau) {
        await updateCreneau(creneau.id, form)
      } else {
        await createCreneau(form)
      }
      onSaved()
      setOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<span />}>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{creneau ? 'Modifier le créneau' : 'Ajouter un créneau'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label>Jour (AAAA-MM-JJ)</Label>
            <Input
              value={form.jour}
              onChange={e => setForm(f => ({ ...f, jour: e.target.value }))}
              placeholder="2026-07-12"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label>Heure début</Label>
              <Input
                value={form.heureDebut}
                onChange={e => setForm(f => ({ ...f, heureDebut: e.target.value }))}
                placeholder="09:00"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label>Heure fin</Label>
              <Input
                value={form.heureFin}
                onChange={e => setForm(f => ({ ...f, heureFin: e.target.value }))}
                placeholder="11:00"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Ordre</Label>
            <Input
              type="number"
              value={form.ordre}
              onChange={e => setForm(f => ({ ...f, ordre: parseInt(e.target.value) || 1 }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.baseOnly}
              onCheckedChange={val => setForm(f => ({ ...f, baseOnly: val === true }))}
              id="baseOnly"
            />
            <label htmlFor="baseOnly" className="text-sm cursor-pointer">
              Réservé aux stagiaires Base uniquement
            </label>
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreneauxSection({ creneaux }: { creneaux: Creneau[] }) {
  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Supprimer le créneau "${label}" ?`)) return
    try {
      await deleteCreneau(id)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Créneaux ({creneaux.length})</h3>
        <CreneauDialog
          onSaved={() => {}}
          trigger={<Button size="sm">+ Ajouter</Button>}
        />
      </div>

      {creneaux.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Aucun créneau.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {creneaux.map(c => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <span className="text-sm font-mono">{formatCreneau(c)}</span>
              <div className="flex gap-1">
                <CreneauDialog
                  creneau={c}
                  onSaved={() => {}}
                  trigger={<Button variant="outline" size="sm">Modifier</Button>}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(c.id, formatCreneau(c))}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────
// Section Ateliers
// ─────────────────────────────────────────────────────

function AtelierDialog({
  atelier,
  onSaved,
  trigger,
}: {
  atelier?: Atelier
  onSaved: () => void
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [nom, setNom] = useState(atelier?.nom ?? '')
  const [description, setDescription] = useState(atelier?.description ?? '')
  const [saving, setSaving] = useState(false)

  const handleOpenChange = (val: boolean) => {
    if (val) {
      setNom(atelier?.nom ?? '')
      setDescription(atelier?.description ?? '')
    }
    setOpen(val)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (atelier) {
        await updateAtelier(atelier.id, { nom, description })
      } else {
        await createAtelier({ nom, description })
      }
      onSaved()
      setOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<span />}>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{atelier ? 'Modifier l\'atelier' : 'Ajouter un atelier'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Nom</Label>
            <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom de l'atelier" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" />
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={handleSave} disabled={saving || !nom.trim()}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AteliersSection({ ateliers }: { ateliers: Atelier[] }) {
  const handleDelete = async (id: string, nom: string) => {
    if (!window.confirm(`Supprimer l'atelier "${nom}" ?`)) return
    try {
      await deleteAtelier(id)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Ateliers ({ateliers.length})</h3>
        <AtelierDialog
          onSaved={() => {}}
          trigger={<Button size="sm">+ Ajouter</Button>}
        />
      </div>

      {ateliers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Aucun atelier.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ateliers.map(a => (
            <div
              key={a.id}
              className="flex items-start justify-between rounded-lg border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{a.nom}</p>
                {a.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0 ml-2">
                <AtelierDialog
                  atelier={a}
                  onSaved={() => {}}
                  trigger={<Button variant="outline" size="sm">Modifier</Button>}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(a.id, a.nom)}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────
// Section Temps
// ─────────────────────────────────────────────────────

interface TempsFormState {
  nom: string
  description: string
  type: TypeTemps
  creneauId: string
  obligatoireBase: boolean
  obligatoireAppro: boolean
  atelierId: string
  capaciteMin: number
  groupeBase: string
  groupeAppro: string
  libelleGroupe: string
}

function defaultTempsForm(): TempsFormState {
  return {
    nom: '',
    description: '',
    type: 'orange',
    creneauId: '',
    obligatoireBase: false,
    obligatoireAppro: false,
    atelierId: '',
    capaciteMin: 0,
    groupeBase: '',
    groupeAppro: '',
    libelleGroupe: '',
  }
}

function TempsDialog({
  temps,
  creneaux,
  ateliers,
  onSaved,
  trigger,
}: {
  temps?: Temps
  creneaux: Creneau[]
  ateliers: Atelier[]
  onSaved: () => void
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const tempsToForm = (t: Temps): TempsFormState => ({
    nom: t.nom,
    description: t.description,
    type: t.type,
    creneauId: t.creneauId,
    obligatoireBase: t.obligatoireBase,
    obligatoireAppro: t.obligatoireAppro,
    atelierId: t.atelierId ?? '',
    capaciteMin: t.capaciteMin,
    groupeBase: t.groupeBase ?? '',
    groupeAppro: t.groupeAppro ?? '',
    libelleGroupe: t.libelleGroupe ?? '',
  })

  const [form, setForm] = useState<TempsFormState>(
    temps ? tempsToForm(temps) : defaultTempsForm()
  )
  const [saving, setSaving] = useState(false)

  const handleOpenChange = (val: boolean) => {
    if (val) setForm(temps ? tempsToForm(temps) : defaultTempsForm())
    setOpen(val)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const data: Omit<Temps, 'id'> = {
        nom: form.nom,
        description: form.description,
        type: form.type,
        creneauId: form.creneauId,
        obligatoireBase: form.obligatoireBase,
        obligatoireAppro: form.obligatoireAppro,
        capaciteMin: form.capaciteMin,
        ...(form.type === 'violet' && form.atelierId ? { atelierId: form.atelierId } : {}),
        ...(form.groupeBase ? { groupeBase: form.groupeBase } : {}),
        ...(form.groupeAppro ? { groupeAppro: form.groupeAppro } : {}),
        ...(form.libelleGroupe ? { libelleGroupe: form.libelleGroupe } : {}),
      }
      if (temps) {
        await updateTemps(temps.id, data)
      } else {
        await createTemps(data)
      }
      onSaved()
      setOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const isBleu = form.type === 'bleu'
  const isViolet = form.type === 'violet'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<span />}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{temps ? 'Modifier le temps' : 'Ajouter un temps'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {/* Nom */}
          <div className="flex flex-col gap-1.5">
            <Label>Nom</Label>
            <Input
              value={form.nom}
              onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
              placeholder="Nom du temps"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description"
            />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={val => setForm(f => ({ ...f, type: val as TypeTemps, atelierId: '' }))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bleu">Bleu</SelectItem>
                <SelectItem value="orange">Orange</SelectItem>
                <SelectItem value="violet">Violet</SelectItem>
                <SelectItem value="sans_formation">Sans formation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Créneau */}
          <div className="flex flex-col gap-1.5">
            <Label>Créneau</Label>
            <Select value={form.creneauId} onValueChange={val => setForm(f => ({ ...f, creneauId: val ?? '' }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un créneau" />
              </SelectTrigger>
              <SelectContent>
                {creneaux.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {formatCreneau(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Capacité min */}
          <div className="flex flex-col gap-1.5">
            <Label>Capacité min</Label>
            <Input
              type="number"
              value={form.capaciteMin}
              onChange={e => setForm(f => ({ ...f, capaciteMin: parseInt(e.target.value) || 0 }))}
            />
          </div>

          {/* Obligatoire Base / Appro (affiché si type = bleu) */}
          {isBleu && (
            <div className="flex flex-col gap-2">
              <Label>Obligatoire</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.obligatoireBase}
                  onCheckedChange={val => setForm(f => ({ ...f, obligatoireBase: val === true }))}
                  id="obligatoireBase"
                />
                <label htmlFor="obligatoireBase" className="text-sm cursor-pointer">
                  Obligatoire Base
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.obligatoireAppro}
                  onCheckedChange={val => setForm(f => ({ ...f, obligatoireAppro: val === true }))}
                  id="obligatoireAppro"
                />
                <label htmlFor="obligatoireAppro" className="text-sm cursor-pointer">
                  Obligatoire Approfondissement
                </label>
              </div>
            </div>
          )}

          {/* Groupes "1 parmi" (affiché si type = bleu) */}
          {isBleu && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Libellé du groupe (optionnel)</Label>
                <Input
                  value={form.libelleGroupe}
                  onChange={e => setForm(f => ({ ...f, libelleGroupe: e.target.value }))}
                  placeholder="ex: Connaissance de l'enfant"
                />
                <p className="text-xs text-muted-foreground">
                  Affiché dans la checklist à la place des noms individuels.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Groupe Base (optionnel)</Label>
                <Input
                  value={form.groupeBase}
                  onChange={e => setForm(f => ({ ...f, groupeBase: e.target.value }))}
                  placeholder="ex: reglementation-specifique"
                />
                <p className="text-xs text-muted-foreground">
                  Si renseigné, 1 seul temps de ce groupe suffit pour valider l&apos;obligation Base.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Groupe Appro (optionnel)</Label>
                <Input
                  value={form.groupeAppro}
                  onChange={e => setForm(f => ({ ...f, groupeAppro: e.target.value }))}
                  placeholder="ex: hms-appro"
                />
                <p className="text-xs text-muted-foreground">
                  Si renseigné, 1 seul temps de ce groupe suffit pour valider l&apos;obligation Appro.
                </p>
              </div>
            </div>
          )}

          {/* Atelier (affiché si type = violet) */}
          {isViolet && (
            <div className="flex flex-col gap-1.5">
              <Label>Atelier associé</Label>
              <Select
                value={form.atelierId}
                onValueChange={val => setForm(f => ({ ...f, atelierId: val ?? '' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir un atelier" />
                </SelectTrigger>
                <SelectContent>
                  {ateliers.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={handleSave} disabled={saving || !form.nom.trim() || !form.creneauId}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TempsSection({
  temps,
  creneaux,
  ateliers,
}: {
  temps: Temps[]
  creneaux: Creneau[]
  ateliers: Atelier[]
}) {
  const handleDelete = async (id: string, nom: string) => {
    if (!window.confirm(`Supprimer le temps "${nom}" ?`)) return
    try {
      await deleteTemps(id)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Temps ({temps.length})</h3>
        <TempsDialog
          creneaux={creneaux}
          ateliers={ateliers}
          onSaved={() => {}}
          trigger={<Button size="sm">+ Ajouter un temps</Button>}
        />
      </div>

      {temps.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Aucun temps.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {[...temps].sort((a, b) => {
            const ca = creneaux.find(c => c.id === a.creneauId)
            const cb = creneaux.find(c => c.id === b.creneauId)
            const keyA = ca ? `${ca.jour}${ca.heureDebut}` : ''
            const keyB = cb ? `${cb.jour}${cb.heureDebut}` : ''
            return keyA.localeCompare(keyB)
          }).map(t => {
            const creneau = creneaux.find(c => c.id === t.creneauId)
            return (
              <div
                key={t.id}
                className="flex items-start justify-between rounded-lg border px-3 py-2 gap-2"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{t.nom}</span>
                    <TypeBadge type={t.type} />
                  </div>
                  {creneau && (
                    <span className="text-xs text-muted-foreground">{formatCreneau(creneau)}</span>
                  )}
                  {t.description && (
                    <span className="text-xs text-muted-foreground truncate">{t.description}</span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <TempsDialog
                    temps={t}
                    creneaux={creneaux}
                    ateliers={ateliers}
                    onSaved={() => {}}
                    trigger={<Button variant="outline" size="sm">Modifier</Button>}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(t.id, t.nom)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────
// Main TempsManager
// ─────────────────────────────────────────────────────

export function TempsManager() {
  const { temps, creneaux, ateliers, loading } = useTemps()

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        Chargement…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Section Créneaux */}
      <section>
        <CreneauxSection creneaux={creneaux} />
      </section>

      <hr className="border-border" />

      {/* Section Temps */}
      <section>
        <TempsSection temps={temps} creneaux={creneaux} ateliers={ateliers} />
      </section>

      <hr className="border-border" />

      {/* Section Ateliers */}
      <section>
        <AteliersSection ateliers={ateliers} />
      </section>
    </div>
  )
}
