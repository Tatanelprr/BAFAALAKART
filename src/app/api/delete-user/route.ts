import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase/admin'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

export async function POST(req: NextRequest) {
  // Verify caller's identity
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let callerUid: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7))
    callerUid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // Verify caller is admin
  const callerDoc = await getDoc(doc(db, 'users', callerUid))
  if (!callerDoc.exists() || callerDoc.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { uid } = await req.json()
  if (!uid || typeof uid !== 'string') {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 })
  }

  if (uid === callerUid) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  try {
    await getAdminAuth().deleteUser(uid)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
