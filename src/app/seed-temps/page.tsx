'use client'

import { useState } from 'react'
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

// ─── Données parsées depuis "Liste temps.xlsx" ───────────────────────────────

const ATELIERS_DATA = [
  { key: 'spectacle', nom: 'Spectacle', description: '' },
  { key: 'jeu_intermediaire', nom: 'Animer un jeu intermédiaire', description: '' },
  { key: 'cv_creatif', nom: 'Atelier CV créatif', description: '' },
]

// heureDebut → heureFin (durée ~1h30)
const CRENEAUX_DATA = [
  { key: 'c13_11', jour: '2026-07-13', heureDebut: '11:00', heureFin: '12:30', ordre: 1 },
  { key: 'c13_14', jour: '2026-07-13', heureDebut: '14:00', heureFin: '15:30', ordre: 2 },
  { key: 'c13_15', jour: '2026-07-13', heureDebut: '15:00', heureFin: '16:30', ordre: 3 },
  { key: 'c14_9h30', jour: '2026-07-14', heureDebut: '09:30', heureFin: '11:00', ordre: 1 },
  { key: 'c14_11', jour: '2026-07-14', heureDebut: '11:00', heureFin: '12:30', ordre: 2 },
  { key: 'c14_13h30', jour: '2026-07-14', heureDebut: '13:30', heureFin: '15:00', ordre: 3 },
  { key: 'c14_15', jour: '2026-07-14', heureDebut: '15:00', heureFin: '16:30', ordre: 4 },
  { key: 'c15_9h30', jour: '2026-07-15', heureDebut: '09:30', heureFin: '11:00', ordre: 1 },
  { key: 'c15_11', jour: '2026-07-15', heureDebut: '11:00', heureFin: '12:30', ordre: 2 },
  { key: 'c15_13h30', jour: '2026-07-15', heureDebut: '13:30', heureFin: '15:00', ordre: 3 },
  { key: 'c15_15', jour: '2026-07-15', heureDebut: '15:00', heureFin: '16:30', ordre: 4 },
  { key: 'c16_9', jour: '2026-07-16', heureDebut: '09:00', heureFin: '10:30', ordre: 1 },
  { key: 'c16_17', jour: '2026-07-16', heureDebut: '17:00', heureFin: '18:30', ordre: 2 },
  { key: 'c17_9h30', jour: '2026-07-17', heureDebut: '09:30', heureFin: '11:00', ordre: 1 },
  { key: 'c17_11', jour: '2026-07-17', heureDebut: '11:00', heureFin: '12:30', ordre: 2 },
  { key: 'c18_9', jour: '2026-07-18', heureDebut: '09:00', heureFin: '10:30', ordre: 1 },
  { key: 'c18_13h30', jour: '2026-07-18', heureDebut: '13:30', heureFin: '15:00', ordre: 2 },
  { key: 'c19_9h30', jour: '2026-07-19', heureDebut: '09:30', heureFin: '11:00', ordre: 1 },
]

