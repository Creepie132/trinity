import { Resend } from 'resend'

// Use a placeholder key if RESEND_API_KEY is missing (for build-time)
export const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key_for_build')
