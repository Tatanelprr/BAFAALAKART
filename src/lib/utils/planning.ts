import { Creneau, Inscription, Temps, TypeStagiaire } from '@/types'

export function getCreneauxVisiblesParStagiaire(creneaux: Creneau[], typeStagiaire: TypeStagiaire): Creneau[] {
  if (typeStagiaire === 'Approfondissement') {
    return creneaux.filter(c => !c.baseOnly)
  }
  return creneaux
}

export function getTempsVisiblesParStagiaire(temps: Temps[], _typeStagiaire: TypeStagiaire): Temps[] {
  // Tous les temps sont proposés au choix, quelle que soit leur obligatoire.
  // L'aspect obligatoire est géré uniquement par ObligationsChecklist et la validation du wizard.
  return temps
}

/**
 * Calcule les topics obligatoires qui deviendraient non couverts après un swap.
 * Simule le remplacement de ancienTempsId par newTempsId dans les inscriptions.
 * Retourne la liste des libellés de topics qui ne seraient plus couverts.
 */
export function topicsNonCouvreesApresSwap(
  temps: Temps[],
  inscriptions: Inscription[],
  typeStagiaire: TypeStagiaire,
  ancienTempsId: string,
  newTempsId: string
): string[] {
  // Topics obligatoires groupés par clé
  const mandatoryTopics: Record<string, { ids: string[]; label: string }> = {}
  temps
    .filter(t =>
      t.type === 'bleu' &&
      (typeStagiaire === 'Base' ? t.obligatoireBase : t.obligatoireAppro)
    )
    .forEach(t => {
      const groupe = typeStagiaire === 'Base' ? t.groupeBase : t.groupeAppro
      const key = groupe ?? t.nom
      if (!mandatoryTopics[key]) {
        mandatoryTopics[key] = { ids: [], label: t.libelleGroupe ?? t.nom }
      }
      mandatoryTopics[key].ids.push(t.id)
    })

  // Inscriptions simulées après le swap
  const simulatedIds = new Set(
    inscriptions
      .map(i => i.tempsId === ancienTempsId ? newTempsId : i.tempsId)
  )

  // Topics non couverts après le swap
  return Object.values(mandatoryTopics)
    .filter(({ ids }) => !ids.some(id => simulatedIds.has(id)))
    .map(({ label }) => label)
}
