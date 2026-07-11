import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Temps } from '@/types'

type CreateTempsData = Omit<Temps, 'id'>

export async function listTemps(): Promise<Temps[]> {
  const snap = await getDocs(collection(db, 'temps'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Temps)
}

export async function listTempsByCreneau(creneauId: string): Promise<Temps[]> {
  const q = query(collection(db, 'temps'), where('creneauId', '==', creneauId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Temps)
}

export async function listTempsByAtelier(atelierId: string): Promise<Temps[]> {
  const q = query(collection(db, 'temps'), where('atelierId', '==', atelierId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Temps)
}

export async function createTemps(data: CreateTempsData): Promise<string> {
  const ref = await addDoc(collection(db, 'temps'), data)
  return ref.id
}

export async function updateTemps(id: string, data: Partial<CreateTempsData>): Promise<void> {
  await updateDoc(doc(db, 'temps', id), data)
}

export async function deleteTemps(id: string): Promise<void> {
  await deleteDoc(doc(db, 'temps', id))
}
