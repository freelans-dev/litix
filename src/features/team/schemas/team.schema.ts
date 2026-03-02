import { z } from 'zod'

export const InviteMemberSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'member', 'viewer']),
})

export const UpdateRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
})

export const UpdateStatusSchema = z.object({
  is_active: z.boolean(),
})

export type InviteMemberInput = z.infer<typeof InviteMemberSchema>
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>
