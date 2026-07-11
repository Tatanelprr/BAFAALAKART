'use client'

import { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { generatePassword } from '@/lib/auth/password'

export default function SeedPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ identifiant: string; password: string; uid: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSeed() {
    setStatus('running')
    setError(null)
    try {
      const identifiant = 'elepareur'
      const password = generatePassword()
      const email = `${identifiant}@bafaalakart.app`

      // Créer le compte Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      const uid = cred.user.uid

      // Créer le document user
      await setDoc(doc(db, 'users', uid), {
        uid,
        nom: 'Lepareur',
        prenom: 'Ethan',
        identifiant,
        role: 'admin',
        createdAt: serverTimestamp(),
      })

      // Créer le document session
      await setDoc(doc(db, 'session', 'current'), {
        nom: 'BAFA À LA CARTE',
        lieu: 'Argentan',
        dateDebut: new Date('2026-07-12'),
        dateFin: new Date('2026-07-19'),
      })

      setResult({ identifiant, password, uid })
      setStatus('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border p-6 max-w-md w-full space-y-4">
        <h1 className="text-xl font-bold">🔧 Seed BAFAALAKART</h1>
        <p className="text-sm text-slate-600">
          Cette page crée le compte admin et la session. À supprimer après utilisation.
        </p>

        {status === 'idle' && (
          <button
            onClick={handleSeed}
            className="w-full bg-slate-900 text-white rounded-lg py-2 px-4 text-sm font-medium hover:bg-slate-700"
          >
            Créer le compte admin elepareur
          </button>
        )}

        {status === 'running' && (
          <p className="text-sm text-slate-500 text-center">Création en cours…</p>
        )}

        {status === 'done' && result && (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <p className="font-semibold text-green-800 mb-2">✅ Compte créé avec succès</p>
              <p><span className="font-medium">Identifiant :</span> {result.identifiant}</p>
              <p><span className="font-medium">Mot de passe :</span> <code className="bg-green-100 px-1 rounded font-mono">{result.password}</code></p>
              <p className="text-xs text-green-600 mt-1">UID : {result.uid}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              ⚠️ Copie ces identifiants dans <code>credentials/admin.txt</code> puis supprime cette page.
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <p className="font-semibold mb-1">❌ Erreur</p>
            <p>{error}</p>
            {error?.includes('email-already-in-use') && (
              <p className="mt-2 text-xs">Le compte existe déjà. Connecte-toi avec l&apos;identifiant existant.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
