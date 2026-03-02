import { createClient } from '@/lib/supabase/client'
import type { SignupInput, LoginInput } from '@/features/auth/types/auth.types'

export const authService = {
  async signUp(input: SignupInput) {
    const supabase = createClient()
    return supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName, office_name: input.officeName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  },

  async signIn(input: LoginInput) {
    const supabase = createClient()
    return supabase.auth.signInWithPassword({ email: input.email, password: input.password })
  },

  async signOut() {
    const supabase = createClient()
    return supabase.auth.signOut()
  },

  async getSession() {
    const supabase = createClient()
    return supabase.auth.getSession()
  },

  async resetPassword(email: string, redirectTo: string) {
    const supabase = createClient()
    return supabase.auth.resetPasswordForEmail(email, { redirectTo })
  },
}
