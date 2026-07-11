'use client'
import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Inscription } from '@/types'

interface UseInscriptionsResult {
  inscriptions: Inscription[]
  loading: boolean
}

export function useInscriptions(stagiaireId?: string): UseInscriptionsResult {
  const [inscriptions, setInscriptions] = useState<Inscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = stagiaireId
      ? query(collection(db, 'inscriptions'), where('stagiaireId', '==', stagiaireId))
      : collection(db, 'inscriptions')

    const unsub = onSnapshot(q, snap => {
      setInscriptions(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Inscription))
      setLoading(false)
    })

    return unsub
  }, [stagiaireId])

  return { inscriptions, loading }
}
