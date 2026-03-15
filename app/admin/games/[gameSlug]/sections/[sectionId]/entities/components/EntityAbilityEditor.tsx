"use client";

/* eslint-disable sonarjs/no-nested-functions */

import { useState, useMemo, useEffect } from 'react';
import { LocalizedString, getTranslatedField } from "@/lib/localization";
import { AbilityTemplate, AbilityDefinition, EntityAbility, SectionStat } from '@/lib/supabase/queries';
import LocalizedTextInput from '@/app/components/fields/LocalizedTextInput';
import ImageInput from '@/app/components/ImageInput';
import { createClient } from '@/lib/supabase/client';

export interface AbilityState {
  definition_id: string;
  name: LocalizedString;
  description: LocalizedString;
  icon_path: string | null;
  entity_ability_forms: {
    name: LocalizedString;
    description: LocalizedString;
    icon_path: string | null;
  }[];
  entity_ability_scaling: {
    attribute_index: number;
    level: number;
    value: number;
    value_type: 'percent' | 'flat';
    scaling_stat_id: string | null;
  }[];
}

interface FormUpdates {
  name?: LocalizedString;
  description?: LocalizedString;
  icon_path?: string | null;
}

export default function EntityAbilityEditor({
  abilityTemplates, existingAbilities, sectionStats, gameDefaultLang, activeLang, onChange
}: {
  abilityTemplates: (AbilityTemplate & { section_ability_definitions: AbilityDefinition[] })[];
  existingAbilities: EntityAbility[];
  sectionStats: SectionStat[];
  gameDefaultLang: string;
  activeLang: string;
  onChange: (abilities: AbilityState[]) => void;
}) {
  const supabase = createClient();

  // Initialize state with default templates or existing data
  const [abilities, setAbilities] = useState<AbilityState[]>(() => {
    // 1. Get all definitions from default templates
    const defaultDefs = abilityTemplates
      .filter(t => t.is_default)
      .flatMap(t => t.section_ability_definitions);

    // 2. Map existing abilities or create empty ones for default slots
    const initial: AbilityState[] = defaultDefs.map(def => {
      const existing = existingAbilities.find(a => a.definition_id === def.id);
      return {
        definition_id: def.id,
        name: existing?.name || { [gameDefaultLang]: '' },
        description: existing?.description || { [gameDefaultLang]: '' },
        icon_path: existing?.icon_path || null,
        entity_ability_forms: existing?.entity_ability_forms?.map(f => ({
          name: f.name,
          description: f.description,
          icon_path: f.icon_path
        })) || [],
        entity_ability_scaling: existing?.entity_ability_scaling?.map(s => ({
          attribute_index: s.attribute_index,
          level: s.level,
          value: s.value,
          value_type: s.value_type,
          scaling_stat_id: s.scaling_stat_id
        })) || []
      };
    });

    // 3. Add existing abilities that are NOT in the default templates
    existingAbilities.forEach(ex => {
      if (!initial.find(i => i.definition_id === ex.definition_id)) {
        initial.push({
          definition_id: ex.definition_id,
          name: ex.name,
          description: ex.description,
          icon_path: ex.icon_path,
          entity_ability_forms: ex.entity_ability_forms?.map(f => ({
            name: f.name,
            description: f.description,
            icon_path: f.icon_path
          })) || [],
          entity_ability_scaling: ex.entity_ability_scaling?.map(s => ({
            attribute_index: s.attribute_index,
            level: s.level,
            value: s.value,
            value_type: s.value_type,
            scaling_stat_id: s.scaling_stat_id
          })) || []
        });
      }
    });

    return initial;
  });

  const handleAbilityChange = (index: number, updates: Partial<AbilityState>) => {
    setAbilities(prev => prev.map((ab, i) => i === index ? { ...ab, ...updates } : ab));
  };

  const addForm = (abilityIndex: number) => {
    setAbilities(prev => prev.map((ab, i) => {
      if (i !== abilityIndex) return ab;
      return {
        ...ab,
        entity_ability_forms: [
          ...ab.entity_ability_forms,
          { name: { [gameDefaultLang]: '' }, description: { [gameDefaultLang]: '' }, icon_path: null }
        ]
      };
    }));
  };

  const removeForm = (abilityIndex: number, formIndex: number) => {
    setAbilities(prev => prev.map((ab, i) => {
        if (i !== abilityIndex) return ab;
        return { ...ab, entity_ability_forms: ab.entity_ability_forms.filter((_, fIdx) => fIdx !== formIndex) };
    }));
  };

  const updateForm = (abilityIndex: number, formIndex: number, updates: FormUpdates) => {
    setAbilities(prev => prev.map((ab, i) => {
        if (i !== abilityIndex) return ab;
        return { ...ab, entity_ability_forms: ab.entity_ability_forms.map((f, fIdx) => fIdx === formIndex ? { ...f, ...updates } : f) };
    }));
  };

  const updateScalingValue = (abilityIndex: number, attrIndex: number, level: number, value: number) => {
    setAbilities(prev => prev.map((ab, i) => {
        if (i !== abilityIndex) return ab;
        const sData = ab.entity_ability_scaling;
        const exists = sData.find(s => s.attribute_index === attrIndex && s.level === level);
        let newScaling;
        if (exists) {
            newScaling = sData.map(s => (s.attribute_index === attrIndex && s.level === level) ? { ...s, value } : s);
        } else {
            // Inherit scaling_stat_id and value_type from other entries of same attribute if possible
            const sibling = sData.find(s => s.attribute_index === attrIndex);
            newScaling = [...sData, { 
                attribute_index: attrIndex, 
                level, 
                value, 
                value_type: sibling?.value_type || 'percent' as const,
                scaling_stat_id: sibling?.scaling_stat_id || null
            }];
        }
        return { ...ab, entity_ability_scaling: newScaling };
    }));
  };

  const updateScalingType = (abilityIndex: number, attrIndex: number, value_type: 'percent' | 'flat') => {
    setAbilities(prev => prev.map((ab, i) => {
        if (i !== abilityIndex) return ab;
        return { ...ab, entity_ability_scaling: ab.entity_ability_scaling.map(s => s.attribute_index === attrIndex ? { ...s, value_type } : s) };
    }));
  };

  const updateScalingStat = (abilityIndex: number, attrIndex: number, scaling_stat_id: string | null) => {
    setAbilities(prev => prev.map((ab, i) => {
        if (i !== abilityIndex) return ab;
        return { ...ab, entity_ability_scaling: ab.entity_ability_scaling.map(s => s.attribute_index === attrIndex ? { ...s, scaling_stat_id } : s) };
    }));
  };

  const addAttribute = (abilityIndex: number) => {
    setAbilities(prev => prev.map((ab, i) => {
        if (i !== abilityIndex) return ab;
        const maxAttr = ab.entity_ability_scaling.reduce((max, s) => Math.max(max, s.attribute_index), -1);
        const newIndex = maxAttr + 1;
        return { 
            ...ab, 
            entity_ability_scaling: [...ab.entity_ability_scaling, { attribute_index: newIndex, level: 1, value: 0, value_type: 'percent', scaling_stat_id: null }]
        };
    }));
  };

  const removeAttribute = (abilityIndex: number, attrIndex: number) => {
    setAbilities(prev => prev.map((ab, i) => {
        if (i !== abilityIndex) return ab;
        return { ...ab, entity_ability_scaling: ab.entity_ability_scaling.filter(s => s.attribute_index !== attrIndex) };
    }));
  };

  // Sync back to parent when abilities change
  useEffect(() => {
    onChange(abilities);
  }, [abilities, onChange]);

  const loadTemplate = (templateId: string) => {
    const template = abilityTemplates.find(t => t.id === templateId);
    if (!template) return;

    const newAbilities = [...abilities];
    template.section_ability_definitions.forEach(def => {
      if (!newAbilities.find(a => a.definition_id === def.id)) {
        newAbilities.push({
          definition_id: def.id,
          name: { [gameDefaultLang]: '' },
          description: { [gameDefaultLang]: '' },
          icon_path: null,
          entity_ability_forms: [],
          entity_ability_scaling: []
        });
      }
    });
    setAbilities(newAbilities);
    onChange(newAbilities);
  };

  const definitionMap = useMemo(() => {
    const map = new Map<string, AbilityDefinition>();
    abilityTemplates.flatMap(t => t.section_ability_definitions).forEach(d => map.set(d.id, d));
    return map;
  }, [abilityTemplates]);

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <h2 className="text-xl font-bold text-white uppercase tracking-tight">Abilities & Kits</h2>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-zinc-500 uppercase">Load Optional Template:</span>
          <select 
            onChange={(e) => loadTemplate(e.target.value)} 
            className="bg-zinc-900 border border-zinc-800 text-white text-xs font-bold p-2 rounded-lg"
            defaultValue=""
          >
            <option value="" disabled>Choose Template...</option>
            {abilityTemplates.filter(t => !t.is_default).map(t => (
              <option key={t.id} value={t.id}>{getTranslatedField(t.name, activeLang, gameDefaultLang)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {abilities.map((ab, abIdx) => {
          const def = definitionMap.get(ab.definition_id);
          const maxLevel = def?.max_level || 1;
          const attrIndices = Array.from(new Set(ab.entity_ability_scaling.map(s => s.attribute_index))).sort((a,b) => a-b);

          return (
            <div key={ab.definition_id} className="space-y-6 bg-zinc-900/20 p-6 rounded-3xl border border-zinc-800/50">
              <div className="flex items-center justify-between border-b border-zinc-800/50 pb-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center">
                    <span className="text-zinc-500 text-xs font-black uppercase">Slot</span>
                    </div>
                    <div>
                    <h3 className="text-lg font-black text-white uppercase italic">
                        {def ? getTranslatedField(def.name, activeLang, gameDefaultLang) : 'Unknown Slot'}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Main Ability Entry</p>
                    </div>
                </div>
                {maxLevel > 1 && (
                    <div className="text-right">
                        <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-3 py-1 rounded-full uppercase tracking-widest border border-green-500/20">Scalable (Max Lv.{maxLevel})</span>
                    </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 ml-1">Icon</label>
                  <ImageInput 
                    name={`ability-${abIdx}-icon`}
                    existingImageUrl={ab.icon_path ? supabase.storage.from('games').getPublicUrl(ab.icon_path).data.publicUrl : undefined}
                    onFileChange={() => {}}
                  />
                </div>
                <div className="lg:col-span-3 space-y-4">
                  <LocalizedTextInput 
                    id={`ab-name-${abIdx}`} 
                    label="Ability Name" 
                    value={ab.name} 
                    onChange={(val) => handleAbilityChange(abIdx, { name: val })} 
                  />
                  <LocalizedTextInput 
                    id={`ab-desc-${abIdx}`} 
                    label="Description" 
                    value={ab.description} 
                    onChange={(val) => handleAbilityChange(abIdx, { description: val })} 
                    textarea 
                  />
                </div>
              </div>

              {maxLevel > 1 && (
                <div className="mt-8 space-y-4 pt-8 border-t border-zinc-800/50">
                    <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-3">
                            <span className="w-8 h-[1px] bg-zinc-800" />
                            Ability Scaling
                        </h4>
                        <button onClick={() => addAttribute(abIdx)} className="text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-300 px-3 py-1 rounded-lg border border-zinc-700 hover:bg-zinc-700 transition-colors">+ Add Attribute</button>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-zinc-800/50">
                        <table className="w-full text-left border-collapse bg-zinc-950/30">
                            <thead>
                                <tr className="border-b border-zinc-800/50">
                                    <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest w-20">Level</th>
                                    {attrIndices.map(attrIdx => {
                                        const sampleEntry = ab.entity_ability_scaling.find(s => s.attribute_index === attrIdx);
                                        return (
                                            <th key={attrIdx} className="p-4 border-l border-zinc-800/50 min-w-[150px]">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Attr {attrIdx + 1}</span>
                                                        <button onClick={() => removeAttribute(abIdx, attrIdx)} className="text-red-500 hover:text-red-400">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <select 
                                                            value={sampleEntry?.value_type || 'percent'}
                                                            onChange={(e) => updateScalingType(abIdx, attrIdx, e.target.value as 'percent' | 'flat')}
                                                            className="bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase p-1 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-zinc-400 w-12"
                                                        >
                                                            <option value="percent">%</option>
                                                            <option value="flat">#</option>
                                                        </select>
                                                        <select 
                                                            value={sampleEntry?.scaling_stat_id || ''}
                                                            onChange={(e) => updateScalingStat(abIdx, attrIdx, e.target.value || null)}
                                                            className="bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase p-1 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-zinc-400 flex-1"
                                                        >
                                                            <option value="">No Stat</option>
                                                            {sectionStats.map(s => (
                                                                <option key={s.id} value={s.id}>{getTranslatedField(s.name, activeLang, gameDefaultLang)}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: maxLevel }, (_, i) => i + 1).map(level => (
                                    <tr key={level} className="border-b border-zinc-800/30 hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 text-xs font-black text-zinc-400 bg-zinc-900/50">{level}</td>
                                        {attrIndices.map(attrIdx => {
                                            const entry = ab.entity_ability_scaling.find(s => s.attribute_index === attrIdx && s.level === level);
                                            return (
                                                <td key={attrIdx} className="p-2 border-l border-zinc-800/30">
                                                    <input 
                                                        type="number"
                                                        step="any"
                                                        value={entry?.value ?? ''}
                                                        onChange={(e) => updateScalingValue(abIdx, attrIdx, level, parseFloat(e.target.value) || 0)}
                                                        className="w-full bg-transparent border-0 text-white text-sm font-medium p-2 focus:outline-none focus:ring-1 focus:ring-green-500 rounded"
                                                        placeholder="0"
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              )}

              {ab.entity_ability_forms.length > 0 && (
                <div className="mt-8 space-y-6 pt-8 border-t border-zinc-800/50">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-3"><span className="w-8 h-[1px] bg-zinc-800" />Alternate Forms</h4>
                  <div className="grid grid-cols-1 gap-6">
                    {ab.entity_ability_forms.map((form, fIdx) => (
                      <div key={fIdx} className="relative bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/30 group">
                        <button onClick={() => removeForm(abIdx, fIdx)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                          <div className="lg:col-span-1">
                             <ImageInput name={`ability-${abIdx}-form-${fIdx}-icon`} existingImageUrl={form.icon_path ? supabase.storage.from('games').getPublicUrl(form.icon_path).data.publicUrl : undefined} onFileChange={() => {}} />
                          </div>
                          <div className="lg:col-span-3 space-y-4">
                            <LocalizedTextInput id={`form-name-${abIdx}-${fIdx}`} label="Form Name" value={form.name} onChange={(val) => updateForm(abIdx, fIdx, { name: val })} />
                            <LocalizedTextInput id={`form-desc-${abIdx}-${fIdx}`} label="Form Description" value={form.description} onChange={(val) => updateForm(abIdx, fIdx, { description: val })} textarea />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => addForm(abIdx)} className="w-full py-3 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-zinc-800/50">+ Add Alternate Form</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
