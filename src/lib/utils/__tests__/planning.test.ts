import { describe, it, expect } from 'vitest'
import { getTempsVisiblesParStagiaire } from '../planning'
import { Temps } from '@/types'

const makeTemps = (overrides: Partial<Temps>): Temps => ({
  id: '1',
  nom: 'Test',
  description: '',
  type: 'bleu',
  creneauId: 'c1',
  obligatoireBase: false,
  obligatoireAppro: false,
  capaciteMin: 4,
  ...overrides,
})

describe('getTempsVisiblesParStagiaire', () => {
  it('inclut tous les temps bleus, qu\'ils soient obligatoires ou non', () => {
    const temps = [
      makeTemps({ obligatoireBase: true, obligatoireAppro: false }),
      makeTemps({ id: '2', obligatoireBase: false, obligatoireAppro: true }),
      makeTemps({ id: '3', obligatoireBase: false, obligatoireAppro: false }),
    ]
    expect(getTempsVisiblesParStagiaire(temps, 'Base')).toHaveLength(3)
    expect(getTempsVisiblesParStagiaire(temps, 'Approfondissement')).toHaveLength(3)
  })

  it('inclut toujours les temps orange, violet, sans_formation', () => {
    const temps = [
      makeTemps({ type: 'orange' }),
      makeTemps({ id: '2', type: 'violet' }),
      makeTemps({ id: '3', type: 'sans_formation' }),
    ]
    expect(getTempsVisiblesParStagiaire(temps, 'Base')).toHaveLength(3)
  })
})
