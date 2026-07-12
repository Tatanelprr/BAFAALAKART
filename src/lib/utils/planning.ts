import { Creneau, Temps, TypeStagiaire } from '@/types'

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
