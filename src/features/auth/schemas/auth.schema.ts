import { z } from 'zod'

export const PasswordSchema = z
  .string()
  .min(8, 'Senha deve ter ao menos 8 caracteres')
  .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
  .regex(/[0-9]/, 'Deve conter ao menos um número')

export const SignupSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  officeName: z.string().min(2, 'Nome do escritório obrigatório'),
  email: z.string().email('Email inválido'),
  password: PasswordSchema,
})

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

export const InviteSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'member', 'viewer']),
})

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  password: PasswordSchema,
})

export type SignupInput = z.infer<typeof SignupSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type InviteInput = z.infer<typeof InviteSchema>
export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>
