import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Presence } from '@/types'
import { addHistorique } from './historique'

export async function getPresencesTemps(tempsId: string): Promise<Presence[]> {
  const q = query(collection(db, 'presences'), where('tempsId', '==', tempsId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Presence)
}

export function subscribePresencesTemps(
  tempsId: string,
  callback: (presences: Presence[]) => void
): Unsubscribe {
  const q = query(collection(db, 'presences'), where('tempsId', '==', tempsId))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Presence))
  })
}

export async function validerPresence(
  stagiaireId: string,
  tempsId: string,
  formateurId: string,
  inscriptionId: string
): Promise<void> {
  const presenceId = `${stagiaireId}_${tempsId}`
  // Upsert la présence
  await setDoc(doc(db, 'presences', presenceId), {
    stagiaireId,
    tempsId,
    present: true,
    validePar: formateurId,
    dateValidation: serverTimestamp(),
  }, { merge: true })

  // Verrouiller l'inscription correspondante
  await updateDoc(doc(db, 'inscriptions', inscriptionId), { verrouille: true })

  await addHistorique('presence_validated', formateurId, { stagiaireId, tempsId })
}

export async function annulerPresence(
  stagiaireId: string,
  tempsId: string,
  formateurId: string
): Promise<void> {
  const presenceId = `${stagiaireId}_${tempsId}`
  await setDoc(doc(db, 'presences', presenceId), {
    stagiaireId,
    tempsId,
    present: false,
    validePar: formateurId,
    dateValidation: serverTimestamp(),
  }, { merge: true })
  // NE PAS déverrouiller l'inscription — une présence annulée garde l'inscription verrouillée

  await addHistorique('presence_cancelled', formateurId, { stagiaireId, tempsId })
}
