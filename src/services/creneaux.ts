import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Creneau } from '@/types'

type CreateCreneauData = Omit<Creneau, 'id'>

export async function listCreneaux(): Promise<Creneau[]> {
  const snap = await getDocs(collection(db, 'creneaux'))
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Creneau)
  return data.sort((a, b) => a.jour.localeCompare(b.jour) || a.ordre - b.ordre)
}

export async function createCreneau(data: CreateCreneauData): Promise<string> {
  const ref = await addDoc(collection(db, 'creneaux'), data)
  return ref.id
}

export async function updateCreneau(id: string, data: Partial<CreateCreneauData>): Promise<void> {
  await updateDoc(doc(db, 'creneaux', id), data)
}

export async function deleteCreneau(id: string): Promise<void> {
  await deleteDoc(doc(db, 'creneaux', id))
}
