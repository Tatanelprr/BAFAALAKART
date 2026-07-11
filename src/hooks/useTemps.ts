'use client'
import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
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

    const unsubTemps = onSnapshot(collection(db, 'temps'), snap => {
      setTemps(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Temps))
      checkLoaded()
    })

    const unsubCreneaux = onSnapshot(
      query(collection(db, 'creneaux'), orderBy('jour'), orderBy('ordre')),
      snap => {
        setCreneaux(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Creneau))
        checkLoaded()
      }
    )

    const unsubAteliers = onSnapshot(collection(db, 'ateliers'), snap => {
      setAteliers(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Atelier))
      checkLoaded()
    })

    return () => {
      unsubTemps()
      unsubCreneaux()
      unsubAteliers()
    }
  }, [])

  return { temps, creneaux, ateliers, loading }
}
