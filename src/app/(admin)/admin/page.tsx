'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { UserManager } from '@/components/admin/UserManager'
import { TempsManager } from '@/components/admin/TempsManager'
import { InscriptionsManager } from '@/components/admin/InscriptionsManager'
import { ImportPanel } from '@/components/admin/ImportPanel'
import { ExportPanel } from '@/components/admin/ExportPanel'

export default function DashboardAdmin() {
  const { currentUser, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  if (!currentUser) return null

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 pt-6 pb-4 border-b bg-card flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Administrateur</p>
          <h1 className="text-xl font-bold leading-tight">
            {currentUser.prenom} {currentUser.nom}
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Déconnexion
        </Button>
      </header>

      {/* Contenu principal */}
      <div className="flex-1 px-4 py-4">
        <Tabs defaultValue="utilisateurs">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
            <TabsTrigger value="temps">Temps</TabsTrigger>
            <TabsTrigger value="inscriptions">Inscriptions</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="utilisateurs">
            <UserManager />
          </TabsContent>

          <TabsContent value="temps">
            <TempsManager />
          </TabsContent>

          <TabsContent value="inscriptions">
            <InscriptionsManager />
          </TabsContent>

          <TabsContent value="import">
            <ImportPanel />
          </TabsContent>

          <TabsContent value="export">
            <ExportPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
