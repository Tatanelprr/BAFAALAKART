'use client'

import { useState, useRef } from 'react'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore'
import { db, firebaseConfig } from '@/lib/firebase/config'
import { listUsers } from '@/services/users'
import {
  parseFile,
  validateStagiaires,
  validateFormateurs,
  buildImportPlan,
  generateCredentialsTxt,
  type ImportPlanEntry,
} from '@/lib/utils/import'
import { UserRole } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertCircleIcon, CheckCircleIcon, UploadIcon } from 'lucide-react'

type Step = 'select-type' | 'upload' | 'preview' | 'importing' | 'done'

async function createFirebaseUser(email: string, password: string): Promise<string> {
  const appName = `import_${Date.now()}_${Math.random()}`
  const secondary = initializeApp(firebaseConfig, appName)
  const secondaryAuth = getAuth(secondary)
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    return cred.user.uid
  } finally {
    await deleteApp(secondary)
  }
}

async function importEntries(
  entries: ImportPlanEntry[],
  onProgress: (n: number) => void,
  onError: (identifiant: string, message: string) => void
): Promise<void> {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    try {
      const uid = await createFirebaseUser(entry.email, entry.password)
      const batch = writeBatch(db)
      const userDoc = doc(collection(db, 'users'), uid)
      const userData: Record<string, unknown> = {
        uid,
        nom: entry.nom,
        prenom: entry.prenom,
        identifiant: entry.identifiant,
        role: entry.role,
        createdAt: serverTimestamp(),
      }
      if (entry.typeStagiaire) userData.typeStagiaire = entry.typeStagiaire
      batch.set(userDoc, userData)
      await batch.commit()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      onError(entry.identifiant, message)
    }
    onProgress(i + 1)
  }
}

function downloadTxt(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ImportPanel() {
  const [step, setStep] = useState<Step>('select-type')
  const [role, setRole] = useState<UserRole>('stagiaire')
  const [parseError, setParseError] = useState<string | null>(null)
  const [plan, setPlan] = useState<ImportPlanEntry[]>([])
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [credentialsTxt, setCredentialsTxt] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep('select-type')
    setRole('stagiaire')
    setParseError(null)
    setPlan([])
    setProgress(0)
    setErrors({})
    setCredentialsTxt('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleFile(file: File) {
    setParseError(null)
    try {
      const buffer = await file.arrayBuffer()
      const rows = parseFile(buffer)
      const validationError = role === 'stagiaire'
        ? validateStagiaires(rows)
        : validateFormateurs(rows)
      if (validationError) {
        setParseError(validationError)
        return
      }
      const existingUsers = await listUsers()
      const existingIdentifiants = existingUsers.map(u => u.identifiant)
      const importPlan = buildImportPlan(rows, role, existingIdentifiants)
      setPlan(importPlan)
      setStep('preview')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Erreur lors de la lecture du fichier')
    }
  }

  async function handleImport() {
    setStep('importing')
    setProgress(0)
    setErrors({})

    const entryErrors: Record<string, string> = {}
    await importEntries(
      plan,
      (n) => setProgress(n),
      (identifiant, message) => {
        entryErrors[identifiant] = message
        setErrors(prev => ({ ...prev, [identifiant]: message }))
      }
    )

    const txt = generateCredentialsTxt(plan)
    setCredentialsTxt(txt)
    setStep('done')
  }

  // Step 1 — select type
  if (step === 'select-type') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import CSV / XLSX</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sélectionnez le type d&apos;utilisateurs à importer, puis chargez un fichier .csv, .xlsx ou .ods.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setRole('stagiaire')}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                role === 'stagiaire'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              Stagiaires
            </button>
            <button
              type="button"
              onClick={() => setRole('formateur')}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                role === 'formateur'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              Formateurs
            </button>
          </div>
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
            {role === 'stagiaire' ? (
              <>
                <p className="font-medium text-foreground">Colonnes requises :</p>
                <p>Nom · Prénom · Type (Base ou Approfondissement)</p>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">Colonnes requises :</p>
                <p>Nom · Prénom</p>
              </>
            )}
          </div>
          <Button
            className="w-full"
            onClick={() => setStep('upload')}
          >
            Continuer
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Step 2 — upload
  if (step === 'upload') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Import {role === 'stagiaire' ? 'Stagiaires' : 'Formateurs'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {parseError && (
            <Alert variant="destructive">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Erreur de validation</AlertTitle>
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}
          <label
            htmlFor="import-file"
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 p-8 cursor-pointer hover:bg-muted/40 transition-colors"
          >
            <UploadIcon className="size-8 text-muted-foreground" />
            <span className="text-sm font-medium">Cliquer pour choisir un fichier</span>
            <span className="text-xs text-muted-foreground">.csv, .xlsx, .ods</span>
            <input
              ref={fileInputRef}
              id="import-file"
              type="file"
              accept=".csv,.xlsx,.ods"
              className="sr-only"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
          </label>
          <Button variant="outline" className="w-full" onClick={() => setStep('select-type')}>
            Retour
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Step 3 — preview
  if (step === 'preview') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Prévisualisation — {plan.length} utilisateur{plan.length > 1 ? 's' : ''}
            <Badge className="ml-2" variant="secondary">
              {role === 'stagiaire' ? 'Stagiaires' : 'Formateurs'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nom</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Prénom</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Identifiant</th>
                  {role === 'stagiaire' && (
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                  )}
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Mot de passe</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((entry, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2">{entry.nom}</td>
                    <td className="px-3 py-2">{entry.prenom}</td>
                    <td className="px-3 py-2 font-mono text-xs">{entry.identifiant}</td>
                    {role === 'stagiaire' && (
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs">
                          {entry.typeStagiaire}
                        </Badge>
                      </td>
                    )}
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">••••••••</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep('upload')}>
              Retour
            </Button>
            <Button className="flex-1" onClick={handleImport}>
              Confirmer l&apos;import
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Step 4a — importing (progress)
  if (step === 'importing') {
    const percent = plan.length > 0 ? Math.round((progress / plan.length) * 100) : 0
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import en cours…</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Création des comptes : {progress} / {plan.length}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground">{percent}%</p>
        </CardContent>
      </Card>
    )
  }

  // Step 4b — done
  const errorCount = Object.keys(errors).length
  const successCount = plan.length - errorCount

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import terminé</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <CheckCircleIcon className="size-4 text-green-600" />
          <AlertTitle>
            {successCount} compte{successCount > 1 ? 's' : ''} créé{successCount > 1 ? 's' : ''} avec succès
          </AlertTitle>
          {errorCount > 0 && (
            <AlertDescription>
              {errorCount} erreur{errorCount > 1 ? 's' : ''} lors de l&apos;import.
            </AlertDescription>
          )}
        </Alert>

        {errorCount > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
            <p className="text-xs font-medium text-destructive">Identifiants en erreur :</p>
            {Object.entries(errors).map(([id, msg]) => (
              <p key={id} className="text-xs text-muted-foreground">
                <span className="font-mono">{id}</span> — {msg}
              </p>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => downloadTxt(credentialsTxt, `identifiants-import.txt`)}
          >
            Télécharger les identifiants (.txt)
          </Button>
          <Button className="flex-1" onClick={reset}>
            Nouvel import
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
