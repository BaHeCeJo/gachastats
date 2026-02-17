"use client";

import { useState, useEffect } from 'react';

type Props = {
  name: string;
  initialValues?: string[];
};

export default function TagInput({ name, initialValues = [] }: Props) {
  const [tags, setTags] = useState<string[]>(initialValues);
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      e.preventDefault();
      if (!tags.includes(inputValue.trim())) {
        setTags([...tags, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div>
      {/* Hidden inputs to submit the data */}
      {tags.map((tag, index) => (
        <input key={index} type="hidden" name={name} value={tag} />
      ))}

      <div className="flex flex-wrap items-center gap-2 p-2 border rounded">
        {tags.map((tag, index) => (
          <div key={index} className="flex items-center gap-1 bg-gray-200 text-gray-800 rounded-full px-3 py-1 text-sm">
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="font-bold text-red-500 hover:text-red-700"
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
          placeholder="Type and press Enter to add..."
          className="flex-grow bg-transparent focus:outline-none p-1"
        />
      </div>
    </div>
  );
}
