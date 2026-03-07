"use client";

import Image from "next/image";
import { X, Search, ChevronRight } from "lucide-react";
import { getPublicUrl } from "@/lib/supabase/client";
import { getTranslatedField } from "@/lib/localization";
import { Member, TeamEntity, TeamFieldOption } from "./types";

interface MemberSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectionType: 'entity' | 'option' | null;
  onSelectionTypeChange: (type: 'entity' | 'option') => void;
  entitySearchTerm: string;
  onSearchTermChange: (term: string) => void;
  filteredEntities: TeamEntity[];
  fieldOptions: TeamFieldOption[];
  onSelectMember: (member: Member) => void;
  currentLang: string;
  gameDefaultLang: string;
}

export function MemberSelectionModal({
  isOpen,
  onClose,
  selectionType,
  onSelectionTypeChange,
  entitySearchTerm,
  onSearchTermChange,
  filteredEntities,
  fieldOptions,
  onSelectMember,
  currentLang,
  gameDefaultLang,
}: MemberSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl">
      <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-zinc-800 flex flex-col gap-6 bg-zinc-900/50">
          <div className="flex justify-between items-center">
            <h4 className="text-xl font-black uppercase italic text-zinc-400 tracking-widest">Select Team Element</h4>
            <button onClick={onClose} className="text-zinc-600 hover:text-white"><X /></button>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => onSelectionTypeChange('entity')}
              className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all ${selectionType === 'entity' ? 'bg-green-500 text-black shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
            >
              Specific Entity
            </button>
            <button 
              onClick={() => onSelectionTypeChange('option')}
              className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all ${selectionType === 'option' ? 'bg-green-500 text-black shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
            >
              Class Requirement
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10">
          {selectionType === 'entity' && (
            <div className="space-y-8">
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-green-500 transition-colors" size={24} />
                <input 
                  type="text"
                  value={entitySearchTerm}
                  onChange={(e) => onSearchTermChange(e.target.value)}
                  placeholder="SEARCH DATABASE..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-[1.5rem] pl-16 pr-8 py-5 text-sm text-white font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all shadow-inner"
                />
              </div>
              
              <div className="grid grid-cols-4 gap-6">
                {filteredEntities.map(ent => {
                  const entIconUrl = getPublicUrl('games', ent.icon_path);
                  return (
                    <button 
                      key={ent.id} 
                      onClick={() => onSelectMember({ type: 'entity', id: ent.id, name: getTranslatedField(ent.name, currentLang, gameDefaultLang), icon_path: ent.icon_path })}
                      className="flex flex-col items-center gap-3 group"
                    >
                      <div className="w-full aspect-square rounded-[2rem] overflow-hidden border-2 border-zinc-800 group-hover:border-green-500 transition-all group-hover:scale-105 shadow-xl bg-zinc-950 relative">
                        {entIconUrl ? (
                          <Image src={entIconUrl} alt="" fill sizes="120px" className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] font-black uppercase text-zinc-600 p-2 text-center">{getTranslatedField(ent.name, currentLang, gameDefaultLang)}</div>
                        )}
                      </div>
                      <span className="text-[10px] font-black text-zinc-500 uppercase text-center truncate w-full group-hover:text-green-400 transition-colors tracking-tight">
                        {getTranslatedField(ent.name, currentLang, gameDefaultLang)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectionType === 'option' && (
            <div className="grid grid-cols-1 gap-4">
              {fieldOptions.map(opt => {
                const optIconUrl = getPublicUrl('games', opt.icon_path);
                return (
                  <button 
                    key={opt.id} 
                    onClick={() => onSelectMember({ type: 'option', id: opt.id, name: getTranslatedField(opt.value_key, currentLang, gameDefaultLang), icon_path: opt.icon_path, color: opt.color })}
                    className="w-full flex items-center gap-6 p-6 rounded-[2rem] bg-zinc-950 border border-zinc-800 hover:border-green-500 transition-all text-left group"
                  >
                    {optIconUrl ? (
                      <div className="relative w-14 h-14">
                        <Image src={optIconUrl} alt="" fill sizes="56px" className="object-contain" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-2xl shadow-inner border border-zinc-800" style={{ backgroundColor: opt.color || '#111' }} />
                    )}
                    <div className="flex-1">
                      <div className="text-lg font-black text-white uppercase italic tracking-widest group-hover:text-green-400 transition-colors">{getTranslatedField(opt.value_key, currentLang, gameDefaultLang)}</div>
                      <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mt-1">{opt.field_name}</div>
                    </div>
                    <ChevronRight className="text-zinc-800 group-hover:text-green-500 transition-colors" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
