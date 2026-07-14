'use client'

import { useEffect, useState } from 'react'
import { listUsers, updateUser } from '@/services/users'
import { User, UserRole, TypeStagiaire } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'bg-red-100 text-red-700 border-red-200' },
  formateur: { label: 'Formateur', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  stagiaire: { label: 'Stagiaire', className: 'bg-green-100 text-green-700 border-green-200' },
}

function RoleBadge({ role }: { role: UserRole }) {
  const { label, className } = ROLE_BADGE[role]
  return (
    <Badge className={className}>
      {label}
    </Badge>
  )
}

interface EditDialogProps {
  user: User
  onSaved: (updated: User) => void
}

function EditUserDialog({ user, onSaved }: EditDialogProps) {
  const [open, setOpen] = useState(false)
  const [prenom, setPrenom] = useState(user.prenom)
  const [nom, setNom] = useState(user.nom)
  const [role, setRole] = useState<UserRole>(user.role)
  const [typeStagiaire, setTypeStagiaire] = useState<TypeStagiaire | ''>(user.typeStagiaire ?? '')
  const [saving, setSaving] = useState(false)

  // Reset state when dialog opens
  const handleOpenChange = (val: boolean) => {
    if (val) {
      setPrenom(user.prenom)
      setNom(user.nom)
      setRole(user.role)
      setTypeStagiaire(user.typeStagiaire ?? '')
    }
    setOpen(val)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const data: Partial<Omit<User, 'uid' | 'createdAt'>> = {
        prenom: prenom.trim(),
        nom: nom.trim(),
        role,
      }
      if (role === 'stagiaire' && typeStagiaire) {
        data.typeStagiaire = typeStagiaire
      } else {
        data.typeStagiaire = undefined
      }
      await updateUser(user.uid, data)
      onSaved({ ...user, ...data })
      setOpen(false)
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Modifier
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Modifier {user.prenom} {user.nom}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Prénom */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`prenom-${user.uid}`}>Prénom</Label>
            <Input
              id={`prenom-${user.uid}`}
              value={prenom}
              onChange={e => setPrenom(e.target.value)}
            />
          </div>

          {/* Nom */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`nom-${user.uid}`}>Nom</Label>
            <Input
              id={`nom-${user.uid}`}
              value={nom}
              onChange={e => setNom(e.target.value)}
            />
          </div>

          {/* Rôle */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`role-${user.uid}`}>Rôle</Label>
            <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
              <SelectTrigger id={`role-${user.uid}`} className="w-full">
                <SelectValue placeholder="Choisir un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stagiaire">Stagiaire</SelectItem>
                <SelectItem value="formateur">Formateur</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type stagiaire (affiché seulement si rôle = stagiaire) */}
          {role === 'stagiaire' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`type-${user.uid}`}>Type stagiaire</Label>
              <Select
                value={typeStagiaire}
                onValueChange={(val) => setTypeStagiaire(val as TypeStagiaire)}
              >
                <SelectTrigger id={`type-${user.uid}`} className="w-full">
                  <SelectValue placeholder="Choisir un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Base">Base</SelectItem>
                  <SelectItem value="Approfondissement">Approfondissement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function UserManager() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleUserSaved = (updated: User) => {
    setUsers(prev => prev.map(u => (u.uid === updated.uid ? updated : u)))
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (
      u.nom.toLowerCase().includes(q) ||
      u.prenom.toLowerCase().includes(q) ||
      u.identifiant.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Barre de recherche */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Rechercher par nom, prénom ou identifiant…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground shrink-0">
          {filtered.length} utilisateur{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Chargement des utilisateurs…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Aucun utilisateur trouvé.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Identifiant</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(user => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.nom}</TableCell>
                  <TableCell>{user.prenom}</TableCell>
                  <TableCell className="font-mono text-xs">{user.identifiant}</TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>
                    {user.role === 'stagiaire' && user.typeStagiaire ? (
                      <span className="text-xs text-muted-foreground">{user.typeStagiaire}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <EditUserDialog user={user} onSaved={handleUserSaved} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
