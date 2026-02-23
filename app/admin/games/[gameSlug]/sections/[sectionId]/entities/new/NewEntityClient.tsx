"use client";

import { useState, useActionState } from 'react';
import { LocalizedString, GameLocalizationProvider, getTranslatedField } from "@/lib/localization";
import LocalizedTextInput from '@/app/components/fields/LocalizedTextInput';
import CreatableTagInput from '@/app/components/fields/CreatableTagInput';
import ImageInput from '@/app/components/ImageInput';
import { upsertEntityAction } from './actions';

type GameData = { id: string; name: LocalizedString; slug: string; default_lang: string; supported_languages: string[]; };
type SectionData = { id: string; key: LocalizedString; game_id: string; };
type FieldOption = { id: string; field_id: string; value_key: LocalizedString; icon_path: string | null; color: string | null; };
type FieldData = { id: string; key: LocalizedString; required: boolean; manual_fill: boolean; is_multi: boolean; has_icon: boolean; has_color: boolean; field_type: string; field_options: FieldOption[] | null; };
type EntityFieldValueState = { field_id: string; value_text: LocalizedString | null; option_id: string | null; is_multi_manual_values?: string[]; };
type FormState = { error?: string; };

export default function NewEntityClient({ game, section, fields, currentLang }: {
  game: GameData;
  section: SectionData;
  fields: FieldData[];
  currentLang: string;
}) {
  const [localizedName, setLocalizedName] = useState<LocalizedString>({ [game.default_lang]: "" });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [entityFieldValues, setEntityFieldValues] = useState<EntityFieldValueState[]>(() =>
    fields.map(field => ({
      field_id: field.id,
      value_text: field.manual_fill ? { [game.default_lang]: "" } : null,
      option_id: null,
      ...(field.is_multi && field.manual_fill && { is_multi_manual_values: [] }),
    }))
  );

  const [state, formAction] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      formData.set("name", JSON.stringify(localizedName));
      formData.set("section_id", section.id);
      if (iconFile) formData.set("icon_file", iconFile); else formData.delete("icon_file");

      const valuesToSubmit = entityFieldValues.map(val => {
        const fieldDef = fields.find(f => f.id === val.field_id);
        if (fieldDef?.manual_fill && fieldDef?.is_multi) {
          const localizedMultiValue: LocalizedString = {};
          game.supported_languages.forEach(lang => { localizedMultiValue[lang] = val.is_multi_manual_values?.join(', ') || ''; });
          return { field_id: val.field_id, value_text: localizedMultiValue, option_id: null };
        } else if (fieldDef?.manual_fill) {
          return { field_id: val.field_id, value_text: val.value_text, option_id: null };
        } else {
          return { field_id: val.field_id, value_text: null, option_id: val.option_id };
        }
      }).filter(Boolean);

      formData.set("field_values", JSON.stringify(valuesToSubmit));
      return await upsertEntityAction(game.slug, section.id, game.default_lang, formData);
    },
    {} as FormState
  );

  const handleFieldValueChange = (fieldId: string, value: LocalizedString | string | string[] | null, isMultiManual?: boolean) => {
    setEntityFieldValues(prev => prev.map(val => {
      if (val.field_id === fieldId) {
        if (isMultiManual) return { ...val, is_multi_manual_values: value as string[], value_text: null, option_id: null };
        else if (typeof value === 'object' && value !== null && !('length' in value)) return { ...val, value_text: value as LocalizedString, option_id: null };
        else return { ...val, option_id: value as string, value_text: null };
      }
      return val;
    }));
  };

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <main className="max-w-3xl p-8 space-y-6 mx-auto">
        <h1 className="text-2xl font-bold text-white">{getTranslatedField(section.key, currentLang, game.default_lang)} — Add Entity</h1>
        {state?.error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">{state.error}</div>}
        <form action={formAction} encType="multipart/form-data" className="space-y-6">
          <LocalizedTextInput id="name" label="Entity Name" value={localizedName} onChange={setLocalizedName} placeholder="e.g., Acheron" />
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Main Icon</label>
            <ImageInput name="icon_file" onFileChange={setIconFile} existingImageUrl={null} />
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mt-8">Entity Data</h2>
            {fields.map(field => {
              const currentValue = entityFieldValues.find(v => v.field_id === field.id);
              if (!currentValue) return null;
              if (field.manual_fill) {
                return (
                  <div key={field.id}>
                    {field.is_multi ? (
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{getTranslatedField(field.key, currentLang, game.default_lang)}</label>
                        <CreatableTagInput name={`field-${field.id}`} initialValues={currentValue.is_multi_manual_values || []} options={field.field_options || []} onChange={(values) => handleFieldValueChange(field.id, values, true)} />
                      </div>
                    ) : (
                      <LocalizedTextInput id={`field-${field.id}`} label={getTranslatedField(field.key, currentLang, game.default_lang)} value={currentValue.value_text} onChange={(val) => handleFieldValueChange(field.id, val)} placeholder={`Enter ${getTranslatedField(field.key, currentLang, game.default_lang)}`} />
                    )}
                  </div>
                );
              } else {
                return (
                  <div key={field.id} className="space-y-1">
                    <label htmlFor={`field-${field.id}`} className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{getTranslatedField(field.key, currentLang, game.default_lang)}</label>
                    <select id={`field-${field.id}`} className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all" value={currentValue.option_id || ''} onChange={(e) => handleFieldValueChange(field.id, e.target.value)}>
                      <option value="">Select an option</option>
                      {field.field_options?.map(option => <option key={option.id} value={option.id}>{getTranslatedField(option.value_key, currentLang, game.default_lang)}</option>)}
                    </select>
                  </div>
                );
              }
            })}
          </div>
          <button type="submit" className="w-full bg-green-600 text-black font-bold px-4 py-3 rounded-xl hover:bg-green-500 transition-colors">Create Entity</button>
        </form>
      </main>
    </GameLocalizationProvider>
  );
}
