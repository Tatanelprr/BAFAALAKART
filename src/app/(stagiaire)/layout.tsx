'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function StagiaireLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!currentUser) router.replace('/login')
      else if (currentUser.role !== 'stagiaire') router.replace('/login')
    }
  }, [currentUser, loading, router])

  if (loading || !currentUser || currentUser.role !== 'stagiaire') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    )
  }

  return <>{children}</>
}
