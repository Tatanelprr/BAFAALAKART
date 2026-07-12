'use client'

import { useState } from 'react'
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  identifiant: string
  trigger: React.ReactNode
}

export function ChangePasswordDialog({ identifiant, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError(null)
      setSuccess(false)
    }
    setOpen(val)
  }

  const handleSave = async () => {
    setError(null)

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit faire au moins 6 caractères.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    const user = auth.currentUser
    if (!user || !user.email) {
      setError('Session expirée. Reconnectez-vous.')
      return
    }

    setSaving(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
      setSuccess(true)
      setTimeout(() => setOpen(false), 1500)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Mot de passe actuel incorrect.')
      } else if (code === 'auth/weak-password') {
        setError('Mot de passe trop faible (6 caractères minimum).')
      } else {
        setError('Une erreur est survenue. Réessayez.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<span />}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Changer mon mot de passe</DialogTitle>
        </DialogHeader>

        {success ? (
          <p className="text-sm text-green-600 py-4 text-center">
            Mot de passe modifié avec succès.
          </p>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <p className="text-xs text-muted-foreground">
              Identifiant : <span className="font-mono font-medium">{identifiant}</span>
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="current-pwd">Mot de passe actuel</Label>
              <Input
                id="current-pwd"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-pwd">Nouveau mot de passe</Label>
              <Input
                id="new-pwd"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-pwd">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirm-pwd"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>
        )}

        {!success && (
          <DialogFooter showCloseButton>
            <Button
              onClick={handleSave}
              disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            >
              {saving ? 'Enregistrement…' : 'Modifier'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
