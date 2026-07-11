'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { listStagiaires, listFormateurs } from '@/services/users'
import { listTemps } from '@/services/temps'
import { listCreneaux } from '@/services/creneaux'
import { exportListesPDF, exportPresencesPDF, exportExcel } from '@/lib/utils/export'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Inscription, Presence } from '@/types'

async function getAllInscriptions(): Promise<Inscription[]> {
  const snap = await getDocs(collection(db, 'inscriptions'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Inscription)
}

async function getAllPresences(): Promise<Presence[]> {
  const snap = await getDocs(collection(db, 'presences'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Presence)
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

export function ExportPanel() {
  const [loadingListes, setLoadingListes] = useState(false)
  const [loadingPresences, setLoadingPresences] = useState(false)
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleListesPDF() {
    setError(null)
    setLoadingListes(true)
    try {
      const [temps, creneaux, inscriptions, stagiaires] = await Promise.all([
        listTemps(),
        listCreneaux(),
        getAllInscriptions(),
        listStagiaires(),
      ])
      await exportListesPDF(temps, creneaux, inscriptions, stagiaires)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'export')
    } finally {
      setLoadingListes(false)
    }
  }

  async function handlePresencesPDF() {
    setError(null)
    setLoadingPresences(true)
    try {
      const [temps, creneaux, inscriptions, presences, stagiaires, formateurs] = await Promise.all([
        listTemps(),
        listCreneaux(),
        getAllInscriptions(),
        getAllPresences(),
        listStagiaires(),
        listFormateurs(),
      ])
      await exportPresencesPDF(temps, creneaux, inscriptions, presences, stagiaires, formateurs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'export')
    } finally {
      setLoadingPresences(false)
    }
  }

  async function handleExcel() {
    setError(null)
    setLoadingExcel(true)
    try {
      const [stagiaires, formateurs, inscriptions, presences, temps, creneaux] = await Promise.all([
        listStagiaires(),
        listFormateurs(),
        getAllInscriptions(),
        getAllPresences(),
        listTemps(),
        listCreneaux(),
      ])
      await exportExcel(stagiaires, formateurs, inscriptions, presences, temps, creneaux)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'export')
    } finally {
      setLoadingExcel(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exports</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            variant="outline"
            onClick={handleListesPDF}
            disabled={loadingListes}
            className="gap-2"
          >
            {loadingListes && <Spinner />}
            Listes par temps (PDF)
          </Button>

          <Button
            variant="outline"
            onClick={handlePresencesPDF}
            disabled={loadingPresences}
            className="gap-2"
          >
            {loadingPresences && <Spinner />}
            Feuilles de présence (PDF)
          </Button>

          <Button
            variant="outline"
            onClick={handleExcel}
            disabled={loadingExcel}
            className="gap-2"
          >
            {loadingExcel && <Spinner />}
            Export complet (Excel)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
