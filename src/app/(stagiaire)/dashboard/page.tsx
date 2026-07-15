'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useTemps } from '@/hooks/useTemps'
import { useInscriptions } from '@/hooks/useInscriptions'
import { usePresencesStagiaire } from '@/hooks/usePresences'
import { inscrire, inscrireAtelier, desinscrire } from '@/services/inscriptions'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PlanningView } from '@/components/planning/PlanningView'
import { OnboardingWizard } from '@/components/stagiaire/OnboardingWizard'
import { ObligationsChecklist } from '@/components/stagiaire/ObligationsChecklist'
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog'
import { getCreneauxVisiblesParStagiaire } from '@/lib/utils/planning'
import { X, Calendar, CheckCircle } from 'lucide-react'
import { Temps, Creneau } from '@/types'

const TYPE_BORDER: Record<string, string> = {
  bleu: 'border-l-blue-500',
  orange: 'border-l-orange-500',
  violet: 'border-l-purple-500',
  sans_formation: 'border-l-gray-400',
}

const TYPE_LABEL: Record<string, string> = {
  bleu: 'Bleu',
  orange: 'Orange',
  violet: 'Atelier',
  sans_formation: 'Temps libre',
}

const TYPE_BADGE: Record<string, string> = {
  bleu: 'bg-blue-100 text-blue-700 border-blue-300',
  orange: 'bg-orange-100 text-orange-700 border-orange-300',
  violet: 'bg-purple-100 text-purple-700 border-purple-300',
  sans_formation: 'bg-gray-100 text-gray-600 border-gray-300',
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function DashboardStagiaire() {
  const { currentUser, logout } = useAuth()
  const router = useRouter()
  const { temps, creneaux, ateliers, loading: loadingTemps } = useTemps()
  const uid = currentUser?.uid ?? ''
  const { inscriptions, loading: loadingInscriptions } = useInscriptions(uid)
  const { presences: mesPresences, loading: loadingPresences } = usePresencesStagiaire(uid)

  const [error, setError] = useState<string | null>(null)
  const [isSwapping, setIsSwapping] = useState(false)

  const typeStagiaire = currentUser?.typeStagiaire ?? 'Base'
  const todayISO = useMemo(() => getTodayISO(), [])

  const creneauxVisibles = useMemo(
    () => getCreneauxVisiblesParStagiaire(creneaux, typeStagiaire),
    [creneaux, typeStagiaire]
  )

  // IDs de créneaux où le stagiaire a été marqué présent
  const creneauxConsommes = useMemo(() => {
    const presentsTempsIds = new Set(mesPresences.filter(p => p.present).map(p => p.tempsId))
    const ids = new Set<string>()
    for (const t of temps) {
      if (presentsTempsIds.has(t.id)) ids.add(t.creneauId)
    }
    return ids
  }, [mesPresences, temps])

  // Créneaux encore visibles dans le planning : ni passés, ni consommés par une présence
  const creneauxActifs = useMemo(
    () => creneauxVisibles.filter(c => c.jour >= todayISO && !creneauxConsommes.has(c.id)),
    [creneauxVisibles, todayISO, creneauxConsommes]
  )

  // Temps passés validés, groupés par jour de créneau
  const tempsPresentsParJour = useMemo(() => {
    const presentsTempsIds = new Set(mesPresences.filter(p => p.present).map(p => p.tempsId))
    const byJour: Record<string, Array<{ temps: Temps; creneau: Creneau }>> = {}
    for (const t of temps) {
      if (!presentsTempsIds.has(t.id)) continue
      const creneau = creneaux.find(c => c.id === t.creneauId)
      if (!creneau) continue
      if (!byJour[creneau.jour]) byJour[creneau.jour] = []
      byJour[creneau.jour].push({ temps: t, creneau })
    }
    for (const items of Object.values(byJour)) {
      items.sort((a, b) => a.creneau.heureDebut.localeCompare(b.creneau.heureDebut))
    }
    return byJour
  }, [mesPresences, temps, creneaux])

  const joursPassesAvecPresences = useMemo(
    () => Object.keys(tempsPresentsParJour).sort(),
    [tempsPresentsParJour]
  )

  const totalPresents = useMemo(
    () => Object.values(tempsPresentsParJour).reduce((sum, items) => sum + items.length, 0),
    [tempsPresentsParJour]
  )

  const tempsCreneauMap = useMemo<Record<string, string>>(() => {
    return temps.reduce<Record<string, string>>((acc, t) => {
      acc[t.id] = t.creneauId
      return acc
    }, {})
  }, [temps])

  const allMandatoryBluesCovered = useMemo(() => {
    const coveredIds = new Set(inscriptions.map(i => i.tempsId))
    const covered: Record<string, boolean> = {}
    temps
      .filter(t => t.type === 'bleu' && (typeStagiaire === 'Base' ? t.obligatoireBase : t.obligatoireAppro))
      .forEach(t => {
        const key = (typeStagiaire === 'Base' ? t.groupeBase : t.groupeAppro) ?? t.nom
        if (!covered[key]) covered[key] = false
        if (coveredIds.has(t.id)) covered[key] = true
      })
    return Object.values(covered).every(Boolean)
  }, [temps, inscriptions, typeStagiaire])

  // Le wizard s'affiche s'il reste des créneaux actifs sans inscription, ou des bleus non couverts
  const hasMissingFutureInscriptions = useMemo(
    () => creneauxActifs.some(c => !inscriptions.some(i => i.creneauId === c.id)),
    [creneauxActifs, inscriptions]
  )

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  const handleInscrire = async (tempsId: string, creneauId: string) => {
    if (!uid) return
    setError(null)
    try {
      const tempsItem = temps.find(t => t.id === tempsId)
      if (tempsItem?.type === 'violet' && tempsItem.atelierId) {
        await inscrireAtelier(uid, tempsItem.atelierId)
      } else {
        await inscrire(uid, tempsId, creneauId)
      }
    } catch (err: unknown) {
      console.error('handleInscrire:', err)
      const message = err instanceof Error ? err.message : String(err)
      if (message === 'CRENEAU_OCCUPE') {
        setError('Tu es déjà inscrit(e) à un autre temps sur ce créneau.')
      } else if (message === 'CONFLIT_ATELIER') {
        setError("Cet atelier se déroule sur un créneau que tu as déjà réservé.")
      } else if (message === 'ATELIER_VIDE') {
        setError("Cet atelier n'a pas de sessions configurées. Contacte un formateur.")
      } else {
        const code = (err as { code?: string })?.code
        const detail = code ? `${message} [${code}]` : message
        setError(`Inscription impossible : ${detail}. Rafraîchis la page et réessaie.`)
      }
    }
  }

  const handleChanger = async (inscriptionId: string, creneauId: string, newTempsId: string) => {
    if (!uid) return
    setError(null)
    setIsSwapping(true)
    try {
      await desinscrire(inscriptionId, uid, creneauId)
      const tempsItem = temps.find(t => t.id === newTempsId)
      if (tempsItem?.type === 'violet' && tempsItem.atelierId) {
        await inscrireAtelier(uid, tempsItem.atelierId)
      } else {
        await inscrire(uid, newTempsId, creneauId)
      }
    } catch (err: unknown) {
      console.error('handleChanger:', err)
      const message = err instanceof Error ? err.message : String(err)
      if (message === 'INSCRIPTION_VERROUILEE') {
        setError("Cette inscription est verrouillée par un formateur et ne peut pas être modifiée.")
      } else if (message === 'CRENEAU_OCCUPE') {
        setError('Ce créneau est déjà occupé. Rafraîchis la page et réessaie.')
      } else if (message === 'CONFLIT_ATELIER') {
        setError("Cet atelier entre en conflit avec l'un de tes créneaux déjà réservés.")
      } else {
        const code = (err as { code?: string })?.code
        const detail = code ? `${message} [${code}]` : message
        setError(`Changement impossible : ${detail}. Rafraîchis la page et réessaie.`)
      }
    } finally {
      setIsSwapping(false)
    }
  }

  // Mes ateliers : inscriptions liées à des temps violet
  const mesAteliers = useMemo(() => {
    const ateliersInscrits = new Set<string>()
    inscriptions.forEach(insc => {
      const tempsItem = temps.find(t => t.id === insc.tempsId)
      if (tempsItem?.type === 'violet' && tempsItem.atelierId) {
        ateliersInscrits.add(tempsItem.atelierId)
      }
    })
    return ateliers.filter(a => ateliersInscrits.has(a.id))
  }, [inscriptions, temps, ateliers])

  const loading = loadingTemps || loadingInscriptions || loadingPresences

  if (!currentUser) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Chargement du profil…
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 pt-6 pb-5 bg-gradient-to-br from-orange-500 to-amber-400 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-white/70 mb-0.5">Bonjour,</p>
          <h1 className="text-xl font-bold leading-tight text-white">
            {currentUser.prenom.charAt(0).toUpperCase() + currentUser.prenom.slice(1).toLowerCase()}{' '}
            <span className="uppercase">{currentUser.nom}</span>
          </h1>
          <p className="text-xs text-white/70 mt-1">
            Groupe{' '}
            <span className="font-semibold text-white">{typeStagiaire}</span>
          </p>
        </div>
        <div className="flex flex-col gap-1.5 items-end shrink-0 mt-1">
          <ChangePasswordDialog
            identifiant={currentUser.identifiant}
            trigger={
              <Button variant="outline" size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                Mot de passe
              </Button>
            }
          />
          <Button variant="outline" size="sm" onClick={handleLogout}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30">
            Déconnexion
          </Button>
        </div>
      </header>

      {/* Error alert */}
      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-start justify-between gap-2">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="shrink-0 font-medium hover:underline"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 py-4">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Chargement du planning…
          </div>
        ) : !isSwapping && (hasMissingFutureInscriptions || !allMandatoryBluesCovered) ? (
          <OnboardingWizard
            creneaux={creneauxActifs}
            temps={temps}
            ateliers={ateliers}
            inscriptions={inscriptions}
            stagiaireId={uid}
            typeStagiaire={typeStagiaire}
          />
        ) : (
          <Tabs defaultValue="planning">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="planning" className="flex-1">
                Planning
              </TabsTrigger>
              <TabsTrigger value="ateliers" className="flex-1">
                Ateliers
                {mesAteliers.length > 0 && (
                  <Badge className="ml-1.5 bg-purple-100 text-purple-700 border-purple-300 h-4 px-1.5 text-[10px]">
                    {mesAteliers.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="obligations" className="flex-1">
                Bleus
              </TabsTrigger>
              <TabsTrigger value="passe" className="flex-1">
                Passé
                {totalPresents > 0 && (
                  <Badge className="ml-1.5 bg-green-100 text-green-700 border-green-300 h-4 px-1.5 text-[10px]">
                    {totalPresents}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="planning">
              <PlanningView
                creneaux={creneauxActifs}
                temps={temps}
                ateliers={ateliers}
                inscriptions={inscriptions}
                stagiaireId={uid}
                typeStagiaire={typeStagiaire}
                tempsCreneauMap={tempsCreneauMap}
                onInscrire={handleInscrire}
                onChanger={handleChanger}
              />
            </TabsContent>

            <TabsContent value="obligations">
              <ObligationsChecklist
                temps={temps}
                coveredTempsIds={new Set(inscriptions.map(i => i.tempsId))}
                occupiedCreneaux={Object.fromEntries(inscriptions.map(i => [i.creneauId, i.tempsId]))}
                typeStagiaire={typeStagiaire}
              />
            </TabsContent>

            <TabsContent value="ateliers">
              {mesAteliers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Vous n&apos;êtes inscrit à aucun atelier pour le moment.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {mesAteliers.map(atelier => {
                    const tempsAtelier = temps.filter(
                      t => t.type === 'violet' && t.atelierId === atelier.id
                    )
                    const creneauxAtelier = creneaux.filter(c =>
                      tempsAtelier.some(t => t.creneauId === c.id)
                    )
                    return (
                      <div
                        key={atelier.id}
                        className="rounded-xl border border-purple-200 bg-purple-50 p-3 sm:p-4"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-sm">{atelier.nom}</h3>
                          <Badge className="bg-purple-100 text-purple-700 border-purple-300 shrink-0">
                            Atelier
                          </Badge>
                        </div>
                        {atelier.description && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {atelier.description}
                          </p>
                        )}
                        {creneauxAtelier.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {creneauxAtelier.map(c => (
                              <p key={c.id} className="text-xs text-purple-800">
                                <Calendar className="inline h-3 w-3 mr-1" />{formatJourCourt(c.jour)} · {c.heureDebut}–{c.heureFin}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="passe">
              {joursPassesAvecPresences.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Aucun temps validé pour l&apos;instant.
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {joursPassesAvecPresences.map(jour => (
                    <section key={jour}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-border" />
                        <h2 className="text-sm font-semibold text-foreground shrink-0">
                          {formatJourCourt(jour)}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div className="flex flex-col gap-2">
                        {tempsPresentsParJour[jour].map(({ temps: t, creneau: c }) => (
                          <div
                            key={t.id}
                            className={`rounded-lg border border-l-4 ${TYPE_BORDER[t.type] ?? 'border-l-gray-400'} bg-card p-3`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-snug">{t.nom}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {c.heureDebut}–{c.heureFin}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge className={`text-[10px] h-4 px-1.5 ${TYPE_BADGE[t.type] ?? 'bg-gray-100 text-gray-600'}`}>
                                  {TYPE_LABEL[t.type] ?? t.type}
                                </Badge>
                                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

const JOURS_SEMAINE = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const MOIS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]

function formatJourCourt(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return `${JOURS_SEMAINE[date.getUTCDay()]} ${date.getUTCDate()} ${MOIS[date.getUTCMonth()]}`
}
