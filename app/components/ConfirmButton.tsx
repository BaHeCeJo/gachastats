'use client'

import { useState } from "react";
import { useLocalizationParams } from "@/lib/localization";

export default function ConfirmButton({
  children,
  dialogMessage,
  buttonClassName,
  action,
}: {
  children: React.ReactNode;
  dialogMessage?: string;
  buttonClassName?: string;
  action?: () => void | Promise<void>;
}) {
  const { t } = useLocalizationParams();
  const message = dialogMessage || t('deleteConfirm');
  const [confirming, setConfirming] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!confirming) {
      e.preventDefault();
      setConfirming(true);
    }
  };

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    setConfirming(false);
    if (action) await action();
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirming(false);
  };

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-400">{message}</span>
        <button
          type="button"
          onClick={handleConfirm}
          className="text-red-500 text-xs font-bold hover:underline"
        >
          {t('confirm') || 'Yes'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="text-zinc-500 text-xs hover:underline"
        >
          {t('cancel') || 'No'}
        </button>
      </span>
    );
  }

  return (
    <button
      type={action ? "button" : "submit"}
      className={buttonClassName || "text-red-600 text-sm hover:underline transition-all"}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
