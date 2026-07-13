'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useTemps } from '@/hooks/useTemps'
import { useInscriptions } from '@/hooks/useInscriptions'
import { usePresences } from '@/hooks/usePresences'
import { validerPresence, annulerPresence } from '@/services/presences'
import { listStagiaires } from '@/services/users'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X, AlertTriangle } from 'lucide-react'
import { PresenceList } from '@/components/presence/PresenceList'
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog'
import { User } from '@/types'

// Session dates: 2026-07-12 → 2026-07-19
const SESSION_DATES: string[] = Array.from({ length: 8 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 6, 12 + i))
  return d.toISOString().slice(0, 10)
})

const JOURS_ABBR = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']

function formatJourLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  const abbr = JOURS_ABBR[d.getUTCDay()]
  const dayNum = String(d.getUTCDate()).padStart(2, '0')
  const monthNum = String(d.getUTCMonth() + 1).padStart(2, '0')
  // Capitalize first letter: "Dim." "Lun." etc.
  return `${abbr.charAt(0).toUpperCase()}${abbr.slice(1)} ${dayNum}/${monthNum}`
}

function getTodayISO(): string {
  const now = new Date()
  return now.toISOString().slice(0, 10)
}

function getDefaultDay(): string {
  const today = getTodayISO()
  if (SESSION_DATES.includes(today)) return today
  return SESSION_DATES[0]
}

const TYPE_BORDER: Record<string, string> = {
  bleu: 'border-l-blue-500',
  orange: 'border-l-orange-500',
  violet: 'border-l-purple-500',
  sans_formation: 'border-l-gray-400',
}

