import { describe, it, expect } from 'vitest'
import { generatePassword } from '../password'

describe('generatePassword', () => {
  it('retourne une chaîne de 12 caractères', () => {
    expect(generatePassword()).toHaveLength(12)
  })

  it('ne contient que des caractères alphanumériques', () => {
    const pwd = generatePassword()
    expect(/^[a-zA-Z0-9]+$/.test(pwd)).toBe(true)
  })

  it('génère des mots de passe différents', () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generatePassword()))
    expect(passwords.size).toBeGreaterThan(10)
  })
})
