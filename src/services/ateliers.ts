import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Atelier } from '@/types'

type CreateAtelierData = Omit<Atelier, 'id'>

export async function listAteliers(): Promise<Atelier[]> {
  const snap = await getDocs(collection(db, 'ateliers'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Atelier)
}

export async function createAtelier(data: CreateAtelierData): Promise<string> {
  const ref = await addDoc(collection(db, 'ateliers'), data)
  return ref.id
}

export async function updateAtelier(id: string, data: Partial<CreateAtelierData>): Promise<void> {
  await updateDoc(doc(db, 'ateliers', id), data)
}

export async function deleteAtelier(id: string): Promise<void> {
  await deleteDoc(doc(db, 'ateliers', id))
}
