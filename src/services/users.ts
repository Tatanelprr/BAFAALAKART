import { collection, doc, getDoc, getDocs, query, where, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { User } from '@/types'

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { uid: snap.id, ...snap.data() } as User
}

export async function listUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }) as User)
}

export async function listStagiaires(): Promise<User[]> {
  const q = query(collection(db, 'users'), where('role', '==', 'stagiaire'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }) as User)
}

export async function listFormateurs(): Promise<User[]> {
  const q = query(collection(db, 'users'), where('role', 'in', ['formateur', 'admin']))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }) as User)
}

export async function updateUser(uid: string, data: Partial<Omit<User, 'uid' | 'createdAt'>>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), data)
}

export async function deleteUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid))
}
