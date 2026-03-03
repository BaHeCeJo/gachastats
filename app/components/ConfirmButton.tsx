'use client'

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

  return (
    <button
      type={action ? "button" : "submit"}
      className={buttonClassName || "text-red-600 text-sm hover:underline transition-all"}
      onClick={async (e) => {
        if (!confirm(message)) {
          e.preventDefault();
        } else if (action) {
          await action();
        }
      }}
    >
      {children}
    </button>
  );
}
