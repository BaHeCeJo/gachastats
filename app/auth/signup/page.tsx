import { signUp } from '@/app/auth/signup/action'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <form action={signUp}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />

      <button type="submit">Sign up</button>

      <p>
        Already have an account? <Link href="/signin">Sign in</Link>
      </p>
    </form>
  )
}
