'use client'
import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Temps, Creneau, Atelier } from '@/types'

interface UseTempsResult {
  temps: Temps[]
  creneaux: Creneau[]
  ateliers: Atelier[]
  loading: boolean
}

export function useTemps(): UseTempsResult {
  const [temps, setTemps] = useState<Temps[]>([])
  const [creneaux, setCreneaux] = useState<Creneau[]>([])
  const [ateliers, setAteliers] = useState<Atelier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let loadedCount = 0
    const total = 3
    const checkLoaded = () => {
      loadedCount++
      if (loadedCount >= total) setLoading(false)
    }

    const unsubTemps = onSnapshot(
      collection(db, 'temps'),
      snap => { setTemps(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Temps)); checkLoaded() },
      err => { console.error('temps snapshot error:', err); checkLoaded() }
    )

    const unsubCreneaux = onSnapshot(
      collection(db, 'creneaux'),
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Creneau)
        data.sort((a, b) => a.jour.localeCompare(b.jour) || a.ordre - b.ordre)
        setCreneaux(data)
        checkLoaded()
      },
      err => { console.error('creneaux snapshot error:', err); checkLoaded() }
    )

    const unsubAteliers = onSnapshot(
      collection(db, 'ateliers'),
      snap => { setAteliers(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Atelier)); checkLoaded() },
      err => { console.error('ateliers snapshot error:', err); checkLoaded() }
    )

    return () => {
      unsubTemps()
      unsubCreneaux()
      unsubAteliers()
    }
  }, [])

  return { temps, creneaux, ateliers, loading }
}
