"use client";

import Image from "next/image";
import { X, Plus, ChevronRight, GripVertical } from "lucide-react";
import { getPublicUrl } from "@/lib/supabase/client";
import { Slot } from "./types";

interface TeamEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  onTeamNameChange: (name: string) => void;
  maxTeamSize: number;
  currentSlots: Slot[];
  draggingIndex: number | null;
  onDragStart: (index: number) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
  onRemoveMember: (slotIdx: number, memberIdx: number) => void;
  onOpenSelection: (slotIdx: number) => void;
  onSave: () => void;
}

export function TeamEditorModal({
  isOpen,
  onClose,
  teamName,
  onTeamNameChange,
  maxTeamSize,
  currentSlots,
  draggingIndex,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onRemoveMember,
  onOpenSelection,
  onSave,
}: TeamEditorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h3 className="text-2xl font-black uppercase italic text-white tracking-widest">Team Architect</h3>
          <button onClick={onClose} className="bg-zinc-800 p-2 rounded-full text-zinc-500 hover:text-white transition"><X /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-10 space-y-12">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Composition Codename</label>
            <input 
              type="text" 
              value={teamName} 
              onChange={(e) => onTeamNameChange(e.target.value)}
              placeholder="e.g. ULTIMATE FREEZE TEAM"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-8 py-5 text-white font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-xl"
            />
          </div>

          <div className="space-y-8">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Team Matrix (Horizontal Slots / Vertical Alternatives)</label>
            <div className="flex flex-nowrap items-start gap-12 overflow-x-auto pb-8 min-h-[400px]">
              {Array.from({ length: maxTeamSize }).map((_, sIdx) => {
                const isDragging = draggingIndex === sIdx;
                return (
                  <div 
                    key={sIdx} 
                    className="flex items-start gap-12"
                    // eslint-disable-next-line security/detect-object-injection
                    draggable={!!currentSlots[sIdx]}
                    onDragStart={() => onDragStart(sIdx)}
                    onDragEnter={() => onDragEnter(sIdx)}
                    onDragEnd={onDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {sIdx > 0 && <ChevronRight className="text-zinc-800 mt-10" size={32} />}
                    
                    <div className={`flex flex-col items-center gap-6 p-6 rounded-[2.5rem] border-2 transition-all ${isDragging ? 'bg-green-500/10 border-green-500/50' : 'border-transparent bg-zinc-950/30'}`}>
                      <div className="flex flex-col gap-4">
                        {/* eslint-disable-next-line security/detect-object-injection */}
                        {currentSlots[sIdx]?.members.map((member, mIdx) => {
                          const mIconUrl = getPublicUrl('games', member.icon_path);
                          return (
                            <div key={mIdx} className="relative group">
                              <div className={`w-24 h-24 rounded-[2rem] overflow-hidden border-2 bg-zinc-950 transition-all shadow-2xl ${mIdx === 0 ? 'border-zinc-600' : 'border-zinc-800 scale-90 opacity-70'}`}>
                                {mIconUrl ? (
                                  <Image src={mIconUrl} alt={member.name} fill sizes="96px" className="object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[9px] font-bold uppercase p-3 text-center" style={{ backgroundColor: member.color || 'transparent' }}>
                                    {member.name}
                                  </div>
                                )}
                                <button 
                                  onClick={() => onRemoveMember(sIdx, mIdx)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-xl z-20"
                                >
                                  <X size={14} />
                                </button>
                                {mIdx === 0 && <div className="absolute top-0 left-0 bg-zinc-800 text-[6px] font-black px-1 py-0.5 rounded-br text-zinc-400">BEST</div>}
                              </div>
                            </div>
                          );
                        })}
                        
                        <button 
                          onClick={() => onOpenSelection(sIdx)}
                          className="w-24 h-24 rounded-[2rem] border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-700 hover:text-green-500 hover:border-green-500/50 hover:bg-green-500/5 transition-all group active:scale-95 shadow-inner"
                        >
                          <Plus size={32} />
                          {/* eslint-disable-next-line security/detect-object-injection */}
                          <span className="text-[8px] font-black uppercase tracking-tighter mt-1">{currentSlots[sIdx] ? 'Add Alternative' : 'Add Slot'}</span>
                        </button>
                      </div>

                      {/* eslint-disable-next-line security/detect-object-injection */}
                      {currentSlots[sIdx] && (
                        <div className="flex items-center gap-2 text-zinc-600 cursor-grab active:cursor-grabbing hover:text-zinc-400 transition-colors">
                          <GripVertical size={18} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Reorder</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-zinc-800 bg-zinc-950/50">
          <button 
            onClick={onSave}
            className="w-full bg-green-500 text-black font-black uppercase tracking-[0.3em] py-6 rounded-3xl hover:bg-green-400 transition-all shadow-[0_15px_50px_rgba(34,197,94,0.25)] active:scale-[0.98] text-lg"
          >
            DEPLOY RECOMMENDED ARCHITECTURE
          </button>
        </div>
      </div>
    </div>
  );
}
