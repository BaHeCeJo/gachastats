"use client";

import { useActionState } from "react";
import { signIn } from "./action";
import Link from "next/link";
import { useLocalizationParams } from "@/lib/localization";
import GSLogo from "@/app/components/GSLogo";

type SignInState = {
  error?: string;
  success?: boolean;
} | null;

export default function SignInPage() {
  const { t } = useLocalizationParams();
  const [state, formAction, isPending] = useActionState(
    async (_prevState: SignInState, formData: FormData) => {
      return await signIn(formData);
    },
    null
  );

  const sPathData = "M 250 200 H 350 H 500 Q 540 200 540 165 V 155 Q 540 130 500 130 H 420 Q 380 130 380 105 V 95 Q 380 60 420 60 H 540";

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Branding */}
        <div className="flex flex-col items-center gap-4">
          <Link href="/" className="flex flex-col items-center group">
            <GSLogo className="w-24 h-12" sPathData={sPathData} />
            <div className="flex flex-col items-center leading-none mt-2">
              <span className="text-3xl font-black text-white tracking-tighter transition-colors group-hover:text-[#22c55e]">
                GACHA
              </span>
              <span className="text-[10px] font-bold text-green-600 tracking-[0.4em] uppercase mt-1">
                Stats
              </span>
            </div>
          </Link>
          <h1 className="text-zinc-400 text-sm font-medium tracking-widest uppercase mt-4">
            {t('signInToAccount')}
          </h1>
        </div>

        {/* Form */}
        <form action={formAction} className="mt-8 space-y-6">
          {state?.error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg text-center font-medium">
              {state.error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1"
              >
                {t('emailAddress')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1"
              >
                {t('password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-black rounded-xl text-black bg-green-500 hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              {isPending ? t('signingIn') : t('signIn')}
            </button>
          </div>

          <div className="text-center">
            <p className="text-zinc-500 text-sm">
              {t('noAccount')}{" "}
              <Link
                href="/auth/signup"
                className="font-bold text-green-500 hover:text-green-400 transition-colors"
              >
                {t('createOneNow')}
              </Link>
            </p>
          </div>
        </form>
      </div>

      <footer className="mt-20">
        <p className="text-zinc-700 text-[10px] font-bold tracking-[0.3em] uppercase">
          &copy; {new Date().getFullYear()} {t('footerText')}
        </p>
      </footer>
    </div>
  );
}
