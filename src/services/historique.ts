import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

export async function addHistorique(
  action: string,
  utilisateurId: string,
  details: Record<string, unknown>
): Promise<void> {
  await addDoc(collection(db, 'historique'), {
    action,
    utilisateurId,
    details,
    date: serverTimestamp(),
  })
}
