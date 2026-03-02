export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface AuthUser {
  id: string
  email: string
  tenantId: string
  memberId: string
  role: UserRole
}

export interface SignupInput {
  fullName: string
  officeName: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface InviteInput {
  email: string
  role: 'admin' | 'member' | 'viewer'
}
