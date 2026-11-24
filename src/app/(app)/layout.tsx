import AppData from '@/components/AppData';
import { guard } from '@/lib/server/guard';

export const dynamic = 'force-dynamic';

/** Every signed-in page: one data load, and the shared header, navigation and footer around the page. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await guard();
  return <AppData>{children}</AppData>;
}