// type: 'bleu' | 'orange' | 'violet'
// atelierId: clé de ATELIERS_DATA (sera remplacée par le vrai ID)
// obligatoireBase / obligatoireAppro : true par défaut pour les bleus (à ajuster via admin si besoin)
const TEMPS_DATA: {
  creneau: string
  nom: string
  type: 'bleu' | 'orange' | 'violet'
  obligatoireBase?: boolean
  obligatoireAppro?: boolean
  atelierKey?: string
}[] = [
  // 13/07 11h
  { creneau: 'c13_11', nom: "Connaissance de l'enfant 3-5 ans", type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c13_11', nom: "Connaissance de l'enfant 10-14 ans", type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c13_11', nom: 'Règlementation générale', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c13_11', nom: 'Imaginaire et interprétation de personnages', type: 'orange' },
  // 13/07 14h
  { creneau: 'c13_14', nom: 'Initiation au jeu', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c13_14', nom: 'Projets', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c13_14', nom: 'Fonction sanitaire', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c13_14', nom: '«Où trouver l\'info ?»', type: 'orange' },
  // 13/07 15h
  { creneau: 'c13_15', nom: 'Initiation au jeu', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c13_15', nom: 'Règlementation générale', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c13_15', nom: 'Liberté Autorité Sanction', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c13_15', nom: 'Imaginaire et interprétation de personnages', type: 'orange' },
  // 14/07 9h30
  { creneau: 'c14_9h30', nom: 'Règlementation générale', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c14_9h30', nom: 'Initiation au jeu', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c14_9h30', nom: 'Handicap et inclusion', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c14_9h30', nom: '«Où trouver l\'info ?»', type: 'orange' },
  // 14/07 11h
  { creneau: 'c14_11', nom: "Connaissance de l'enfant 6-9 ans", type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c14_11', nom: 'Violences sexistes et sexuelles', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c14_11', nom: 'Maltraitance', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c14_11', nom: 'Travailler en équipe', type: 'orange' },
  // 14/07 13h30
  { creneau: 'c14_13h30', nom: 'Liberté Autorité Sanction', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c14_13h30', nom: 'Règlementation baignade et animation dans l\'eau', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c14_13h30', nom: 'Publics en difficulté', type: 'orange' },
  { creneau: 'c14_13h30', nom: 'Vie quotidienne en séjour', type: 'orange' },
  // 14/07 15h
  { creneau: 'c14_15', nom: 'Handicap et inclusion', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c14_15', nom: 'Fonction sanitaire', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c14_15', nom: 'Animer les repas et les activités cuisine', type: 'orange' },
  { creneau: 'c14_15', nom: 'Publics en difficulté', type: 'orange' },
  // 15/07 9h30
  { creneau: 'c15_9h30', nom: 'Passage en petit jeu ou chant', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c15_9h30', nom: 'Projets', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c15_9h30', nom: 'Spectacle', type: 'violet', atelierKey: 'spectacle' },
  { creneau: 'c15_9h30', nom: 'Animer un jeu intermédiaire', type: 'violet', atelierKey: 'jeu_intermediaire' },
  // 15/07 11h
  { creneau: 'c15_11', nom: 'Règlementation : baignade et animer dans l\'eau', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c15_11', nom: 'Règlementation : Activités sportives, Camping et Feu', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c15_11', nom: "L'éducation populaire", type: 'orange' },
  { creneau: 'c15_11', nom: 'Retour stage pratique bonus', type: 'orange' },
  // 15/07 13h30
  { creneau: 'c15_13h30', nom: 'Débats et mises en situation', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c15_13h30', nom: 'Maltraitance', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c15_13h30', nom: 'Violences sexistes et sexuelles', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c15_13h30', nom: 'Spectacle', type: 'violet', atelierKey: 'spectacle' },
  // 15/07 15h
  { creneau: 'c15_15', nom: 'Débats et mises en situation', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c15_15', nom: 'Passage en petit jeu ou chant', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c15_15', nom: '«Trouver du taff»', type: 'orange' },
  { creneau: 'c15_15', nom: 'Création de costumes', type: 'orange' },
  // 16/07 9h
  { creneau: 'c16_9', nom: 'Passage en petit jeu ou chant', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c16_9', nom: 'Maltraitance', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c16_9', nom: 'Animer à la mer', type: 'orange' },
  { creneau: 'c16_9', nom: 'Spectacle', type: 'violet', atelierKey: 'spectacle' },
  // 16/07 17h
  { creneau: 'c16_17', nom: 'Projets', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c16_17', nom: 'Règlementation : Activités sportives, camping et feu', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c16_17', nom: 'Violences sexistes et sexuelles', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c16_17', nom: "Inégalités de genre dans l'animation", type: 'orange' },
  // 17/07 9h30
  { creneau: 'c17_9h30', nom: 'Passage en petit jeu ou chant', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c17_9h30', nom: 'Fonction sanitaire', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c17_9h30', nom: 'Spectacle', type: 'violet', atelierKey: 'spectacle' },
  { creneau: 'c17_9h30', nom: 'Animer un jeu intermédiaire', type: 'violet', atelierKey: 'jeu_intermediaire' },
  // 17/07 11h
  { creneau: 'c17_11', nom: 'Passage en petit jeu ou chant', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c17_11', nom: 'Débats et mises en situation', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c17_11', nom: '«Trouver du taff»', type: 'orange' },
  { creneau: 'c17_11', nom: 'Atelier CV créatif', type: 'violet', atelierKey: 'cv_creatif' },
  // 18/07 9h
  { creneau: 'c18_9', nom: 'Débats et mises en situation', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c18_9', nom: 'Liberté Autorité Sanction', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c18_9', nom: 'Retour stage pratique bonus', type: 'orange' },
  { creneau: 'c18_9', nom: '«Et après le BAFA ?»', type: 'orange' },
  // 18/07 13h30
  { creneau: 'c18_13h30', nom: 'Handicap et inclusion', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c18_13h30', nom: 'Liberté Autorité Sanction', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c18_13h30', nom: 'Atelier CV créatif', type: 'violet', atelierKey: 'cv_creatif' },
  { creneau: 'c18_13h30', nom: '«Et après le BAFA ?»', type: 'orange' },
  // 19/07 9h30 (Base uniquement pour le dernier Bleu)
  { creneau: 'c19_9h30', nom: "Connaissance de l'enfant 3-5 ans", type: 'bleu', obligatoireBase: true, obligatoireAppro: false },
  { creneau: 'c19_9h30', nom: 'Projets', type: 'bleu', obligatoireBase: true, obligatoireAppro: true },
  { creneau: 'c19_9h30', nom: 'Travailler en équipe', type: 'orange' },
]

// ─── Composant ──────────────────────────────────────────────────────────────

export default function SeedTempsPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [log, setLog] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  function addLog(msg: string) {
    setLog(prev => [...prev, msg])
  }

  async function handleSeed() {
    setStatus('running')
    setLog([])
    setError(null)
    try {
      // 1. Créer les ateliers
      addLog('Création des ateliers…')
      const atelierIds: Record<string, string> = {}
      for (const a of ATELIERS_DATA) {
        const ref = await addDoc(collection(db, 'ateliers'), { nom: a.nom, description: a.description })
        atelierIds[a.key] = ref.id
        addLog(`  ✓ Atelier : ${a.nom}`)
      }

      // 2. Créer les créneaux
      addLog('Création des créneaux…')
      const creneauIds: Record<string, string> = {}
      for (const c of CRENEAUX_DATA) {
        const ref = await addDoc(collection(db, 'creneaux'), {
          jour: c.jour,
          heureDebut: c.heureDebut,
          heureFin: c.heureFin,
          ordre: c.ordre,
        })
        creneauIds[c.key] = ref.id
        addLog(`  ✓ Créneau : ${c.jour} ${c.heureDebut}`)
      }

      // 3. Créer les temps
      addLog('Création des temps…')
      let count = 0
      for (const t of TEMPS_DATA) {
        const creneauId = creneauIds[t.creneau]
        if (!creneauId) continue
        const data: Record<string, unknown> = {
          nom: t.nom,
          description: '',
          type: t.type,
          creneauId,
          capaciteMin: 4,
          obligatoireBase: t.obligatoireBase ?? false,
          obligatoireAppro: t.obligatoireAppro ?? false,
        }
        if (t.atelierKey) {
          data.atelierId = atelierIds[t.atelierKey]
        }
        await addDoc(collection(db, 'temps'), data)
        count++
      }
      addLog(`  ✓ ${count} temps créés`)

      addLog('')
      addLog('🎉 Import terminé !')
      setStatus('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-lg mx-auto bg-white rounded-xl border p-6 space-y-4">
        <h1 className="text-xl font-bold">🗓️ Import des temps BAFAALAKART</h1>
        <p className="text-sm text-slate-600">
          Importe les 18 créneaux, 3 ateliers et {TEMPS_DATA.length} temps depuis
          &quot;Liste temps.xlsx&quot;. À supprimer après utilisation.
        </p>
        <div className="text-xs text-slate-500 bg-slate-50 rounded p-2 space-y-1">
          <p>• {CRENEAUX_DATA.length} créneaux (13 au 19 juillet)</p>
          <p>• {ATELIERS_DATA.length} ateliers violets (Spectacle, Jeu intermédiaire, CV créatif)</p>
          <p>• {TEMPS_DATA.length} temps au total</p>
        </div>

        {status === 'idle' && (
          <button
            onClick={handleSeed}
            className="w-full bg-slate-900 text-white rounded-lg py-2 px-4 text-sm font-medium hover:bg-slate-700"
          >
            Lancer l&apos;import
          </button>
        )}

        {(status === 'running' || status === 'done') && log.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-3 text-xs font-mono max-h-64 overflow-y-auto space-y-0.5">
            {log.map((line, i) => (
              <p key={i} className={line.startsWith('🎉') ? 'text-green-700 font-bold' : 'text-slate-700'}>
                {line || ' '}
              </p>
            ))}
            {status === 'running' && <p className="text-slate-400 animate-pulse">…</p>}
          </div>
        )}

        {status === 'done' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            ✅ Import terminé. Tu peux maintenant supprimer cette page et aller dans{' '}
            <strong>/admin → Temps</strong> pour vérifier et ajuster les données.
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <p className="font-semibold mb-1">❌ Erreur</p>
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
