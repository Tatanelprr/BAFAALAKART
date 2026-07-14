'use client'

import { useEffect, useState } from 'react'
import { listStagiaires } from '@/services/users'
import { desinscireAdmin, inscrireAdmin } from '@/services/inscriptions'
import { useTemps } from '@/hooks/useTemps'
import { useInscriptions } from '@/hooks/useInscriptions'
import { useAuth } from '@/hooks/useAuth'
import { User, Creneau, Inscription } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatCreneau(creneau: Creneau): string {
  const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
  const [y, m, d] = creneau.jour.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const jour = JOURS[date.getUTCDay()]
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')} ${creneau.heureDebut}–${creneau.heureFin}`
}

const ORIGINE_LABEL: Record<string, string> = {
  auto: 'Auto',
  choix: 'Choix',
  admin: 'Admin',
}

const ORIGINE_CLASS: Record<string, string> = {
  auto: 'bg-blue-100 text-blue-700 border-blue-200',
  choix: 'bg-green-100 text-green-700 border-green-200',
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
}

// ---------------------------------------------------------------------------
// AddInscriptionDialog
// ---------------------------------------------------------------------------

interface AddInscriptionDialogProps {
  stagiaire: User
  adminId: string
  creneaux: Creneau[]
  temps: import('@/types').Temps[]
  onAdded: () => void
}

