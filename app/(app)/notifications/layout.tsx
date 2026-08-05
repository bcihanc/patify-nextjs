import { requireAuth } from '@/lib/auth/require-auth';

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <>{children}</>;
}
