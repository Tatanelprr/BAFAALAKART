import * as XLSX from 'xlsx'
import { generateIdentifiant } from '@/lib/auth/identifiant'
import { generatePassword } from '@/lib/auth/password'
import { UserRole, TypeStagiaire } from '@/types'

export interface ImportRow {
  nom: string
  prenom: string
  typeStagiaire?: TypeStagiaire
}

export interface ImportPlanEntry {
  nom: string
  prenom: string
  identifiant: string
  password: string
  role: UserRole
  typeStagiaire?: TypeStagiaire
  email: string
}

export function parseFile(buffer: ArrayBuffer): Record<string, string>[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
}

export function validateStagiaires(rows: Record<string, string>[]): string | null {
  if (rows.length === 0) return 'Le fichier est vide'
  const first = rows[0]
  const keys = Object.keys(first).map(k => k.trim())
  if (!keys.some(k => k.toLowerCase() === 'nom')) return 'Colonne "Nom" manquante'
  if (!keys.some(k => k.toLowerCase() === 'prénom' || k.toLowerCase() === 'prenom')) return 'Colonne "Prénom" manquante'
  if (!keys.some(k => k.toLowerCase() === 'type')) return 'Colonne "Type" manquante'
  const invalidTypes = rows.filter(r => {
    const type = getCol(r, 'type')
    return type !== 'Base' && type !== 'Approfondissement'
  })
  if (invalidTypes.length > 0) return `Valeurs "Type" invalides — attendu: Base ou Approfondissement`
  return null
}

export function validateFormateurs(rows: Record<string, string>[]): string | null {
  if (rows.length === 0) return 'Le fichier est vide'
  const first = rows[0]
  const keys = Object.keys(first).map(k => k.trim())
  if (!keys.some(k => k.toLowerCase() === 'nom')) return 'Colonne "Nom" manquante'
  if (!keys.some(k => k.toLowerCase() === 'prénom' || k.toLowerCase() === 'prenom')) return 'Colonne "Prénom" manquante'
  return null
}

function getCol(row: Record<string, string>, col: string): string {
  const key = Object.keys(row).find(k => k.trim().toLowerCase() === col.toLowerCase())
  return key ? (row[key] ?? '').trim() : ''
}

export function buildImportPlan(
  rows: Record<string, string>[],
  role: UserRole,
  existingIdentifiants: string[]
): ImportPlanEntry[] {
  const used = [...existingIdentifiants]
  return rows.map(row => {
    const nom = getCol(row, 'nom')
    const prenom = getCol(row, 'prénom') || getCol(row, 'prenom')
    const identifiant = generateIdentifiant(prenom, nom, used)
    used.push(identifiant)
    const password = generatePassword()
    const email = `${identifiant}@bafaalakart.app`
    const entry: ImportPlanEntry = { nom, prenom, identifiant, password, role, email }
    if (role === 'stagiaire') {
      const rawType = getCol(row, 'type')
      entry.typeStagiaire = rawType as TypeStagiaire
    }
    return entry
  })
}

export function generateCredentialsTxt(entries: ImportPlanEntry[]): string {
  const lines = ['BAFAALAKART — Identifiants importés', '='.repeat(40), '']
  for (const e of entries) {
    lines.push(`${e.prenom} ${e.nom}`)
    lines.push(`  Identifiant : ${e.identifiant}`)
    lines.push(`  Mot de passe : ${e.password}`)
    lines.push('')
  }
  return lines.join('\n')
}
