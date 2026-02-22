"use client";

import { useState, useMemo } from 'react';

type Option = {
  id: string;
  value_key: string;
};

type Props = {
  name: string;
  initialValues?: string[]; // These are the labels/values for manual tags
  options?: Option[];       // These are existing labels from field_options
};

export default function CreatableTagInput({ name, initialValues = [], options = [] }: Props) {
  const [tags, setTags] = useState<string[]>(initialValues);
  const [inputValue, setInputValue] = useState('');

  const filteredOptions = useMemo(() => {
    if (!inputValue) return [];
    const lowerInput = inputValue.toLowerCase();
    return options.filter(opt => 
      opt.value_key.toLowerCase().includes(lowerInput) && 
      !tags.includes(opt.value_key)
    );
  }, [inputValue, options, tags]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      e.preventDefault();
      addTag(inputValue.trim());
    }
  };

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      {/* Hidden inputs to submit the labels - the server action will handle creation */}
      {tags.map((tag, index) => (
        <input key={index} type="hidden" name={name} value={tag} />
      ))}

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-700 bg-gray-800 rounded min-h-[42px] focus-within:ring-2 focus-within:ring-indigo-500">
          {tags.map((tag, index) => (
            <div key={index} className="flex items-center gap-1 bg-indigo-600 text-white rounded-full px-3 py-1 text-sm">
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="font-bold text-indigo-200 hover:text-white"
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
            className="flex-grow bg-transparent focus:outline-none p-1 text-white"
          />
        </div>

        {/* Suggestions Dropdown */}
        {filteredOptions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded shadow-xl max-h-48 overflow-y-auto">
            {filteredOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => addTag(opt.value_key)}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
              >
                {opt.value_key}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {tags.length === 0 && (
        <p className="text-xs text-gray-500">Press Enter to add new tags or select from existing ones.</p>
      )}
    </div>
  );
}
