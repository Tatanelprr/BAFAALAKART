import { Creneau, Temps, TypeStagiaire } from '@/types'

export function getCreneauxVisiblesParStagiaire(creneaux: Creneau[], typeStagiaire: TypeStagiaire): Creneau[] {
  if (typeStagiaire === 'Approfondissement') {
    return creneaux.filter(c => !c.baseOnly)
  }
  return creneaux
}

export function getTempsVisiblesParStagiaire(temps: Temps[], typeStagiaire: TypeStagiaire): Temps[] {
  return temps.filter(t => {
    if (t.type !== 'bleu') return true
    if (typeStagiaire === 'Base') return t.obligatoireBase
    if (typeStagiaire === 'Approfondissement') return t.obligatoireAppro
    return false
  })
}
