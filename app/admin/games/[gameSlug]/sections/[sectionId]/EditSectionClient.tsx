"use client";

import { useState, useActionState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { deleteSectionAction, upsertSectionAction } from '@/app/admin/games/[gameSlug]/sections/actions';
import ConfirmButton from '@/app/components/ConfirmButton';
import LocalizedTextInput from '@/app/components/fields/LocalizedTextInput';
import ImageInput from '@/app/components/ImageInput';
import EntityGridManager from '@/app/components/EntityGridManager';
import TeamBuilder from '@/app/components/TeamBuilder';
import { TeamData, TeamEntity, TeamFieldOption } from '@/app/components/teambuilder/types';
import { LocalizedString, getTranslatedField, GameLocalizationProvider, useLocalizationParams } from "@/lib/localization";
import Link from "next/link";
import MissingTranslationIndicator from '@/app/components/MissingTranslationIndicator';
import { Game, Section, SectionDisplaySettings, SectionStat, SectionAscension, AbilityTemplate, AbilityDefinition } from '@/lib/supabase/queries';
import { ProcessedEntity } from '@/app/[gameSlug]/sections/[sectionId]/page';

import CreatableTagInput from '@/app/components/fields/CreatableTagInput';
import { upsertSectionStatAction, deleteSectionStatAction, upsertSectionAscensionAction, deleteSectionAscensionAction, upsertAbilityTemplateAction, deleteAbilityTemplateAction, upsertAbilityDefinitionAction, deleteAbilityDefinitionAction } from '@/app/admin/games/[gameSlug]/sections/actions';

type FieldOption = { id: string; game_field_id: string; value_key: LocalizedString; icon_path: string | null; color: string | null; order_index: number; };
type Field = { id: string; section_id: string; key: LocalizedString; required: boolean; manual_fill: boolean; has_icon: boolean; has_color: boolean; order_index: number; is_multi: boolean; category: string | null; field_options: FieldOption[] | null; };
type FormState = { error: string | null; success?: boolean; };

function SectionAbilityTemplateManager({ sectionId, existingTemplates, gameDefaultLang, activeLang }: { sectionId: string; existingTemplates: (AbilityTemplate & { section_ability_definitions: AbilityDefinition[] })[]; gameDefaultLang: string, activeLang: string }) {
  const router = useRouter();
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<LocalizedString>({ [gameDefaultLang]: '' });
  const [isDefault, setIsDefault] = useState(false);

  const [editingDefinition, setEditingDefinition] = useState<string | null>(null);
  const [definitionName, setDefinitionName] = useState<LocalizedString>({ [gameDefaultLang]: '' });
  const [definitionMaxLevel, setDefinitionMaxLevel] = useState(1);
  const [definitionTemplateId, setDefinitionTemplateId] = useState<string | null>(null);

  const handleUpsertTemplate = async (id?: string) => {
    const formData = new FormData();
    if (id) formData.set('id', id);
    formData.set('name', JSON.stringify(templateName));
    formData.set('is_default', isDefault.toString());
    const res = await upsertAbilityTemplateAction(sectionId, formData);
    if (res.success) { toast.success('Template saved'); setEditingTemplate(null); router.refresh(); }
  };

  const handleUpsertDefinition = async (templateId: string, id?: string) => {
    const formData = new FormData();
    if (id) formData.set('id', id);
    formData.set('name', JSON.stringify(definitionName));
    formData.set('max_level', definitionMaxLevel.toString());
    const res = await upsertAbilityDefinitionAction(sectionId, templateId, formData);
    if (res.success) { toast.success('Slot saved'); setEditingDefinition(null); router.refresh(); }
  };

  const [confirmDeleteTemplateId, setConfirmDeleteTemplateId] = useState<string | null>(null);
  const [confirmDeleteDefinitionId, setConfirmDeleteDefinitionId] = useState<string | null>(null);

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirmDeleteTemplateId !== templateId) { setConfirmDeleteTemplateId(templateId); return; }
    setConfirmDeleteTemplateId(null);
    const res = await deleteAbilityTemplateAction(sectionId, templateId);
    if (res.success) { toast.success('Template deleted'); router.refresh(); }
  };

  const handleDeleteDefinition = async (definitionId: string) => {
    if (confirmDeleteDefinitionId !== definitionId) { setConfirmDeleteDefinitionId(definitionId); return; }
    setConfirmDeleteDefinitionId(null);
    const res = await deleteAbilityDefinitionAction(sectionId, definitionId);
    if (res.success) { toast.success('Slot deleted'); router.refresh(); }
  };

  const startEditingTemplate = (template: AbilityTemplate) => {
    setEditingTemplate(template.id);
    setTemplateName(template.name);
    setIsDefault(template.is_default);
  };

  const startEditingDefinition = (templateId: string, def: AbilityDefinition) => {
    setEditingDefinition(def.id);
    setDefinitionTemplateId(templateId);
    setDefinitionName(def.name);
    setDefinitionMaxLevel(def.max_level);
  };

  const startAddingTemplate = () => {
    setEditingTemplate('new');
    setTemplateName({ [gameDefaultLang]: '' });
    setIsDefault(false);
  };

  const startAddingDefinition = (templateId: string) => {
    setEditingDefinition('new');
    setDefinitionTemplateId(templateId);
    setDefinitionName({ [gameDefaultLang]: '' });
    setDefinitionMaxLevel(1);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6">
        {existingTemplates.map(template => (
          <div key={template.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
            {editingTemplate === template.id ? (
              <div className="space-y-4 bg-zinc-950 p-4 rounded-xl border border-green-500/30">
                <LocalizedTextInput id={`edit-template-${template.id}`} label="Template Name" value={templateName} onChange={setTemplateName} />
                <div className="flex items-center gap-3">
                  <input type="checkbox" id={`edit-default-${template.id}`} checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-[#22c55e]" />
                  <label htmlFor={`edit-default-${template.id}`} className="text-xs font-bold text-zinc-400 uppercase tracking-widest cursor-pointer">Default</label>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleUpsertTemplate(template.id)} className="flex-1 bg-green-500 text-black text-[10px] font-bold py-2 rounded-lg">Save Changes</button>
                  <button onClick={() => setEditingTemplate(null)} className="flex-1 bg-zinc-800 text-white text-[10px] font-bold py-2 rounded-lg">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {getTranslatedField(template.name, activeLang, gameDefaultLang)}
                    {template.is_default && <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full uppercase tracking-tighter font-black">Default</span>}
                  </h3>
                  <button onClick={() => startEditingTemplate(template)} className="text-[10px] text-zinc-500 hover:text-white font-bold uppercase tracking-widest">Edit Name</button>
                </div>
                {confirmDeleteTemplateId === template.id ? (
                  <span className="inline-flex gap-2 items-center">
                    <button onClick={() => handleDeleteTemplate(template.id)} className="text-xs font-bold px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-500">Yes, Delete</button>
                    <button onClick={() => setConfirmDeleteTemplateId(null)} className="text-xs px-2 py-1 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600">Cancel</button>
                  </span>
                ) : (
                  <button onClick={() => handleDeleteTemplate(template.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg text-[10px] font-black uppercase tracking-widest">Delete Template</button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {template.section_ability_definitions?.sort((a,b) => a.order_index - b.order_index).map(def => (
                editingDefinition === def.id ? (
                  <div key={def.id} className="bg-zinc-950 border border-green-500/30 p-3 rounded-xl space-y-3">
                    <LocalizedTextInput id={`edit-def-${def.id}`} label="Slot Name" value={definitionName} onChange={setDefinitionName} />
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 ml-1">Max Level</label>
                      <input type="number" value={definitionMaxLevel} onChange={(e) => setDefinitionMaxLevel(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-white text-xs" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleUpsertDefinition(template.id, def.id)} className="flex-1 bg-green-500 text-black text-[10px] font-bold py-1.5 rounded-lg">Save</button>
                      <button onClick={() => setEditingDefinition(null)} className="flex-1 bg-zinc-800 text-white text-[10px] font-bold py-1.5 rounded-lg">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div key={def.id} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex justify-between items-center group relative overflow-hidden">
                    <div className="flex flex-col">
                      <span className="text-sm text-zinc-300 font-bold uppercase italic">{getTranslatedField(def.name, activeLang, gameDefaultLang)}</span>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Max Level: {def.max_level}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditingDefinition(template.id, def)} className="text-zinc-400 hover:text-white p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      {confirmDeleteDefinitionId === def.id ? (
                        <span className="inline-flex gap-1">
                          <button onClick={() => handleDeleteDefinition(def.id)} className="text-[10px] font-bold px-1.5 py-0.5 bg-red-600 text-white rounded hover:bg-red-500">Yes</button>
                          <button onClick={() => setConfirmDeleteDefinitionId(null)} className="text-[10px] px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600">No</button>
                        </span>
                      ) : (
                        <button onClick={() => handleDeleteDefinition(def.id)} className="text-red-500 hover:text-red-400 p-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              ))}
              
              {editingDefinition === 'new' && definitionTemplateId === template.id ? (
                <div className="bg-zinc-950 border border-green-500/30 p-3 rounded-xl space-y-3">
                  <LocalizedTextInput id={`new-def-${template.id}`} label="Slot Name" value={definitionName} onChange={setDefinitionName} />
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 ml-1">Max Level</label>
                    <input type="number" value={definitionMaxLevel} onChange={(e) => setDefinitionMaxLevel(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-white text-xs" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpsertDefinition(template.id)} className="flex-1 bg-green-500 text-black text-[10px] font-bold py-1.5 rounded-lg">Save</button>
                    <button onClick={() => setEditingDefinition(null)} className="flex-1 bg-zinc-800 text-white text-[10px] font-bold py-1.5 rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => startAddingDefinition(template.id)} className="border-2 border-dashed border-zinc-800 rounded-xl p-3 flex items-center justify-center text-zinc-500 hover:border-zinc-700 hover:text-zinc-400 transition-all text-[10px] font-black uppercase tracking-widest">
                  + Add Slot
                </button>
              )}
            </div>
          </div>
        ))}

        {editingTemplate === 'new' ? (
          <div className="bg-zinc-900 border border-green-500/30 p-6 rounded-2xl space-y-4 shadow-2xl">
            <LocalizedTextInput id="new-template-name" label="Template Name" value={templateName} onChange={setTemplateName} placeholder="Standard Kit, Memosprite Kit..." />
            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_default_template" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-[#22c55e]" />
              <label htmlFor="is_default_template" className="text-xs font-bold text-zinc-400 uppercase tracking-widest cursor-pointer">Set as Default for Section</label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleUpsertTemplate()} className="flex-1 bg-green-500 text-black font-bold py-3 rounded-xl hover:bg-green-400 transition">Create Template</button>
              <button onClick={() => setEditingTemplate(null)} className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700 transition">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={startAddingTemplate} className="w-full py-6 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 hover:border-zinc-700 hover:text-zinc-400 transition-all font-black uppercase tracking-[0.2em] text-xs">
            + Create New Ability Template
          </button>
        )}
      </div>
    </div>
  );
}

function SectionStatsManager({ sectionId, existingStats, gameDefaultLang }: { sectionId: string; existingStats: SectionStat[]; gameDefaultLang: string }) {
  const router = useRouter();
  const stats = existingStats;
  const [isAdding, setIsAdding] = useState(false);
  const [confirmStatDeleteId, setConfirmStatDeleteId] = useState<string | null>(null);
  const [newName, setNewName] = useState<LocalizedString>({ [gameDefaultLang]: '' });
  const [newKey, setNewKey] = useState('');
  const [newOrder, setNewOrder] = useState(0);
  const [isScalable, setIsScalable] = useState(true);

  const handleAdd = async () => {
    if (!newKey) { toast.error('Internal key is required'); return; }
    const formData = new FormData();
    formData.set('key', newKey);
    formData.set('name', JSON.stringify(newName));
    formData.set('order_index', newOrder.toString());
    formData.set('is_scalable', isScalable.toString());
    const res = await upsertSectionStatAction(sectionId, formData);
    if (res.success) {
      setIsAdding(false);
      setNewName({ [gameDefaultLang]: '' });
      setNewKey('');
      setNewOrder(stats.length + 1);
      setIsScalable(true);
      toast.success('Stat added');
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmStatDeleteId !== id) { setConfirmStatDeleteId(id); return; }
    setConfirmStatDeleteId(null);
    const res = await deleteSectionStatAction(sectionId, id);
    if (res.success) { toast.success('Stat deleted'); router.refresh(); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(stat => (
          <div key={stat.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex justify-between items-center group relative overflow-hidden">
            <div className="z-10">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-white font-bold">{getTranslatedField(stat.name, gameDefaultLang, gameDefaultLang)}</p>
                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${stat.is_scalable ? 'bg-green-500/10 text-green-500' : 'bg-zinc-800 text-zinc-500'}`}>
                  {stat.is_scalable ? 'Scalable' : 'Static'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Key: {stat.key} | Order: {stat.order_index}</p>
            </div>
            {confirmStatDeleteId === stat.id ? (
              <span className="flex gap-2 z-10">
                <button onClick={() => handleDelete(stat.id)} className="text-xs font-bold px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-500">Yes</button>
                <button onClick={() => setConfirmStatDeleteId(null)} className="text-xs px-2 py-1 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600">No</button>
              </span>
            ) : (
              <button onClick={() => handleDelete(stat.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-lg z-10">
                Delete
              </button>
            )}
            {!stat.is_scalable && <div className="absolute top-0 right-0 w-16 h-16 bg-zinc-800/20 rotate-45 translate-x-8 -translate-y-8" />}
          </div>
        ))}
        {isAdding ? (
          <div className="bg-zinc-900 border border-green-500/30 p-4 rounded-xl space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Internal Key (e.g. hp, atk)</label>
              <input type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white text-sm" placeholder="hp" />
            </div>
            <LocalizedTextInput id="new-stat-name" label="Display Name" value={newName} onChange={setNewName} placeholder="HP, ATK, DEF..." />
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Order</label>
                <input type="number" value={newOrder} onChange={(e) => setNewOrder(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white text-sm" />
              </div>
              <div className="pt-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={isScalable} 
                    onChange={e => setIsScalable(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-green-500 focus:ring-green-500/50" 
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">Scalable</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleAdd} className="flex-1 bg-green-500 text-black font-bold py-2 rounded-lg hover:bg-green-400 transition text-sm">Save</button>
              <button onClick={() => setIsAdding(false)} className="flex-1 bg-zinc-800 text-white font-bold py-2 rounded-lg hover:bg-zinc-700 transition text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} className="border-2 border-dashed border-zinc-800 rounded-xl p-4 flex items-center justify-center text-zinc-500 hover:border-zinc-700 hover:text-zinc-400 transition-all group">
            <span className="font-bold uppercase tracking-widest text-xs">+ Add New Stat</span>
          </button>
        )}
      </div>
    </div>
  );
}

function SectionAscensionManager({ sectionId, existingAscensions }: { sectionId: string; existingAscensions: SectionAscension[]; maxLevel: number }) {
  const router = useRouter();
  const ascensions = existingAscensions;
  const [isAdding, setIsAdding] = useState(false);
  const [confirmAscDeleteId, setConfirmAscDeleteId] = useState<string | null>(null);
  const [newPhase, setNewPhase] = useState(ascensions.length);
  const [newMin, setNewMin] = useState(1);
  const [newMax, setNewMax] = useState(20);

  const handleAdd = async () => {
    const formData = new FormData();
    formData.set('phase_index', newPhase.toString());
    formData.set('min_level', newMin.toString());
    formData.set('max_level', newMax.toString());
    const res = await upsertSectionAscensionAction(sectionId, formData);
    if (res.success) {
      setIsAdding(false);
      toast.success('Phase added');
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmAscDeleteId !== id) { setConfirmAscDeleteId(id); return; }
    setConfirmAscDeleteId(null);
    const res = await deleteSectionAscensionAction(sectionId, id);
    if (res.success) { toast.success('Phase deleted'); router.refresh(); }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
              <th className="p-4">Phase</th>
              <th className="p-4">Min Level</th>
              <th className="p-4">Max Level</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {ascensions.map(asc => (
              <tr key={asc.id} className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-4 text-white font-bold">Phase {asc.phase_index}</td>
                <td className="p-4 text-zinc-400">{asc.min_level}</td>
                <td className="p-4 text-zinc-400">{asc.max_level}</td>
                <td className="p-4 text-right">
                  {confirmAscDeleteId === asc.id ? (
                    <span className="inline-flex gap-2">
                      <button onClick={() => handleDelete(asc.id)} className="text-xs font-bold px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-500">Yes</button>
                      <button onClick={() => setConfirmAscDeleteId(null)} className="text-xs px-2 py-1 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600">No</button>
                    </span>
                  ) : (
                    <button onClick={() => handleDelete(asc.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:underline">Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {isAdding && (
              <tr className="bg-green-500/5">
                <td className="p-4"><input type="number" value={newPhase} onChange={e => setNewPhase(Number(e.target.value))} className="w-20 bg-zinc-950 border border-zinc-800 rounded p-1 text-white" /></td>
                <td className="p-4"><input type="number" value={newMin} onChange={e => setNewMin(Number(e.target.value))} className="w-20 bg-zinc-950 border border-zinc-800 rounded p-1 text-white" /></td>
                <td className="p-4"><input type="number" value={newMax} onChange={e => setNewMax(Number(e.target.value))} className="w-20 bg-zinc-950 border border-zinc-800 rounded p-1 text-white" /></td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={handleAdd} className="text-green-500 font-bold hover:underline">Save</button>
                  <button onClick={() => setIsAdding(false)} className="text-zinc-500 hover:underline">Cancel</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!isAdding && (
        <button onClick={() => setIsAdding(true)} className="w-full py-3 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:border-zinc-700 hover:text-zinc-400 transition-all font-bold uppercase tracking-widest text-xs">
          + Add Ascension Phase
        </button>
      )}
    </div>
  );
}

export default function EditSectionClient({
  game, section, fields, displaySettings, entities, filterFieldsData, currentLang: browserLang, updateDisplaySettingsAction, sectionTeams = [], sectionStats = [], sectionAscensions = [], abilityTemplates = []
}: {
  game: Game; 
  section: Section; 
  fields: Field[]; 
  displaySettings: SectionDisplaySettings | null; 
  entities: ProcessedEntity[]; 
  filterFieldsData: { id: string; key: LocalizedString; options: { id: string; value_key: LocalizedString; iconUrl?: string; color?: string }[] }[]; 
  currentLang: string; 
  updateDisplaySettingsAction: (formData: FormData) => Promise<{ error?: string }>;
  sectionTeams: TeamData[];
  sectionStats: SectionStat[];
  sectionAscensions: SectionAscension[];
  abilityTemplates: (AbilityTemplate & { section_ability_definitions: AbilityDefinition[] })[];
}) {
  const supabase = createClient();
  const { displayLang, t } = useLocalizationParams();
  const activeLang = displayLang || browserLang;

  const [localizedKey, setLocalizedKey] = useState<LocalizedString>(section.key);
  const [color, setColor] = useState<string>(section.color || "#ffffff");
  const [orderIndex, setOrderIndex] = useState<number>(section.order_index);
  const [isCollectible, setIsCollectible] = useState<boolean>(section.is_collectible);
  const [isUnique, setIsUnique] = useState<boolean>(section.is_unique ?? true);
  const [hasTeams, setHasTeams] = useState<boolean>(section.has_teams ?? false);
  const [maxTeamSize, setMaxTeamSize] = useState<number>(section.max_team_size ?? 0);
  const [minDupes, setMinDupes] = useState<number>(section.min_dupes ?? 0);
  const [maxDupes, setMaxDupes] = useState<number>(section.max_dupes ?? 0);
  const [localizedDupeName, setLocalizedDupeName] = useState<LocalizedString>(section.dupe_name || { [game.default_lang]: "Duplicate" });
  const [skinImageTypes, setSkinImageTypes] = useState<string[]>(section.skin_image_types || ["icon", "splashart"]);
  const [hasStats, setHasStats] = useState<boolean>(section.has_stats ?? false);
  const [hasAscension, setHasAscension] = useState<boolean>(section.has_ascension ?? false);
  const [maxLevel, setMaxLevel] = useState<number>(section.max_level ?? 1);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [existingIconPath, setExistingIconPath] = useState<string | null>(section.icon_path);
  const [filterFieldIds, setFilterFieldIds] = useState<string[]>(displaySettings?.filter_field_ids || []);

  const [bgColorFieldId, setBgColorFieldId] = useState<string>(displaySettings?.bg_color_field_id || "");
  const [topLeftIconFieldId, setTopLeftIconFieldId] = useState<string>(displaySettings?.top_left_icon_field_id || "");
  const [topRightIconFieldId, setTopRightIconFieldId] = useState<string>(displaySettings?.top_right_icon_field_id || "");
  const [overlayIconFieldId, setOverlayIconFieldId] = useState<string>(displaySettings?.overlay_icon_field_id || "");
  const [maxColumns, setMaxColumns] = useState<number>(displaySettings?.max_columns ?? 6);
  const [skinDisplayTypes, setSkinDisplayTypes] = useState<string[]>(displaySettings?.skin_display_types || ["splashart"]);

  const [sectionState, sectionFormAction] = useActionState(
    async (_prevState: FormState, formData: FormData): Promise<FormState> => {
      formData.set("id", section.id);
      formData.set("key", JSON.stringify(localizedKey));
      formData.set("color", color);
      formData.set("order_index", orderIndex.toString());
      formData.set("is_collectible", isCollectible.toString());
      formData.set("is_unique", isUnique.toString());
      formData.set("has_teams", hasTeams.toString());
      formData.set("max_team_size", maxTeamSize.toString());
      formData.set("min_dupes", minDupes.toString());
      formData.set("max_dupes", maxDupes.toString());
      formData.set("dupe_name", JSON.stringify(localizedDupeName));
      formData.set("skin_image_types", JSON.stringify(skinImageTypes));
      formData.set("has_stats", hasStats.toString());
      formData.set("has_ascension", hasAscension.toString());
      formData.set("max_level", maxLevel.toString());
      if (iconFile) formData.set("icon_file", iconFile);
      formData.set("existing_icon_path", existingIconPath || "null");
      const res = await upsertSectionAction(game.id, game.slug, game.default_lang, formData);
      if (!res?.error) toast.success('Section saved');
      return { error: res?.error || null };
    },
    { error: null }
  );

  const [displaySettingsState, displaySettingsFormAction] = useActionState(
    async (_prevState: FormState, formData: FormData): Promise<FormState> => {
      formData.set("max_columns", maxColumns.toString());
      formData.set("bg_color_field_id", bgColorFieldId);
      formData.set("top_left_icon_field_id", topLeftIconFieldId);
      formData.set("top_right_icon_field_id", topRightIconFieldId);
      formData.set("overlay_icon_field_id", overlayIconFieldId);

      formData.delete("filter_field_ids");
      filterFieldIds.forEach(id => formData.append("filter_field_ids", id));

      formData.delete("skin_display_types");
      skinDisplayTypes.forEach(type => formData.append("skin_display_types", type));

      const res = await updateDisplaySettingsAction(formData);
      if (!res?.error) toast.success('Display settings saved');
      return { error: res?.error || null };
    },
    { error: null }
  );

  const toggleFilterField = (id: string) => {
    setFilterFieldIds(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const toggleSkinDisplayType = (type: string) => {
    setSkinDisplayTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const groupedFields: Record<string, Field[]> = {};
  fields.forEach(field => {
    const cat = field.category || 'General';
    // eslint-disable-next-line security/detect-object-injection
    if (!groupedFields[cat]) {
      // eslint-disable-next-line security/detect-object-injection
      groupedFields[cat] = [];
    }
    // eslint-disable-next-line security/detect-object-injection
    groupedFields[cat]!.push(field);
  });

  const sortedCategories = Object.keys(groupedFields).sort((a, b) => {
    // eslint-disable-next-line security/detect-object-injection
    const minA = Math.min(...groupedFields[a]!.map(f => f.order_index || 0));
    // eslint-disable-next-line security/detect-object-injection
    const minB = Math.min(...groupedFields[b]!.map(f => f.order_index || 0));
    if (minA !== minB) return minA - minB;
    return a.localeCompare(b);
  });

  const fieldOptions = useMemo<TeamFieldOption[]>(() => {
    return fields.flatMap(f => (f.field_options || []).map((o) => ({
      ...o,
      field_name: getTranslatedField(f.key, activeLang, game.default_lang)
    })));
  }, [fields, activeLang, game.default_lang]);

  const sectionEntities = useMemo<TeamEntity[]>(() => {
    return entities.map((ent) => ({
      id: ent.id,
      name: ent.name,
      icon_path: ent.icon_path,
    }));
  }, [entities]);

  const sectionIconPublicUrl = section.icon_path ? supabase.storage.from('games').getPublicUrl(section.icon_path).data.publicUrl : null;

  return (
    <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
      <main className="max-w-7xl mx-auto p-8 space-y-10">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            {t('editSection')}: {getTranslatedField(section.key, activeLang, game.default_lang)}
            <MissingTranslationIndicator value={section.key} />
          </h1>
          <form action={deleteSectionAction.bind(null, section.id, game.slug)}><ConfirmButton>{t('delete')} {t('section')}</ConfirmButton></form>
        </div>
        {(sectionState?.error || displaySettingsState?.error) && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg">{sectionState.error || displaySettingsState.error}</div>}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
            <section className="space-y-6 border-b pb-10">
              <h2 className="text-xl font-semibold text-white">{t('generalInfo')}</h2>
              <form action={sectionFormAction} className="space-y-4">
                <LocalizedTextInput id="key" label={t('sectionName')} value={localizedKey} onChange={setLocalizedKey} placeholder="Characters" />
                <div className="flex flex-wrap gap-8 items-center">
                  <div><label htmlFor="color" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('color')}</label><input id="color" name="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-10 border-0 rounded-md overflow-hidden bg-zinc-900" /></div>
                  <div><label htmlFor="order_index" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('orderIndex')}</label><input id="order_index" name="order_index" type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} className="block w-24 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all" /></div>
                  <div className="flex items-center gap-3 pt-6">
                    <input 
                      id="is_collectible" 
                      type="checkbox" 
                      checked={isCollectible} 
                      onChange={(e) => setIsCollectible(e.target.checked)}
                      className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-[#22c55e] focus:ring-[#22c55e]"
                    />
                    <label htmlFor="is_collectible" className="text-xs font-bold text-zinc-500 uppercase tracking-widest cursor-pointer text-zinc-400">
                      {t('isCollectible')}
                    </label>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input 
                      id="has_teams" 
                      type="checkbox" 
                      checked={hasTeams} 
                      onChange={(e) => setHasTeams(e.target.checked)}
                      className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-[#22c55e] focus:ring-[#22c55e]"
                    />
                    <label htmlFor="has_teams" className="text-xs font-bold text-zinc-500 uppercase tracking-widest cursor-pointer text-zinc-400">
                      Build Teams
                    </label>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input 
                      id="has_stats" 
                      type="checkbox" 
                      checked={hasStats} 
                      onChange={(e) => setHasStats(e.target.checked)}
                      className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-[#22c55e] focus:ring-[#22c55e]"
                    />
                    <label htmlFor="has_stats" className="text-xs font-bold text-zinc-500 uppercase tracking-widest cursor-pointer text-zinc-400">
                      Enable Stats
                    </label>
                  </div>
                  {hasStats && (
                    <>
                      <div className="flex items-center gap-3 pt-6">
                        <input 
                          id="has_ascension" 
                          type="checkbox" 
                          checked={hasAscension} 
                          onChange={(e) => setHasAscension(e.target.checked)}
                          className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-[#22c55e] focus:ring-[#22c55e]"
                        />
                        <label htmlFor="has_ascension" className="text-xs font-bold text-zinc-500 uppercase tracking-widest cursor-pointer text-zinc-400">
                          Enable Ascension
                        </label>
                      </div>
                      <div className="flex items-center gap-3 pt-6">
                        <label htmlFor="max_level" className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-zinc-400">
                          Max Level
                        </label>
                        <input 
                          id="max_level" 
                          type="number" 
                          value={maxLevel} 
                          onChange={(e) => setMaxLevel(Number(e.target.value))}
                          className="w-20 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                    </>
                  )}
                  {hasTeams && (
                    <div className="flex items-center gap-3 pt-6">
                      <label htmlFor="max_team_size" className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-zinc-400">
                        Max Team Size
                      </label>
                      <input 
                        id="max_team_size" 
                        type="number" 
                        value={maxTeamSize} 
                        onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                        className="w-20 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                    </div>
                  )}
                </div>

                {isCollectible && (
                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input 
                          id="is_unique" 
                          type="checkbox" 
                          checked={isUnique} 
                          onChange={(e) => setIsUnique(e.target.checked)}
                          className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-[#22c55e] focus:ring-[#22c55e]"
                        />
                        <label htmlFor="is_unique" className="text-xs font-bold text-zinc-500 uppercase tracking-widest cursor-pointer text-zinc-400">
                          {t('isUnique')}
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <label htmlFor="min_dupes" className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-zinc-400">
                          {t('minDupes')}
                        </label>
                        <input 
                          id="min_dupes" 
                          type="number" 
                          value={minDupes ?? 0} 
                          onChange={(e) => setMinDupes(Number(e.target.value))}
                          className="w-20 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label htmlFor="max_dupes" className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-zinc-400">
                          {t('maxDupes')}
                        </label>
                        <input 
                          id="max_dupes" 
                          type="number" 
                          value={maxDupes ?? 0} 
                          onChange={(e) => setMaxDupes(Number(e.target.value))}
                          className="w-20 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <LocalizedTextInput 
                      id="dupe_name" 
                      label={t('dupeLabelName')} 
                      value={localizedDupeName} 
                      onChange={setLocalizedDupeName} 
                      placeholder="Constellation, Refinement..." 
                    />
                  </div>
                )}

                <div><label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">{t('icon')}</label><ImageInput name="icon_file" onFileChange={setIconFile} existingImageUrl={sectionIconPublicUrl} onRemoveExisting={() => setExistingIconPath(null)} /><input type="hidden" name="existing_icon_path" value={existingIconPath || ""} /></div>
                
                <div className="pt-4 border-t border-zinc-800">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">
                    Skin Image Types
                  </label>
                  <CreatableTagInput 
                    name="skin_image_types_input"
                    initialValues={skinImageTypes}
                    onChange={(values) => setSkinImageTypes(values)}
                  />
                  <p className="mt-2 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                    Define custom image slots for skins (e.g., icon, splashart, sprite, thumb).
                  </p>
                </div>

                <button type="submit" className="w-full bg-[#22c55e] text-black font-bold px-4 py-3 rounded-xl hover:bg-[#1da34a] transition">{t('save')} {t('section')}</button>
              </form>
            </section>

            {hasStats && (
              <section className="space-y-10 border-b pb-10">
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-white">Section Stats Configuration</h2>
                  <SectionStatsManager sectionId={section.id} existingStats={sectionStats} gameDefaultLang={game.default_lang} />
                </div>
                
                {hasAscension && (
                  <div className="space-y-6 pt-10 border-t border-zinc-800">
                    <h2 className="text-xl font-semibold text-white">Section Ascension Phases</h2>
                    <SectionAscensionManager sectionId={section.id} existingAscensions={sectionAscensions} maxLevel={maxLevel} />
                  </div>
                )}
              </section>
            )}

            <section className="space-y-6 border-b pb-10">
              <h2 className="text-xl font-semibold text-white">Ability Templates</h2>
              <SectionAbilityTemplateManager sectionId={section.id} existingTemplates={abilityTemplates} gameDefaultLang={game.default_lang} activeLang={activeLang} />
            </section>

            <section className="space-y-6 border-b pb-10">
              <h2 className="text-xl font-semibold text-white">{t('displaySettings')}</h2>
              <form action={displaySettingsFormAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-400">{t('maxColumns')}</label>
                  <input name="max_columns" type="number" value={maxColumns} onChange={(e) => setMaxColumns(Number(e.target.value))} className="border p-2 w-full bg-zinc-900 text-white border-zinc-800 rounded" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-400">{t('backgroundColorField')}</label>
                  <select name="bg_color_field_id" value={bgColorFieldId} onChange={(e) => setBgColorFieldId(e.target.value)} className="border p-2 w-full bg-zinc-900 text-white border-zinc-800 rounded">
                    <option value="">{t('none')}</option>
                    {fields.map(f => (
                      <option key={f.id} value={f.id}>{getTranslatedField(f.key, activeLang, game.default_lang)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-400">{t('topLeftIconField')}</label>
                  <select name="top_left_icon_field_id" value={topLeftIconFieldId} onChange={(e) => setTopLeftIconFieldId(e.target.value)} className="border p-2 w-full bg-zinc-900 text-white border-zinc-800 rounded">
                    <option value="">{t('none')}</option>
                    {fields.map(f => (
                      <option key={f.id} value={f.id}>{getTranslatedField(f.key, activeLang, game.default_lang)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-400">{t('topRightIconField')}</label>
                  <select name="top_right_icon_field_id" value={topRightIconFieldId} onChange={(e) => setTopRightIconFieldId(e.target.value)} className="border p-2 w-full bg-zinc-900 text-white border-zinc-800 rounded">
                    <option value="">{t('none')}</option>
                    {fields.map(f => (
                      <option key={f.id} value={f.id}>{getTranslatedField(f.key, activeLang, game.default_lang)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-400">{t('overlayIconField')}</label>
                  <select name="overlay_icon_field_id" value={overlayIconFieldId} onChange={(e) => setOverlayIconFieldId(e.target.value)} className="border p-2 w-full bg-zinc-900 text-white border-zinc-800 rounded">
                    <option value="">{t('none')}</option>
                    {fields.map(f => (
                      <option key={f.id} value={f.id}>{getTranslatedField(f.key, activeLang, game.default_lang)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400">{t('fieldsToFilterBy')}</label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {fields?.map(f => (
                      <label key={f.id} className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" name="filter_field_ids" value={f.id} checked={filterFieldIds.includes(f.id)} onChange={() => toggleFilterField(f.id)} className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-[#22c55e] focus:ring-[#22c55e]" />
                        <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">{getTranslatedField(f.key, activeLang, game.default_lang)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2 pt-4 border-t border-zinc-800/50">
                  <label className="block text-sm font-medium text-zinc-400">Skin Parts to Display (Public)</label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {skinImageTypes.map(type => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" name="skin_display_types" value={type} checked={skinDisplayTypes.includes(type)} onChange={() => toggleSkinDisplayType(type)} className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-[#22c55e] focus:ring-[#22c55e]" />
                        <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase tracking-widest text-[10px] font-bold">{type}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-medium">Choose which image types appear on the entity page. If multiple are selected, they will show in a grid.</p>
                </div>
                <div className="md:col-span-2"><button type="submit" className="w-full bg-[#22c55e] text-black font-bold px-4 py-3 rounded-xl hover:bg-[#1da34a] transition">{t('saveDisplaySettings')}</button></div>
              </form>
            </section>
          </div>
          <aside className="space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-xl font-semibold text-white">{t('fields')}</h2><Link href={`/admin/games/${game.slug}/sections/${section.id}/fields/new`} className="bg-[#22c55e] text-black font-bold px-2 py-1 text-sm rounded hover:bg-[#1da34a] transition">{t('add')} {t('field')}</Link></div>
            {sortedCategories.map(category => (
              <div key={category} className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800 pb-1">{category}</h3>
                <div className="space-y-1">
                  {/* eslint-disable-next-line security/detect-object-injection */}
                  {groupedFields[category]!.map(field => (
                    <Link key={field.id} href={`/admin/games/${game.slug}/sections/${section.id}/fields/${field.id}`} className="block border border-zinc-800 rounded p-2 hover:bg-zinc-800 transition text-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-300">{getTranslatedField(field.key, activeLang, game.default_lang)}</span>
                          <MissingTranslationIndicator value={field.key} />
                        </div>
                        <span className="text-xs text-zinc-500">{field.category}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </aside>
        </div>
        <EntityGridManager entities={entities} displaySettings={displaySettings} filterFields={filterFieldsData} gameSlug={game.slug} sectionId={section.id} sectionName={getTranslatedField(section.key, activeLang, game.default_lang)} isAdmin={true} gameDefaultLang={game.default_lang} currentLang={browserLang} />

        {hasTeams && (
          <div className="mt-20 pt-10 border-t border-zinc-800">
            <h2 className="text-2xl font-black uppercase italic text-white mb-10 flex items-center gap-4">
              <span className="w-12 h-1 bg-green-500" />
              Section Teams Management
            </h2>
            <TeamBuilder 
              sectionId={section.id}
              gameSlug={game.slug}
              sectionEntities={sectionEntities}
              fieldOptions={fieldOptions}
              maxTeamSize={maxTeamSize || 4}
              existingTeams={sectionTeams}
              gameDefaultLang={game.default_lang}
              isAdmin={true}
            />
          </div>
        )}
      </main>
    </GameLocalizationProvider>
  );
}
