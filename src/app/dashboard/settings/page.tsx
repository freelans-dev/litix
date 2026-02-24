import { redirect } from 'next/navigation'

// Redirect /dashboard/settings → profile (OAB import is the primary settings page)
export default function SettingsPage() {
  redirect('/dashboard/settings/profile')
}
