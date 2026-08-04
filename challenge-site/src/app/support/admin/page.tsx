import { redirect } from 'next/navigation';

export default function SupportAdminPage() {
  redirect('/admin?tab=support');
}
