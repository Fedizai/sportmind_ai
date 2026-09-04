"use client";

import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { Pencil } from 'lucide-react';

import { adminUpdateUser } from '@/app/admin/actions';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import type { AppUser } from '@/hooks/use-all-users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SHIPPED_SPORTS, isSportId, type SportId } from '@/lib/sports';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

/**
 * Admin edit of one account: name, username, email, role and plan.
 *
 * The athlete's own settings page can no longer change the legal name — it is
 * how a coach and an admin identify them on a roster. This is where it changes
 * instead.
 *
 * Everything goes through a server action that re-checks the caller is an
 * admin from their ID token. The dialog only decides what to show.
 */
export function UserEditor({ user }: { user: AppUser }) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'player' | 'coach' | 'admin'>('player');
  const [plan, setPlan] = useState<'athlete' | 'pro'>('athlete');
  const [sports, setSports] = useState<SportId[]>([]);

  // Reload from the record each time it opens, so a dialog left open on stale
  // data never writes that stale data back.
  useEffect(() => {
    if (!open) return;
    setDisplayName(user.displayName ?? '');
    setUsername(user.username ?? '');
    setEmail(user.email ?? '');
    setRole((user.role as typeof role) ?? 'player');
    setPlan((user.plan as typeof plan) ?? 'athlete');
    setSports(((user as any).sports ?? []).filter(isSportId));
  }, [open, user]);

  const toggleSport = (sport: SportId) => {
    setSports((current) =>
      current.includes(sport) ? current.filter((s) => s !== sport) : [...current, sport]
    );
  };

  // Order is irrelevant to what an athlete can open, so compare as a set.
  const originalSports: SportId[] = (((user as any).sports ?? []) as string[]).filter(isSportId);
  const sportsChanged =
    sports.length !== originalSports.length ||
    sports.some((sport) => !originalSports.includes(sport));

  const save = async () => {
    setSaving(true);
    try {
      const current = getAuth().currentUser;
      if (!current) throw new Error(t('notSignedIn'));
      const result = await adminUpdateUser(await current.getIdToken(), user.uid, {
        // Only send what actually changed: an unchanged email still costs an
        // auth write, and an unchanged username still runs a uniqueness query.
        ...(displayName !== (user.displayName ?? '') ? { displayName } : {}),
        ...(username !== (user.username ?? '') && username ? { username } : {}),
        ...(email !== (user.email ?? '') ? { email } : {}),
        ...(role !== user.role ? { role } : {}),
        ...(plan !== user.plan ? { plan } : {}),
        ...(sportsChanged ? { sports } : {}),
      });

      toast({
        title: result.success ? t('adminEditSaved') : t('genericError'),
        description: result.success ? undefined : result.message,
        variant: result.success ? 'default' : 'destructive',
      });
      if (result.success) setOpen(false);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('genericError'),
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Pencil className="mr-2 h-4 w-4" />
          {t('adminEditUser')}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('adminEditUser')} — {user.displayName || user.uid}</DialogTitle>
          <DialogDescription>{t('adminEditUserHint')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`name-${user.uid}`}>{t('fullName')}</Label>
            <Input id={`name-${user.uid}`} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`username-${user.uid}`}>{t('usernameLabel')}</Label>
            <Input
              id={`username-${user.uid}`}
              value={username}
              placeholder={t('usernamePlaceholder')}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`email-${user.uid}`}>{t('email')}</Label>
            <Input id={`email-${user.uid}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('changeRole')}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">{t('player')}</SelectItem>
                  <SelectItem value="coach">{t('coach')}</SelectItem>
                  <SelectItem value="admin">{t('admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={(v) => setPlan(v as typeof plan)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="athlete">Athlete</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Which sports this athlete can open. Adding one is not
              self-service: they report that they play it and it is granted
              here. An empty selection falls back to showing them all, which is
              what every account created before this existed looks like. */}
          <div className="space-y-2">
            <Label>{t('adminSportsLabel')}</Label>
            <p className="text-xs text-muted-foreground">{t('adminSportsHint')}</p>
            <div className="flex flex-wrap gap-4 pt-1">
              {SHIPPED_SPORTS.map((sport) => (
                <label key={sport} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={sports.includes(sport)}
                    onCheckedChange={() => toggleSport(sport)}
                  />
                  <span className="capitalize">{t(sport)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? t('supportSending') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
