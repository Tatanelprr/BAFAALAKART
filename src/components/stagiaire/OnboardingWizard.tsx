'use client'

import { useState, useMemo } from 'react'
import { Creneau, Temps, Atelier, Inscription, TypeStagiaire } from '@/types'
import { inscrire, inscrireAtelier, desinscrire } from '@/services/inscriptions'
import { getTempsVisiblesParStagiaire } from '@/lib/utils/planning'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ObligationsChecklist } from './ObligationsChecklist'

interface Props {
  creneaux: Creneau[]
  temps: Temps[]
  ateliers: Atelier[]
  inscriptions: Inscription[]
  stagiaireId: string
  typeStagiaire: TypeStagiaire
}

const colorsByType = {
  bleu: 'border-blue-200 bg-blue-50',
  orange: 'border-orange-200 bg-orange-50',
  violet: 'border-purple-200 bg-purple-50',
  sans_formation: 'border-slate-200 bg-slate-50',
}

const JOURS_ABBR = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const MOIS_ABBR = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]

function formatJourLong(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  const abbr = JOURS_ABBR[d.getUTCDay()]
  const mois = MOIS_ABBR[d.getUTCMonth()]
  return `${abbr.charAt(0).toUpperCase()}${abbr.slice(1)} ${d.getUTCDate()} ${mois}`
}