function AddInscriptionDialog({ stagiaire, adminId, creneaux, temps, onAdded }: AddInscriptionDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedCreneauId, setSelectedCreneauId] = useState<string>('')
  const [selectedTempsId, setSelectedTempsId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter temps by selected creneau
  const filteredTemps = selectedCreneauId
    ? temps.filter(t => t.creneauId === selectedCreneauId)
    : []

  const handleOpenChange = (val: boolean) => {
    if (val) {
      setSelectedCreneauId('')
      setSelectedTempsId('')
      setError(null)
    }
    setOpen(val)
  }

  const handleCreneauChange = (val: string | null) => {
    setSelectedCreneauId(val ?? '')
    setSelectedTempsId('')
  }

  const handleConfirm = async () => {
    if (!selectedCreneauId || !selectedTempsId) {
      setError('Veuillez sélectionner un créneau et un temps.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await inscrireAdmin(stagiaire.uid, selectedTempsId, selectedCreneauId, adminId)
      onAdded()
      setOpen(false)
    } catch (err) {
      console.error('Erreur inscription admin:', err)
      setError("Erreur lors de l'inscription. Veuillez réessayer.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Ajouter une inscription
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Ajouter une inscription — {stagiaire.prenom} {stagiaire.nom}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Stagiaire (read-only) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Stagiaire</span>
            <div className="h-8 rounded-lg border border-input bg-muted/50 px-2.5 py-1 text-sm text-muted-foreground flex items-center">
              {stagiaire.prenom} {stagiaire.nom}
            </div>
          </div>

          {/* Créneau */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Créneau</span>
            <Select value={selectedCreneauId} onValueChange={handleCreneauChange}>
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

          {/* Temps (filtré selon créneau) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Temps</span>
            <Select
              value={selectedTempsId}
              onValueChange={(val: string | null) => setSelectedTempsId(val ?? '')}
              disabled={!selectedCreneauId}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    selectedCreneauId
                      ? filteredTemps.length === 0
                        ? 'Aucun temps dans ce créneau'
                        : 'Choisir un temps'
                      : 'Sélectionner un créneau d\'abord'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredTemps.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter showCloseButton>
          <Button
            onClick={handleConfirm}
            disabled={saving || !selectedCreneauId || !selectedTempsId}
          >
            {saving ? 'Inscription…' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// StagiaireSection
// ---------------------------------------------------------------------------

interface StagiaireSectionProps {
  stagiaire: User
  inscriptions: Inscription[]
  adminId: string
  creneaux: Creneau[]
  temps: import('@/types').Temps[]
  expanded: boolean
  onToggle: () => void
  onRefresh: () => void
}

function StagiaireSection({
  stagiaire,
  inscriptions,
  adminId,
  creneaux,
  temps,
  expanded,
  onToggle,
  onRefresh,
}: StagiaireSectionProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const tempsById = new Map(temps.map(t => [t.id, t]))
  const creneauxById = new Map(creneaux.map(c => [c.id, c]))

  const sortedInscriptions = [...inscriptions].sort((a, b) => {
    const ca = creneauxById.get(a.creneauId)
    const cb = creneauxById.get(b.creneauId)
    if (!ca || !cb) return 0
    if (ca.jour !== cb.jour) return ca.jour.localeCompare(cb.jour)
    return ca.ordre - cb.ordre
  })

  const handleDelete = async (insc: Inscription) => {
    const tempsNom = tempsById.get(insc.tempsId)?.nom ?? insc.tempsId
    const confirmed = window.confirm(
      `Supprimer l'inscription de ${stagiaire.prenom} ${stagiaire.nom} au temps "${tempsNom}" ?`
    )
    if (!confirmed) return
    setDeletingId(insc.id)
    try {
      await desinscireAdmin(insc.id, insc.stagiaireId, insc.creneauId)
    } catch (err) {
      console.error('Erreur désinscription:', err)
      alert('Erreur lors de la suppression. Veuillez réessayer.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Header accordion */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRightIcon className="size-4 text-muted-foreground shrink-0" />
          )}
          <span className="font-medium text-sm">
            {stagiaire.prenom} {stagiaire.nom}
          </span>
          {stagiaire.typeStagiaire && (
            <Badge variant="outline" className="text-xs">
              {stagiaire.typeStagiaire}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0 ml-2">
          {inscriptions.length} inscription{inscriptions.length !== 1 ? 's' : ''}
        </span>
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t px-4 py-3 flex flex-col gap-3">
          {inscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Aucune inscription pour ce stagiaire.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedInscriptions.map(insc => {
                const t = tempsById.get(insc.tempsId)
                const c = creneauxById.get(insc.creneauId)
                return (
                  <div
                    key={insc.id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {t?.nom ?? insc.tempsId}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {c ? formatCreneau(c) : insc.creneauId}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        className={ORIGINE_CLASS[insc.origine] ?? ''}
                      >
                        {ORIGINE_LABEL[insc.origine] ?? insc.origine}
                      </Badge>
                      {insc.verrouille && (
                        <Badge variant="outline" className="text-xs border-amber-300 bg-amber-50 text-amber-700">
                          Verrouillé
                        </Badge>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === insc.id}
                        onClick={() => handleDelete(insc)}
                        className="h-7 px-2 text-xs"
                      >
                        {deletingId === insc.id ? '…' : 'Supprimer'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Bouton ajouter */}
          <div className="pt-1">
            <AddInscriptionDialog
              stagiaire={stagiaire}
              adminId={adminId}
              creneaux={creneaux}
              temps={temps}
              onAdded={onRefresh}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// InscriptionsManager
// ---------------------------------------------------------------------------

export function InscriptionsManager() {
  const { currentUser } = useAuth()
  const [stagiaires, setStagiaires] = useState<User[]>([])
  const [loadingStagiaires, setLoadingStagiaires] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { temps, creneaux, loading: loadingTemps } = useTemps()
  const { inscriptions, loading: loadingInscriptions } = useInscriptions()

  useEffect(() => {
    listStagiaires()
      .then(setStagiaires)
      .catch(console.error)
      .finally(() => setLoadingStagiaires(false))
  }, [])

  const loading = loadingStagiaires || loadingTemps || loadingInscriptions

  // Filter stagiaires by search, sorted Base → Appro then prénom/nom alphabetically
  const filteredStagiaires = stagiaires
    .filter(s => {
      const q = search.toLowerCase()
      return (
        s.nom.toLowerCase().includes(q) ||
        s.prenom.toLowerCase().includes(q) ||
        s.identifiant.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const groupOrder = (u: typeof a) => (u.typeStagiaire === 'Base' ? 0 : 1)
      const groupDiff = groupOrder(a) - groupOrder(b)
      if (groupDiff !== 0) return groupDiff
      const prenomDiff = a.prenom.localeCompare(b.prenom, 'fr', { sensitivity: 'base' })
      if (prenomDiff !== 0) return prenomDiff
      return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
    })

  // Group inscriptions by stagiaireId
  const inscriptionsByStagiaire = new Map<string, Inscription[]>()
  for (const insc of inscriptions) {
    const existing = inscriptionsByStagiaire.get(insc.stagiaireId) ?? []
    existing.push(insc)
    inscriptionsByStagiaire.set(insc.stagiaireId, existing)
  }

  // Alerte: temps avec moins de 4 inscrits
  const inscriptionsByTemps = new Map<string, number>()
  for (const insc of inscriptions) {
    inscriptionsByTemps.set(insc.tempsId, (inscriptionsByTemps.get(insc.tempsId) ?? 0) + 1)
  }
  const tempsUnderMin = temps
    .filter(t => (inscriptionsByTemps.get(t.id) ?? 0) < 4)
    .sort((a, b) => {
      const ca = creneaux.find(c => c.id === a.creneauId)
      const cb = creneaux.find(c => c.id === b.creneauId)
      const keyA = ca ? `${ca.jour}${ca.heureDebut}` : ''
      const keyB = cb ? `${cb.jour}${cb.heureDebut}` : ''
      return keyA.localeCompare(keyB)
    })

  const handleToggle = (uid: string) => {
    setExpandedId(prev => (prev === uid ? null : uid))
  }

  // Called after successful add (inscriptions update via real-time hook)
  const handleRefresh = () => {
    // No manual refresh needed — useInscriptions() is a real-time listener
  }

  if (!currentUser) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Barre de recherche */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Rechercher un stagiaire…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {!loading && (
          <span className="text-sm text-muted-foreground shrink-0">
            {filteredStagiaires.length} stagiaire{filteredStagiaires.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Liste des stagiaires */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Chargement…
        </div>
      ) : filteredStagiaires.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Aucun stagiaire trouvé.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredStagiaires.map(stagiaire => (
            <StagiaireSection
              key={stagiaire.uid}
              stagiaire={stagiaire}
              inscriptions={inscriptionsByStagiaire.get(stagiaire.uid) ?? []}
              adminId={currentUser.uid}
              creneaux={creneaux}
              temps={temps}
              expanded={expandedId === stagiaire.uid}
              onToggle={() => handleToggle(stagiaire.uid)}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}

      {/* Alerte temps sous-peuplés */}
      {!loading && tempsUnderMin.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive mb-2">
            Temps avec moins de 4 inscrits ({tempsUnderMin.length})
          </p>
          <ul className="flex flex-col gap-1">
            {tempsUnderMin.map(t => {
              const count = inscriptionsByTemps.get(t.id) ?? 0
              const creneau = creneaux.find(c => c.id === t.creneauId)
              return (
                <li key={t.id} className="text-sm text-destructive flex items-center gap-2">
                  <span className="font-medium">{t.nom}</span>
                  {creneau && (
                    <span className="text-xs text-muted-foreground">
                      ({formatCreneau(creneau)})
                    </span>
                  )}
                  <Badge variant="destructive" className="text-xs">
                    {count} inscrits
                  </Badge>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
