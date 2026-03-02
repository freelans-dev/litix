import { defineConfig } from '@trigger.dev/sdk/v3'

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? 'litix-saas',
  runtime: 'node',
  dirs: ['./src/trigger'],
  maxDuration: 300, // 5 minutos default; tasks individuais podem sobrescrever
})
