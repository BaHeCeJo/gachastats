"use client";

import React, { useState, useEffect } from "react";
import { LocalizedString, useLocalizationParams } from "@/lib/localization";

type LocalizedTextInputProps = {
  id: string;
  label: string;
  value: LocalizedString | null;
  onChange: (newValue: LocalizedString) => void;
  placeholder?: string;
  className?: string;
  textarea?: boolean;
};

export default function LocalizedTextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  className,
  textarea = false,
}: LocalizedTextInputProps) {
  const { gameSupportedLanguages, gameDefaultLang } = useLocalizationParams();
  const [activeTab, setActiveTab] = useState(gameDefaultLang);

  // Initialize value if null, ensuring default language is present
  useEffect(() => {
    if (!value) {
      onChange({ [gameDefaultLang]: "" });
    } else if (gameDefaultLang && !(gameDefaultLang in value) && gameSupportedLanguages.includes(gameDefaultLang)) {
      // Ensure default language has an entry if it's missing but supported
      onChange({ ...value, [gameDefaultLang]: "" });
    }
  }, [value, onChange, gameDefaultLang, gameSupportedLanguages]);

  // Sync activeTab with gameDefaultLang if it changes
  useEffect(() => {
    setActiveTab(gameDefaultLang);
  }, [gameDefaultLang]);

  const handleChange = (lang: string, text: string) => {
    onChange({
      ...value,
      [lang]: text,
    });
  };

  const InputComponent = textarea ? "textarea" : "input";

  if (gameSupportedLanguages.length <= 1) {
    // If only one language is supported, render a single input
    const singleLang = gameSupportedLanguages[0] || gameDefaultLang;
    return (
      <div className={className}>
        <label htmlFor={`${id}-${singleLang}`} className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">
          {label} ({singleLang.toUpperCase()})
        </label>
        <InputComponent
          id={`${id}-${singleLang}`}
          name={`${id}-${singleLang}`} // Name attribute for form submission
          // eslint-disable-next-line security/detect-object-injection
          value={(value && value[singleLang]) || ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            handleChange(singleLang, e.target.value)
          }
          placeholder={placeholder}
          className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
          {...(textarea && { rows: 4 })} // Add rows for textarea
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">
        {label}
      </label>
      <div className="flex border-b border-zinc-700 mb-4">
        {gameSupportedLanguages.map((lang) => (
          <button
            key={lang}
            type="button" // Important to prevent form submission
            onClick={() => setActiveTab(lang)}
            className={`
              px-4 py-2 text-sm font-medium
              ${activeTab === lang
                ? "border-b-2 border-green-500 text-green-500"
                : "text-zinc-400 hover:text-zinc-300"
              }
              transition-colors
            `}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>
      {gameSupportedLanguages.map((lang) => (
        <div key={lang} style={{ display: activeTab === lang ? "block" : "none" }}>
          <label htmlFor={`${id}-${lang}`} className="sr-only">
            {label} ({lang.toUpperCase()})
          </label>
          <InputComponent
            id={`${id}-${lang}`}
            name={`${id}-${lang}`} // Name attribute for form submission
            // eslint-disable-next-line security/detect-object-injection
            value={(value && value[lang]) || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              handleChange(lang, e.target.value)
            }
            placeholder={`${placeholder || label} (${lang.toUpperCase()})`}
            className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
            {...(textarea && { rows: 4 })} // Add rows for textarea
          />
          {lang === gameDefaultLang && (
            <p className="mt-2 text-xs text-zinc-500">
              This is the default language. It must always have a value.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
