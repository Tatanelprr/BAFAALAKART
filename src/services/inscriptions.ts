import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Inscription } from '@/types'
import { listTempsByAtelier } from './temps'
import { addHistorique } from './historique'

export async function getInscriptionsStagiaire(stagiaireId: string): Promise<Inscription[]> {
  const q = query(collection(db, 'inscriptions'), where('stagiaireId', '==', stagiaireId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Inscription)
}

export function subscribeInscriptionsStagiaire(
  stagiaireId: string,
  callback: (inscriptions: Inscription[]) => void
): Unsubscribe {
  const q = query(collection(db, 'inscriptions'), where('stagiaireId', '==', stagiaireId))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Inscription))
  })
}

export async function getInscriptionsTemps(tempsId: string): Promise<Inscription[]> {
  const q = query(collection(db, 'inscriptions'), where('tempsId', '==', tempsId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Inscription)
}

export function subscribeInscriptionsTemps(
  tempsId: string,
  callback: (inscriptions: Inscription[]) => void
): Unsubscribe {
  const q = query(collection(db, 'inscriptions'), where('tempsId', '==', tempsId))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Inscription))
  })
}

export async function inscrire(
  stagiaireId: string,
  tempsId: string,
  creneauId: string
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    // Vérifier qu'il n'y a pas déjà une inscription pour ce stagiaire dans ce créneau
    // Note: les transactions Firestore ne supportent pas les queries — on passe creneauId
    // et on vérifie via un document dédié à la place
    // Solution : stocker un doc de "slot" par (stagiaireId, creneauId)
    const slotRef = doc(db, 'slots', `${stagiaireId}_${creneauId}`)
    const slotSnap = await transaction.get(slotRef)
    if (slotSnap.exists()) {
      throw new Error('CRENEAU_OCCUPE')
    }
    const inscriptionRef = doc(collection(db, 'inscriptions'))
    transaction.set(inscriptionRef, {
      stagiaireId,
      tempsId,
      creneauId,
      dateCreation: serverTimestamp(),
      origine: 'choix',
      verrouille: false,
    })
    transaction.set(slotRef, { stagiaireId, creneauId, tempsId, inscriptionId: inscriptionRef.id })
  })
  await addHistorique('inscription_created', stagiaireId, { tempsId, creneauId })
}

export async function inscrireAtelier(
  stagiaireId: string,
  atelierId: string
): Promise<void> {
  const tempsAtelier = await listTempsByAtelier(atelierId)
  if (tempsAtelier.length === 0) throw new Error('ATELIER_VIDE')

  await runTransaction(db, async (transaction) => {
    // Vérifier les conflits de créneaux
    for (const temps of tempsAtelier) {
      const slotRef = doc(db, 'slots', `${stagiaireId}_${temps.creneauId}`)
      const slotSnap = await transaction.get(slotRef)
      if (slotSnap.exists()) {
        throw new Error('CONFLIT_ATELIER')
      }
    }
    // Créer toutes les inscriptions et slots
    for (const temps of tempsAtelier) {
      const inscriptionRef = doc(collection(db, 'inscriptions'))
      transaction.set(inscriptionRef, {
        stagiaireId,
        tempsId: temps.id,
        creneauId: temps.creneauId,
        dateCreation: serverTimestamp(),
        origine: 'auto',
        verrouille: true,
      })
      transaction.set(doc(db, 'slots', `${stagiaireId}_${temps.creneauId}`), {
        stagiaireId,
        creneauId: temps.creneauId,
        tempsId: temps.id,
        inscriptionId: inscriptionRef.id,
      })
    }
  })
  await addHistorique('atelier_inscription_created', stagiaireId, { atelierId })
}

export async function desinscrire(inscriptionId: string, stagiaireId: string, creneauId: string): Promise<void> {
  const inscriptionRef = doc(db, 'inscriptions', inscriptionId)
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(inscriptionRef)
    if (!snap.exists()) throw new Error('INSCRIPTION_NOT_FOUND')
    const data = snap.data() as Inscription
    if (data.verrouille) throw new Error('INSCRIPTION_VERROUILEE')
    transaction.delete(inscriptionRef)
    transaction.delete(doc(db, 'slots', `${stagiaireId}_${creneauId}`))
  })
  await addHistorique('inscription_deleted', stagiaireId, { inscriptionId })
}

export async function desinscireAdmin(inscriptionId: string, stagiaireId: string, creneauId: string): Promise<void> {
  await deleteDoc(doc(db, 'inscriptions', inscriptionId))
  // Supprimer le slot correspondant si existant
  try {
    await deleteDoc(doc(db, 'slots', `${stagiaireId}_${creneauId}`))
  } catch {
    // Le slot peut ne pas exister pour les inscriptions admin
  }
  await addHistorique('inscription_admin_deleted', stagiaireId, { inscriptionId })
}

export async function inscrireAdmin(
  stagiaireId: string,
  tempsId: string,
  creneauId: string,
  adminId: string
): Promise<void> {
  await addDoc(collection(db, 'inscriptions'), {
    stagiaireId,
    tempsId,
    creneauId,
    dateCreation: serverTimestamp(),
    origine: 'admin',
    verrouille: false,
  })
  await addHistorique('inscription_admin_created', adminId, { stagiaireId, tempsId })
}
