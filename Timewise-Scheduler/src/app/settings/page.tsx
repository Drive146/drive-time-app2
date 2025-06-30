
import { cookies } from 'next/headers';
import { SettingsView } from '@/components/features/timewise-scheduler/settings-view';
import { AdminLogin } from '@/components/features/timewise-scheduler/admin-login';

export default function SettingsPage() {
  const sessionCookie = cookies().get('admin-session');
  const isAuthenticated = sessionCookie?.value === 'true';

  if (isAuthenticated) {
    return <SettingsView />;
  }

  return <AdminLogin />;
}
