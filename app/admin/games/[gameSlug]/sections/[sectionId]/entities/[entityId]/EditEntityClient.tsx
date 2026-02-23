"use client";

import { useState, useActionState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LocalizedString, getTranslatedField, GameLocalizationProvider } from "@/lib/localization";
import LocalizedTextInput from '@/app/components/fields/LocalizedTextInput';
import CreatableTagInput from '@/app/components/fields/CreatableTagInput';
import ImageInput from '@/app/components/ImageInput';
import ConfirmButton from '@/app/components/ConfirmButton';
import SkinManager from "@/app/components/skins/SkinManager";
import { upsertEntityAction, deleteEntityAction } from './actions';

type GameData = {
  id: string;
  name: LocalizedString;
  slug: string;
  default_lang: string;
  supported_languages: string[];
};

type SectionData = {
  id: string;
  key: LocalizedString;
  game_id: string;
};

type FieldOption = {
  id: string;
  field_id: string;
  value_key: LocalizedString;
  icon_path: string | null;
  color: string | null;
};

type FieldData = {
  id: string;
  key: LocalizedString;
  required: boolean;
  manual_fill: boolean;
  is_multi: boolean;
  has_icon: boolean;
  has_color: boolean;
  field_type: string;
  category: string | null;
  field_options: FieldOption[] | null;
};

type EntityFieldValueData = {
  id?: string;
  entity_id: string;
  field_id: string;
  value_text: LocalizedString | null;
  option_id: string | null;
};

type EntitySkinData = {
  id: string;
  entity_id: string;
  name: LocalizedString;
  is_default: boolean;
  entity_images: {
    id: string;
    type: string;
    image_path: string;
    publicUrl?: string;
  }[];
};

type EntityData = {
  id: string;
  section_id: string;
  name: LocalizedString;
  icon_path: string | null;
  entity_skins: EntitySkinData[];
  entity_field_values: EntityFieldValueData[];
};

type FormState = {
  error?: string;
};

export default function EditEntityClient({ game, section, entity, fields, currentLang }: {
  game: GameData;
  section: SectionData;
  entity: EntityData;
  fields: FieldData[];
  currentLang: string;
}) {
  const supabase = createClient();
  const [localizedName, setLocalizedName] = useState<LocalizedString>(entity.name);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [existingIconPath, setExistingIconPath] = useState<string | null>(entity.icon_path);

  const initialFieldValues = fields.map(field => {
    const existingValue = entity.entity_field_values?.find(v => v.field_id === field.id);
    let value_text: LocalizedString | null = null;
    let option_id: string | null = null;
    let is_multi_manual_values: string[] | undefined = undefined;

    if (field.manual_fill) {
      value_text = existingValue?.value_text || { [game.default_lang]: "" };
      if (field.is_multi) {
        is_multi_manual_values = (getTranslatedField(value_text, game.default_lang, game.default_lang) || '').split(',').map(s => s.trim()).filter(Boolean);
      }
    } else {
      option_id = existingValue?.option_id || null;
    }

    return {
      field_id: field.id,
      value_text: value_text,
      option_id: option_id,
      is_multi_manual_values: is_multi_manual_values,
    };
  });

  const [entityFieldValues, setEntityFieldValues] = useState<any[]>(initialFieldValues);

  const [state, formAction] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      formData.set("id", entity.id);
      formData.set("name", JSON.stringify(localizedName));
      formData.set("section_id", section.id);

      if (iconFile) {
        formData.set("icon_file", iconFile);
      } else {
        formData.delete("icon_file");
      }
      if (existingIconPath) {
        formData.set("existing_icon_path", existingIconPath);
      } else {
        formData.set("existing_icon_path", "null");
      }

      const valuesToSubmit = entityFieldValues.map(val => {
        const fieldDef = fields.find(f => f.id === val.field_id);
        if (!fieldDef) return null;

        if (fieldDef.manual_fill && fieldDef.is_multi) {
          const localizedMultiValue: LocalizedString = {};
          game.supported_languages.forEach(lang => {
            localizedMultiValue[lang] = val.is_multi_manual_values?.join(', ') || '';
          });
          return { field_id: val.field_id, value_text: localizedMultiValue, option_id: null };
        } else if (fieldDef.manual_fill) {
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
        if (isMultiManual) {
          return { ...val, is_multi_manual_values: value as string[], value_text: null, option_id: null };
        } else if (typeof value === 'object' && value !== null && !('length' in value)) {
          return { ...val, value_text: value as LocalizedString, option_id: null };
        } else {
          return { ...val, option_id: value as string, value_text: null };
        }
      }
      return val;
    }));
  };

  const entityIconPublicUrl = entity.icon_path
    ? supabase.storage.from('games').getPublicUrl(entity.icon_path).data.publicUrl
    : null;

  const groupedFields: Record<string, FieldData[]> = {};
  fields.forEach((field) => {
    const cat = field.category || "General";
    if (!groupedFields[cat]) groupedFields[cat] = [];
    groupedFields[cat]!.push(field);
  });

  const sortedCategories = Object.keys(groupedFields).sort((a, b) => {
    const minA = Math.min(...groupedFields[a]!.map((f) => f.order_index || 0));
    const minB = Math.min(...groupedFields[b]!.map((f) => f.order_index || 0));
    if (minA !== minB) return minA - minB;
    return a.localeCompare(b);
  });

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Edit Entity: {getTranslatedField(entity.name, currentLang, game.default_lang)}</h1>
          <form action={deleteEntityAction.bind(null, entity.id, game.slug, section.id)}>
            <ConfirmButton>Delete Entity</ConfirmButton>
          </form>
        </div>
        {state?.error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">{state.error}</div>}
        <form action={formAction} className="space-y-6" encType="multipart/form-data">
          <LocalizedTextInput id="name" label="Entity Name" value={localizedName} onChange={setLocalizedName} placeholder="e.g., Acheron" />
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Main Icon</label>
            <ImageInput name="icon_file" onFileChange={setIconFile} existingImageUrl={entityIconPublicUrl} onRemoveExisting={() => setExistingIconPath(null)} />
            <input type="hidden" name="existing_icon_path" value={existingIconPath || ""} />
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mt-8">Entity Data</h2>
            {sortedCategories.map((category) => (
              <div key={category} className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 border-b border-gray-800 pb-1">{category}</h3>
                <div className="space-y-4 ml-2">
                  {groupedFields[category]!.map((field) => {
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
                          <select id={`field-${field.id}`} className="block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all" value={currentValue.option_id || ''} onChange={(e) => handleFieldValueChange(field.id, e.target.value)} multiple={field.is_multi}>
                            <option value="">Select an option</option>
                            {field.field_options?.map(option => <option key={option.id} value={option.id}>{getTranslatedField(option.value_key, currentLang, game.default_lang)}</option>)}
                          </select>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            ))}
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold px-4 py-3 rounded-xl hover:bg-blue-500 transition-colors">Save Changes</button>
        </form>
        <SkinManager entity={entity} skins={entity.entity_skins} gameSlug={game.slug} sectionId={section.id} gameDefaultLang={game.default_lang} currentLang={currentLang} />
      </div>
    </GameLocalizationProvider>
  );
}