export default function DashboardFormateur() {
  const { currentUser, logout } = useAuth()
  const router = useRouter()
  const { temps, creneaux, loading: loadingTemps } = useTemps()
  const { inscriptions } = useInscriptions()
  const [selectedDay, setSelectedDay] = useState<string>(getDefaultDay)
  const [selectedTempsId, setSelectedTempsId] = useState<string>('')
  const [stagiaires, setStagiaires] = useState<User[]>([])
  const [loadingStagiaires, setLoadingStagiaires] = useState(true)
  const [appelError, setAppelError] = useState<string | null>(null)

  // Load stagiaires once
  useEffect(() => {
    listStagiaires()
      .then(setStagiaires)
      .catch(console.error)
      .finally(() => setLoadingStagiaires(false))
  }, [])

  // Presences for selected temps
  const { presences } = usePresences(selectedTempsId || undefined)

  // Creneaux for the selected day
  const creneauxDuJour = useMemo(
    () => creneaux.filter(c => c.jour === selectedDay),
    [creneaux, selectedDay]
  )

  // Temps for the selected day
  const tempsDuJour = useMemo(() => {
    const creneauIdsDuJour = new Set(creneauxDuJour.map(c => c.id))
    return temps.filter(t => creneauIdsDuJour.has(t.creneauId))
  }, [temps, creneauxDuJour])

  // Reset selected temps when day changes — done in handleDayChange

  // Inscriptions filtered for selected temps
  const inscriptionsDuTemps = useMemo(
    () => inscriptions.filter(i => i.tempsId === selectedTempsId),
    [inscriptions, selectedTempsId]
  )

  // Count inscriptions per temps
  const countInscriptions = useMemo(() => {
    const map: Record<string, number> = {}
    for (const insc of inscriptions) {
      map[insc.tempsId] = (map[insc.tempsId] ?? 0) + 1
    }
    return map
  }, [inscriptions])

  // Temps du jour avec moins de 4 inscrits
  const tempsEnAlerte = useMemo(
    () => tempsDuJour.filter(t => (countInscriptions[t.id] ?? 0) < 4),
    [tempsDuJour, countInscriptions]
  )

  const handleValider = async (stagiaireId: string, inscriptionId: string) => {
    if (!currentUser || !selectedTempsId) return
    setAppelError(null)
    try {
      await validerPresence(stagiaireId, selectedTempsId, currentUser.uid, inscriptionId)
    } catch (err: unknown) {
      console.error('Erreur validation présence:', err)
      const message = err instanceof Error ? err.message : String(err)
      setAppelError(
        message.includes('permission')
          ? 'Permission refusée. Vérifie que ton compte a bien le rôle formateur.'
          : `Erreur lors de la validation : ${message}`
      )
      throw err // re-throw pour que PresenceList affiche l'erreur au bon stagiaire
    }
  }

  const handleAnnuler = async (stagiaireId: string) => {
    if (!currentUser || !selectedTempsId) return
    setAppelError(null)
    try {
      await annulerPresence(stagiaireId, selectedTempsId, currentUser.uid)
    } catch (err: unknown) {
      console.error('Erreur annulation présence:', err)
      const message = err instanceof Error ? err.message : String(err)
      setAppelError(
        message.includes('permission')
          ? 'Permission refusée. Vérifie que ton compte a bien le rôle formateur.'
          : `Erreur lors de l'annulation : ${message}`
      )
      throw err
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 pt-6 pb-4 border-b bg-card flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Formateur</p>
          <h1 className="text-xl font-bold leading-tight">
            {currentUser.prenom} {currentUser.nom}
          </h1>
        </div>
        <div className="flex flex-col gap-1.5 items-end shrink-0 mt-1">
          {currentUser.role === 'admin' && (
            <Button variant="outline" size="sm" onClick={() => router.push('/admin')}>
              ← Admin
            </Button>
          )}
          <ChangePasswordDialog
            identifiant={currentUser.identifiant}
            trigger={<Button variant="outline" size="sm">Mot de passe</Button>}
          />
          <Button variant="outline" size="sm" onClick={async () => { await logout(); router.replace('/login') }}>
            Déconnexion
          </Button>
        </div>
      </header>

      {/* Day filter */}
      <div className="px-4 py-3 border-b bg-card">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {SESSION_DATES.map(date => {
            const isToday = date === getTodayISO()
            const isSelected = date === selectedDay
            return (
              <Button
                key={date}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className={`shrink-0 text-xs px-2 ${isToday && !isSelected ? 'border-primary text-primary' : ''}`}
                onClick={() => { setSelectedDay(date); setSelectedTempsId('') }}
              >
                {formatJourLabel(date)}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 px-4 py-4">
        <Tabs defaultValue="temps">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="temps" className="flex-1">
              Temps
            </TabsTrigger>
            <TabsTrigger value="presences" className="flex-1">
              Présences
            </TabsTrigger>
          </TabsList>

          {/* Onglet Temps */}
          <TabsContent value="temps">
            {!loadingTemps && tempsEnAlerte.length > 0 && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <p className="text-sm font-semibold text-red-700">
                    {tempsEnAlerte.length} temps sous le minimum de participants
                  </p>
                </div>
                <ul className="flex flex-col gap-0.5 pl-6">
                  {tempsEnAlerte.map(t => (
                    <li key={t.id} className="text-xs text-red-600">
                      {t.nom} — {countInscriptions[t.id] ?? 0} inscrit{(countInscriptions[t.id] ?? 0) !== 1 ? 's' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {loadingTemps ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                Chargement…
              </div>
            ) : tempsDuJour.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                Aucun temps pour ce jour.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {tempsDuJour.map(t => {
                  const creneau = creneaux.find(c => c.id === t.creneauId)
                  const nbInscrits = countInscriptions[t.id] ?? 0
                  const alerte = nbInscrits < 4
                  const borderColor = TYPE_BORDER[t.type] ?? 'border-l-gray-400'

                  return (
                    <Card
                      key={t.id}
                      className={`border-l-4 ${borderColor}`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm">{t.nom}</CardTitle>
                          {alerte && (
                            <Badge variant="destructive" className="shrink-0 text-xs">
                              Moins de 4 participants
                            </Badge>
                          )}
                        </div>
                        {creneau && (
                          <p className="text-xs text-muted-foreground">
                            {creneau.heureDebut} – {creneau.heureFin}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">
                          {nbInscrits} inscrit{nbInscrits !== 1 ? 's' : ''}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Onglet Présences */}
          <TabsContent value="presences">
            {/* Sélecteur de temps */}
            <div className="mb-4">
              <Select
                value={selectedTempsId}
                onValueChange={(val) => setSelectedTempsId(val ?? '')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un temps…" />
                </SelectTrigger>
                <SelectContent>
                  {tempsDuJour.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      Aucun temps ce jour
                    </SelectItem>
                  ) : (
                    tempsDuJour.map(t => {
                      const creneau = creneaux.find(c => c.id === t.creneauId)
                      return (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nom}
                          {creneau ? ` (${creneau.heureDebut}–${creneau.heureFin})` : ''}
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Erreur globale appel */}
            {appelError && (
              <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-start justify-between gap-2">
                <span>{appelError}</span>
                <button onClick={() => setAppelError(null)} className="shrink-0 hover:opacity-70" aria-label="Fermer"><X className="h-4 w-4" /></button>
              </div>
            )}

            {/* Liste des présences */}
            {!selectedTempsId ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Sélectionnez un temps pour faire l&apos;appel.
              </div>
            ) : loadingStagiaires ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Chargement des stagiaires…
              </div>
            ) : (
              <PresenceList
                tempsId={selectedTempsId}
                inscriptions={inscriptionsDuTemps}
                presences={presences}
                stagiaires={stagiaires}
                currentUserId={currentUser.uid}
                onValider={handleValider}
                onAnnuler={handleAnnuler}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
