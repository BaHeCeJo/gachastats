"use client";

import { useState, useMemo } from 'react';
import { LocalizedString, getTranslatedField, useLocalizationParams } from "@/lib/localization";

type Option = {
  id: string;
  value_key: LocalizedString; // Localized
};

type Tag = {
  id?: string;
  label: string;
};

type Props = {
  name: string;
  initialValues?: (string | Tag)[]; // Can be strings (labels) or Tag objects
  options?: Option[];       // These are existing labels from field_options
  onChange?: (values: string[]) => void; // Returns the values to be saved (labels or IDs)
};

export default function CreatableTagInput({ name, initialValues = [], options = [], onChange }: Props) {
  const [tags, setTags] = useState<Tag[]>(() => {
    return initialValues.map(val => {
      if (typeof val === 'string') {
        // Try to find if this string is a UUID that matches an option
        const option = options.find(opt => opt.id === val);
        if (option) {
          return { id: option.id, label: "" }; // label will be resolved in render
        }
        return { label: val };
      }
      return val;
    });
  });
  const [inputValue, setInputValue] = useState('');
  const { currentLang, gameDefaultLang } = useLocalizationParams();

  const getLabelForTag = (tag: Tag) => {
    if (tag.id) {
      const option = options.find(opt => opt.id === tag.id);
      if (option) {
        return getTranslatedField(option.value_key, currentLang, gameDefaultLang);
      }
    }
    return tag.label;
  };

  const filteredOptions = useMemo(() => {
    if (!inputValue) return [];
    const lowerInput = inputValue.toLowerCase();
    return options.filter(opt => {
      const label = getTranslatedField(opt.value_key, currentLang, gameDefaultLang).toLowerCase();
      return label.includes(lowerInput) && !tags.some(t => t.id === opt.id || t.label.toLowerCase() === label);
    });
  }, [inputValue, options, tags, currentLang, gameDefaultLang]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      e.preventDefault();
      addManualTag(inputValue.trim());
    }
  };

  const addManualTag = (label: string) => {
    if (!tags.some(t => t.label.toLowerCase() === label.toLowerCase())) {
      const newTags = [...tags, { label }];
      setTags(newTags);
      onChange?.(newTags.map(t => t.id || t.label));
    }
    setInputValue('');
  };

  const addOptionTag = (option: Option) => {
    if (!tags.some(t => t.id === option.id)) {
      const newTags = [...tags, { id: option.id, label: getTranslatedField(option.value_key, currentLang, gameDefaultLang) }];
      setTags(newTags);
      onChange?.(newTags.map(t => t.id || t.label));
    }
    setInputValue('');
  };

  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    setTags(newTags);
    onChange?.(newTags.map(t => t.id || t.label));
  };

  return (
    <div className="space-y-2">
      {/* Hidden inputs to submit the labels/IDs - the server action will handle creation */}
      {tags.map((tag, index) => (
        <input key={index} type="hidden" name={name} value={tag.id || tag.label} />
      ))}

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 p-2 border border-zinc-800 bg-zinc-900/50 rounded-xl min-h-[48px] focus-within:ring-2 focus-within:ring-green-500/50 focus-within:border-green-500 transition-all">
          {tags.map((tag, index) => (
            <div key={index} className="flex items-center gap-1 bg-zinc-800 text-zinc-200 rounded-lg px-2 py-1 text-sm border border-zinc-700">
              <span className="font-medium">{getLabelForTag(tag)}</span>
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="ml-1 text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                &times;
              </button>
            </div>
          ))}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type to search or add..."
            className="flex-grow bg-transparent focus:outline-none p-1 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>

        {/* Suggestions Dropdown */}
        {filteredOptions.length > 0 && (
          <div className="absolute z-50 mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto backdrop-blur-xl">
            {filteredOptions.map(opt => {
              const label = getTranslatedField(opt.value_key, currentLang, gameDefaultLang);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => addOptionTag(opt)}
                  className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center justify-between group"
                >
                  <span>{label}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">Option</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {tags.length === 0 && !inputValue && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 ml-1">Press Enter to add new tags or select from suggestions</p>
      )}
    </div>
  );
}
