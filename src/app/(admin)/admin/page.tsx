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
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog'
import { BleuConfigPanel } from '@/components/admin/BleuConfigPanel'
import { useTemps } from '@/hooks/useTemps'

export default function DashboardAdmin() {
  const { currentUser, logout } = useAuth()
  const { temps, creneaux } = useTemps()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  if (!currentUser) return null

  const isAdmin = currentUser.role === 'admin'

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 pt-6 pb-5 bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-white/70 mb-0.5">
            {isAdmin ? 'Administrateur' : 'Formateur'}
          </p>
          <h1 className="text-xl font-bold leading-tight text-white">
            {currentUser.prenom.charAt(0).toUpperCase() + currentUser.prenom.slice(1).toLowerCase()}{' '}
            <span className="uppercase">{currentUser.nom}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/formateur')}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30">
            Faire l&apos;appel
          </Button>
          <ChangePasswordDialog
            identifiant={currentUser.identifiant}
            trigger={
              <Button variant="outline" size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                Mot de passe
              </Button>
            }
          />
          <Button variant="outline" size="sm" onClick={handleLogout}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30">
            Déconnexion
          </Button>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="flex-1 px-4 py-4">
        <Tabs defaultValue={isAdmin ? 'utilisateurs' : 'temps'}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            {isAdmin && <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>}
            <TabsTrigger value="temps">Temps</TabsTrigger>
            {isAdmin && <TabsTrigger value="bleus">Config. bleus</TabsTrigger>}
            <TabsTrigger value="inscriptions">Inscriptions</TabsTrigger>
            {isAdmin && <TabsTrigger value="import">Import</TabsTrigger>}
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          {isAdmin && (
            <TabsContent value="utilisateurs">
              <UserManager />
            </TabsContent>
          )}

          <TabsContent value="temps">
            <TempsManager />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="bleus">
              <BleuConfigPanel temps={temps} creneaux={creneaux} />
            </TabsContent>
          )}

          <TabsContent value="inscriptions">
            <InscriptionsManager />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="import">
              <ImportPanel />
            </TabsContent>
          )}

          <TabsContent value="export">
            <ExportPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
