'use client'

import { Creneau, Temps, Atelier, Inscription, TypeStagiaire } from '@/types'
import { CreneauCard } from './CreneauCard'

interface PlanningViewProps {
  creneaux: Creneau[]
  temps: Temps[]
  ateliers: Atelier[]
  inscriptions: Inscription[]
  stagiaireId: string
  typeStagiaire: TypeStagiaire
  tempsCreneauMap: Record<string, string>
  onInscrire: (tempsId: string, creneauId: string) => Promise<void>
  onDesinscrire: (inscriptionId: string, creneauId: string) => Promise<void>
}

const JOURS_SEMAINE = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

function formatJour(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  // Use UTC to avoid timezone shifting the date
  const date = new Date(Date.UTC(year, month - 1, day))
  const nomJour = JOURS_SEMAINE[date.getUTCDay()]
  const nomMois = MOIS[date.getUTCMonth()]
  const nomJourCapitalized = nomJour.charAt(0).toUpperCase() + nomJour.slice(1)
  return `${nomJourCapitalized} ${date.getUTCDate()} ${nomMois}`
}

export function PlanningView({
  creneaux,
  temps,
  ateliers: _ateliers,
  inscriptions,
  stagiaireId,
  typeStagiaire,
  tempsCreneauMap,
  onInscrire,
  onDesinscrire,
}: PlanningViewProps) {
  // Group creneaux by jour
  const creneauxParJour = creneaux.reduce<Record<string, Creneau[]>>((acc, creneau) => {
    const jour = creneau.jour
    if (!acc[jour]) acc[jour] = []
    acc[jour].push(creneau)
    return acc
  }, {})

  const jours = Object.keys(creneauxParJour).sort()

  if (jours.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Aucun créneau disponible.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {jours.map(jour => (
        <section key={jour}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-border" />
            <h2 className="text-sm font-semibold text-foreground shrink-0">
              {formatJour(jour)}
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-col gap-1">
            {creneauxParJour[jour].map(creneau => (
              <CreneauCard
                key={creneau.id}
                creneau={creneau}
                tempsListe={temps}
                inscriptions={inscriptions}
                stagiaireId={stagiaireId}
                typeStagiaire={typeStagiaire}
                tempsCreneauMap={tempsCreneauMap}
                onInscrire={onInscrire}
                onDesinscrire={onDesinscrire}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
