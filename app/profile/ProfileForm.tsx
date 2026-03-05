"use client";

import { useState, useActionState } from "react";
import { updateProfileAction } from "@/app/collections/actions";
import { useLocalizationParams } from "@/lib/localization";
import { Loader2, Save } from "lucide-react";
import ImageInput from "@/app/components/ImageInput";

interface FormResult {
  success?: boolean;
  error?: string;
}

export default function ProfileForm({ 
  initialProfile 
}: { 
  initialProfile: { nickname: string | null; avatar_url: string | null } 
}) {
  const [nickname, setNickname] = useState(initialProfile.nickname || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(initialProfile.avatar_url);
  const [message, setMessage] = useState("");
  const { t } = useLocalizationParams();

  const [, formAction, isPending] = useActionState(
    async (_prevState: FormResult | null, formData: FormData): Promise<FormResult> => {
      setMessage("");
      // Ensure state values are in formData
      formData.set("nickname", nickname);
      if (avatarFile) {
        formData.set("avatar_file", avatarFile);
      }
      formData.set("existing_avatar_url", existingAvatarUrl || "");
      
      const result = await updateProfileAction(formData);
      
      if (result.success) {
        setMessage(t('profileUpdated'));
        setTimeout(() => setMessage(""), 3000);
      } else if (result.error) {
        alert(result.error);
      }

      return result;
    },
    null
  );

  return (
    <form action={formAction} className="space-y-6 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-2xl shadow-2xl">
      <div className="space-y-6">
        {/* Avatar Upload */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
            {t('profileIcon')}
          </label>
          <div className="max-w-[200px]">
            <ImageInput 
              name="avatar_file" 
              onFileChange={setAvatarFile} 
              existingImageUrl={existingAvatarUrl}
              onRemoveExisting={() => setExistingAvatarUrl(null)}
            />
          </div>
        </div>

        {/* Nickname Input */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
            {t('nickname')}
          </label>
          <input
            type="text"
            name="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e] transition-all"
            placeholder={t('nicknamePlaceholder')}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center justify-center gap-2 w-full bg-[#22c55e] text-black font-black uppercase tracking-widest text-sm py-4 rounded-xl hover:bg-[#1da34a] transition-all disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {t('saveProfile')}
        </button>

        {message && (
          <p className="text-[#22c55e] text-xs font-bold text-center animate-pulse">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
