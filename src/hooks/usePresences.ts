'use client'
import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Presence } from '@/types'

interface UsePresencesResult {
  presences: Presence[]
  loading: boolean
}

export function usePresences(tempsId?: string): UsePresencesResult {
  const [presences, setPresences] = useState<Presence[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!tempsId) return
    const q = query(collection(db, 'presences'), where('tempsId', '==', tempsId))
    const unsub = onSnapshot(q, snap => {
      setPresences(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Presence))
      setLoading(false)
    })
    return unsub
  }, [tempsId])

  return { presences, loading }
}
