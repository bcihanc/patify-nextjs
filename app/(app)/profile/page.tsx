import Link from 'next/link';
import { Settings } from 'lucide-react';

// Full profile hub is out of F0 scope (still a placeholder per the master
// plan) — this link is the only way to reach /profile/settings from the UI
// until that view is built.
export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profil</h1>
        <Link
          href="/profile/settings"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
          Ayarlar
        </Link>
      </div>
      <p className="text-muted-foreground">Bu alan yakında.</p>
    </div>
  );
}
