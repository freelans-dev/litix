import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (user) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
