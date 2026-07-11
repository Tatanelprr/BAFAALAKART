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
  it('inclut temps bleu obligatoireBase pour stagiaire Base', () => {
    const temps = [makeTemps({ obligatoireBase: true, obligatoireAppro: false })]
    const result = getTempsVisiblesParStagiaire(temps, 'Base')
    expect(result).toHaveLength(1)
  })

  it('exclut temps bleu non obligatoireBase pour stagiaire Base', () => {
    const temps = [makeTemps({ obligatoireBase: false, obligatoireAppro: true })]
    const result = getTempsVisiblesParStagiaire(temps, 'Base')
    expect(result).toHaveLength(0)
  })

  it('inclut temps bleu obligatoireAppro pour stagiaire Approfondissement', () => {
    const temps = [makeTemps({ obligatoireBase: false, obligatoireAppro: true })]
    const result = getTempsVisiblesParStagiaire(temps, 'Approfondissement')
    expect(result).toHaveLength(1)
  })

  it('inclut temps bleu pour les deux si les deux obligatoires', () => {
    const temps = [makeTemps({ obligatoireBase: true, obligatoireAppro: true })]
    expect(getTempsVisiblesParStagiaire(temps, 'Base')).toHaveLength(1)
    expect(getTempsVisiblesParStagiaire(temps, 'Approfondissement')).toHaveLength(1)
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
