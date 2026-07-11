import { Temps, TypeStagiaire } from '@/types'

export function getTempsVisiblesParStagiaire(temps: Temps[], typeStagiaire: TypeStagiaire): Temps[] {
  return temps.filter(t => {
    if (t.type !== 'bleu') return true
    if (typeStagiaire === 'Base') return t.obligatoireBase
    if (typeStagiaire === 'Approfondissement') return t.obligatoireAppro
    return false
  })
}
