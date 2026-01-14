import { signIn } from '@/app/auth/signin/action'
import Link from 'next/link'

export default function SignInPage() {
  return (
    <form action={signIn}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />

      <button type="submit">Sign in</button>

      <p>
        No account? <Link href="/auth/signup">Create one</Link>
      </p>
    </form>
  )
}