export function OnboardingWizard({
  creneaux,
  temps,
  ateliers: _ateliers,
  inscriptions,
  stagiaireId,
  typeStagiaire,
}: Props) {
  // Pré-remplir toutes les inscriptions existantes
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    inscriptions.forEach(i => { init[i.creneauId] = i.tempsId })
    return init
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Creneaux grouped by jour, sorted
  const creneauxParJour = useMemo(() => {
    const map: Record<string, Creneau[]> = {}
    creneaux.forEach(c => {
      if (!map[c.jour]) map[c.jour] = []
      map[c.jour].push(c)
    })
    return map
  }, [creneaux])

  const jours = useMemo(() => Object.keys(creneauxParJour).sort(), [creneauxParJour])

  // Mandatory blue topics grouped by nom
  const mandatoryTopics = useMemo(() => {
    const map: Record<string, string[]> = {} // clé → [tempsId, ...]
    temps
      .filter(t =>
        t.type === 'bleu' &&
        (typeStagiaire === 'Base' ? t.obligatoireBase : t.obligatoireAppro)
      )
      .forEach(t => {
        // groupeBase/groupeAppro = "1 parmi ce groupe suffit"
        const groupe = typeStagiaire === 'Base' ? t.groupeBase : t.groupeAppro
        const key = groupe ?? t.nom
        if (!map[key]) map[key] = []
        map[key].push(t.id)
      })
    return map
  }, [temps, typeStagiaire])

  const coveredTopics = useMemo(() => {
    const selectedIds = new Set(Object.values(selections))
    return new Set(
      Object.entries(mandatoryTopics)
        .filter(([, ids]) => ids.some(id => selectedIds.has(id)))
        .map(([nom]) => nom)
    )
  }, [selections, mandatoryTopics])

  const totalTopics = Object.keys(mandatoryTopics).length
  const coveredCount = coveredTopics.size
  const allCovered = totalTopics === 0 || coveredCount >= totalTopics

  // Détecte si un topic obligatoire est inaccessible (tous ses créneaux pris par un autre temps)
  const selectedIds = new Set(Object.values(selections))
  const anyImpossible = useMemo(() => {
    return Object.entries(mandatoryTopics).some(([, ids]) => {
      if (ids.some(id => selectedIds.has(id))) return false
      return ids.every(id => {
        const t = temps.find(t => t.id === id)
        if (!t) return true
        const occupying = selections[t.creneauId]
        return occupying !== undefined && occupying !== id
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mandatoryTopics, selections, temps])

  // Creneaux already inscribed in Firestore
  const existingByCreneauId = useMemo(() => {
    const map: Record<string, Inscription> = {}
    inscriptions.forEach(i => { map[i.creneauId] = i })
    return map
  }, [inscriptions])

  const handleSelect = (creneauId: string, tempsId: string) => {
    const existing = existingByCreneauId[creneauId]
    if (existing?.verrouille) return

    const t = temps.find(t => t.id === tempsId)

    setSelections(prev => {
      const next = { ...prev }

      // Si le créneau avait une sélection violette → décocher tout l'atelier d'abord
      const currentTempsId = next[creneauId]
      if (currentTempsId) {
        const currentTemps = temps.find(t => t.id === currentTempsId)
        if (currentTemps?.type === 'violet' && currentTemps.atelierId) {
          temps
            .filter(at => at.atelierId === currentTemps.atelierId && at.type === 'violet')
            .forEach(at => { delete next[at.creneauId] })
        }
      }

      // Appliquer la nouvelle sélection
      if (t?.type === 'violet' && t.atelierId) {
        // Auto-sélectionner tous les créneaux de l'atelier
        temps
          .filter(at => at.atelierId === t.atelierId && at.type === 'violet')
          .forEach(at => {
            if (!existingByCreneauId[at.creneauId]?.verrouille) {
              next[at.creneauId] = at.id
            }
          })
      } else {
        next[creneauId] = tempsId
      }

      return next
    })
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    // Creneaux traités dans ce batch (pour éviter double-booking)
    const bookedInBatch = new Set<string>()

    try {
      // === PASSE 1 : ateliers (violet multi-créneaux) ===
      const processedAteliers = new Set<string>()

      for (const tempsId of Object.values(selections)) {
        const t = temps.find(t => t.id === tempsId)
        if (!t || t.type !== 'violet' || !t.atelierId) continue
        if (processedAteliers.has(t.atelierId)) continue
        processedAteliers.add(t.atelierId)

        const tempsAtelier = temps.filter(at => at.atelierId === t.atelierId && at.type === 'violet')

        // Vérifier créneau par créneau
        const tousInscrits = tempsAtelier.every(at => existingByCreneauId[at.creneauId]?.tempsId === at.id)
        if (tousInscrits) {
          tempsAtelier.forEach(at => bookedInBatch.add(at.creneauId))
          continue
        }

        // Savoir si certains creneaux ont déjà le bon temps (déjà verrouillés)
        const certainsDejaInscrits = tempsAtelier.some(at => existingByCreneauId[at.creneauId]?.tempsId === at.id)

        // Libérer les creneaux qui ont un AUTRE temps (non verrouillé)
        for (const at of tempsAtelier) {
          const existing = existingByCreneauId[at.creneauId]
          if (existing && existing.tempsId !== at.id && !existing.verrouille) {
            await desinscrire(existing.id, stagiaireId, at.creneauId)
          }
        }

        if (certainsDejaInscrits) {
          // Atelier partiellement inscrit : on inscrit créneau par créneau les manquants
          // (inscrireAtelier vérifie tous les slots atomiquement, ça échouerait)
          for (const at of tempsAtelier) {
            const existing = existingByCreneauId[at.creneauId]
            if (existing?.tempsId === at.id) {
              // Déjà bon
            } else if (!existing || !existing.verrouille) {
              await inscrire(stagiaireId, at.id, at.creneauId)
            }
            bookedInBatch.add(at.creneauId)
          }
        } else {
          // Tous les creneaux sont libres : inscrireAtelier atomique
          await inscrireAtelier(stagiaireId, t.atelierId)
          tempsAtelier.forEach(at => bookedInBatch.add(at.creneauId))
        }
      }

      // === PASSE 2 : temps orange / bleu / sans_formation ===
      for (const [creneauId, tempsId] of Object.entries(selections)) {
        if (bookedInBatch.has(creneauId)) continue

        const existing = existingByCreneauId[creneauId]
        if (existing) {
          if (existing.tempsId === tempsId) continue   // déjà bon
          if (existing.verrouille) continue            // verrouillé, on ne touche pas
          await desinscrire(existing.id, stagiaireId, creneauId)
        }

        const t = temps.find(t => t.id === tempsId)
        if (!t) continue
        await inscrire(stagiaireId, tempsId, creneauId)
        bookedInBatch.add(creneauId)
      }
    } catch (err: unknown) {
      console.error('Wizard submit error:', err)
      const message = err instanceof Error ? err.message : String(err)
      if (message === 'CRENEAU_OCCUPE') {
        setError('Un créneau est déjà réservé par quelqu\'un d\'autre. Rafraîchis la page et réessaie.')
      } else if (message === 'CONFLIT_ATELIER') {
        setError("L'atelier que tu as choisi se déroule sur un créneau déjà réservé. Change un de tes choix.")
      } else if (message === 'ATELIER_VIDE') {
        setError("L'atelier sélectionné n'a pas de sessions configurées. Contacte un formateur ou un admin.")
      } else if (message === 'INSCRIPTION_VERROUILEE') {
        setError("Une inscription verrouillée bloque la modification. Contacte un formateur.")
      } else {
        setError(`Erreur lors de l'envoi : ${message}. Rafraîchis la page et réessaie, ou contacte un admin si le problème persiste.`)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Sticky header — blue coverage progress */}
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-3">
        <p className="text-sm font-semibold">Construis ton planning</p>
        {totalTopics > 0 && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex gap-0.5">
              {Array.from({ length: totalTopics }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-4 rounded-full transition-colors ${
                    i < coveredCount ? 'bg-blue-500' : 'bg-blue-100'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {coveredCount}/{totalTopics} bleus couverts
            </span>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 px-4 py-4 pb-28 flex flex-col gap-6">
        {/* Checklist des obligations */}
        <ObligationsChecklist
          temps={temps}
          coveredTempsIds={new Set(Object.values(selections))}
          occupiedCreneaux={selections}
          typeStagiaire={typeStagiaire}
        />

        {jours.map(jour => (
          <section key={jour}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-border" />
              <h2 className="text-sm font-semibold text-foreground shrink-0">
                {formatJourLong(jour)}
              </h2>
              <div className="h-px flex-1 bg-border" />
            </div>

            {creneauxParJour[jour].map(creneau => {
              const visibles = getTempsVisiblesParStagiaire(
                temps.filter(t => t.creneauId === creneau.id),
                typeStagiaire
              )
              if (visibles.length === 0) return null

              const selected = selections[creneau.id]
              const existingInscription = existingByCreneauId[creneau.id]
              const isVerrouille = existingInscription?.verrouille ?? false

              return (
                <div key={creneau.id} className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    {creneau.heureDebut} – {creneau.heureFin}
                    {isVerrouille && (
                      <span className="ml-2 text-slate-400" title="Inscription verrouillée">🔒</span>
                    )}
                  </p>
                  <div className="flex flex-col gap-2">
                    {visibles.map(t => {
                      const isSelected = selected === t.id
                      const isMandatoryBlue =
                        t.type === 'bleu' &&
                        (typeStagiaire === 'Base' ? t.obligatoireBase : t.obligatoireAppro)

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelect(creneau.id, t.id)}
                          disabled={isVerrouille}
                          className={[
                            'w-full text-left rounded-lg border-2 p-3 transition-all',
                            colorsByType[t.type],
                            isSelected
                              ? 'border-blue-400 ring-2 ring-blue-200 ring-offset-1'
                              : 'border-transparent hover:border-current/20',
                            isVerrouille ? 'cursor-default opacity-70' : 'cursor-pointer',
                          ].join(' ')}
                        >
                          <div className="flex items-start gap-2">
                            {/* Radio dot */}
                            <span
                              className={[
                                'mt-0.5 h-4 w-4 rounded-full border-2 shrink-0',
                                isSelected
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'bg-white border-slate-300',
                              ].join(' ')}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <p className="text-sm font-medium leading-snug">{t.nom}</p>
                                <div className="flex gap-1 shrink-0">
                                  {isMandatoryBlue && (
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-[10px] h-4 px-1">
                                      Obligatoire
                                    </Badge>
                                  )}
                                  {t.type === 'violet' && (
                                    <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-[10px] h-4 px-1">
                                      Atelier
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {t.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {t.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </section>
        ))}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t px-4 py-3 flex flex-col gap-2">
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        {anyImpossible && (
          <p className="text-xs text-red-600 font-medium">
            Un temps obligatoire n&apos;est plus accessible — modifie tes choix.
          </p>
        )}
        {!allCovered && !anyImpossible && (
          <p className="text-xs text-amber-600">
            {totalTopics - coveredCount} temps bleu
            {totalTopics - coveredCount > 1 ? 's' : ''} obligatoire
            {totalTopics - coveredCount > 1 ? 's' : ''} non couverts
          </p>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!allCovered || anyImpossible || saving}
          className="w-full"
        >
          {saving ? 'Enregistrement…' : 'Valider mon planning'}
        </Button>
      </div>
    </div>
  )
}
