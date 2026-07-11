import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Creneau } from '@/types'

type CreateCreneauData = Omit<Creneau, 'id'>

export async function listCreneaux(): Promise<Creneau[]> {
  const q = query(collection(db, 'creneaux'), orderBy('jour'), orderBy('ordre'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Creneau)
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
