"use client";

import { useState, useRef } from "react";
import { getTranslatedField, useLocalizationParams } from "@/lib/localization";
import { Plus, Trash2, X, Users, Search, ChevronRight, GripVertical } from "lucide-react";
import { upsertTeamAction, deleteTeamAction } from "@/app/collections/team-actions";
import { createClient } from "@/lib/supabase/client";

import Link from "next/link";

type Member = { type: 'entity' | 'option'; id: string; name: string; icon_path: string | null; color?: string | null };
type Slot = { members: Member[] };
type Team = { id: string; name: any; slots: Slot[] };

export default function TeamBuilder({
  sectionId,
  gameSlug,
  sectionEntities,
  fieldOptions,
  maxTeamSize,
  existingTeams,
  gameDefaultLang,
  isAdmin = false,
  currentEntityId = null,
}: {
  sectionId: string;
  gameSlug: string;
  sectionEntities: any[];
  fieldOptions: any[];
  maxTeamSize: number;
  existingTeams: any[];
  gameDefaultLang: string;
  isAdmin?: boolean;
  currentEntityId?: string | null;
}) {
  const supabase = createClient();
  const { currentLang } = useLocalizationParams() as any;

  const processedTeams: Team[] = existingTeams.map(t => {
    const slotMap: Record<number, Member[]> = {};
    // Ensure members are sorted by order_index so "Best" (0) comes first
    const members = [...(t.section_team_members || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    
    members.forEach((m: any) => {
      const sIdx = m.slot_index ?? 0;
      if (!slotMap[sIdx]) slotMap[sIdx] = [];
      
      if (m.member_type === 'entity') {
        const ent = sectionEntities.find(e => e.id === m.entity_id);
        slotMap[sIdx].push({ type: 'entity', id: m.entity_id, name: getTranslatedField(ent?.name, currentLang, gameDefaultLang), icon_path: ent?.icon_path });
      } else {
        const opt = fieldOptions.find(o => o.id === m.option_id);
        slotMap[sIdx].push({ type: 'option', id: m.option_id, name: getTranslatedField(opt?.value_key, currentLang, gameDefaultLang), icon_path: opt?.icon_path, color: opt?.color });
      }
    });

    const slots: Slot[] = Object.keys(slotMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map(idx => ({ members: slotMap[idx] }));

    return { id: t.id, name: t.name, slots };
  });

  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [currentSlots, setCurrentSlots] = useState<Slot[]>([]);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [isSelectingMember, setIsSelectingMember] = useState(false);
  const [selectionType, setSelectionType] = useState<'entity' | 'option' | null>(null);
  const [entitySearchTerm, setEntitySearchTerm] = useState("");

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleAddTeam = () => {
    setIsAddingTeam(true);
    let initialSlots: Slot[] = [];
    
    if (currentEntityId) {
      const ent = sectionEntities.find(e => e.id === currentEntityId);
      if (ent) {
        initialSlots = [{
          members: [{
            type: 'entity',
            id: ent.id,
            name: getTranslatedField(ent.name, currentLang, gameDefaultLang),
            icon_path: ent.icon_path
          }]
        }];
      }
    }
    
    setCurrentSlots(initialSlots);
    setNewTeamName("");
  };

  const handleSaveTeam = async (teamId: string | null) => {
    const res = await upsertTeamAction(sectionId, teamId, newTeamName, currentSlots);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (confirm("Are you sure you want to delete this team?")) {
      const res = await deleteTeamAction(id);
      if (res.success) window.location.reload();
    }
  };

  const openSelection = (slotIndex: number) => {
    setActiveSlotIndex(slotIndex);
    setIsSelectingMember(true);
  };

  const addMemberToSlot = (member: Member) => {
    if (activeSlotIndex === null) return;
    
    const newSlots = [...currentSlots];
    if (!newSlots[activeSlotIndex]) {
      newSlots[activeSlotIndex] = { members: [] };
    }
    
    if (newSlots[activeSlotIndex].members.some(m => m.id === member.id)) return;
    
    newSlots[activeSlotIndex].members.push(member);
    setCurrentSlots(newSlots);
    setIsSelectingMember(false);
    setActiveSlotIndex(null);
  };

  const removeMemberFromSlot = (slotIdx: number, memberIdx: number) => {
    const newSlots = [...currentSlots];
    newSlots[slotIdx].members.splice(memberIdx, 1);
    if (newSlots[slotIdx].members.length === 0) {
      newSlots.splice(slotIdx, 1);
    }
    setCurrentSlots(newSlots);
  };

  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const _currentSlots = [...currentSlots];
    const draggedItemContent = _currentSlots.splice(dragItem.current, 1)[0];
    _currentSlots.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setCurrentSlots(_currentSlots);
  };

  const getPublicUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return supabase.storage.from("games").getPublicUrl(path).data.publicUrl;
  };

  const filteredEntities = sectionEntities.filter(ent => {
    if (currentSlots.some(s => s.members.some(m => m.id === ent.id))) return false;
    if (!entitySearchTerm) return true;
    const name = getTranslatedField(ent.name, currentLang, gameDefaultLang).toLowerCase();
    return name.includes(entitySearchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8 mt-12 pt-12 border-t border-zinc-200/20 dark:border-white/5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase tracking-widest italic flex items-center gap-4">
          <span className="w-8 h-1 bg-green-500" />
          Recommended Teams
        </h2>
        {isAdmin && (
          <button 
            onClick={handleAddTeam}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 transition"
          >
            <Plus size={18} />
            Create Team
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-12">
        {processedTeams.map(team => (
          <div key={team.id} className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] p-10 relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500/50" />
            
            {isAdmin && (
              <button 
                onClick={() => handleDeleteTeam(team.id)}
                className="absolute top-8 right-8 text-zinc-600 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={24} />
              </button>
            )}

            <h3 className="text-2xl font-black uppercase italic text-white mb-10 tracking-widest border-b border-zinc-800/50 pb-4 inline-block">
              {getTranslatedField(team.name, currentLang, gameDefaultLang) || "Unnamed Team"}
            </h3>

            <div className="flex flex-nowrap items-start gap-10 overflow-x-auto pb-4 pt-32 scrollbar-hide">
              {team.slots.map((slot, sIdx) => {
                const selfIdx = slot.members.findIndex(m => m.id === currentEntityId);
                // Each item is 5rem (h-20) + 1rem (gap-4) = 6rem
                const verticalOffset = selfIdx > 0 ? `-${selfIdx * 6}rem` : '0';

                return (
                  <div key={sIdx} className="flex items-start gap-10">
                    {sIdx > 0 && <ChevronRight className="text-zinc-800 mt-6" size={28} />}
                    
                    {/* Vertical Slot Stack */}
                    <div 
                      className="flex flex-col gap-4 min-w-[80px] transition-transform duration-500 ease-out"
                      style={{ transform: `translateY(${verticalOffset})` }}
                    >
                      {slot.members.map((member, mIdx) => {
                        const isSelf = member.id === currentEntityId;
                        const isBest = mIdx === 0;
                        const hasSelfInSlot = selfIdx !== -1;
                        
                        // Only show 'Best' as prominent if the current character isn't already in this slot
                        const isProminent = isSelf || (isBest && !hasSelfInSlot);

                        const memberContent = (
                          <div 
                            className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 bg-zinc-900 group/member transition-all shadow-xl
                              ${isProminent 
                                ? (isSelf ? 'border-green-500 ring-4 ring-green-500/20 z-10' : 'border-zinc-600') + ' scale-100 opacity-100 hover:scale-110' 
                                : 'border-zinc-800 opacity-40 scale-75 hover:opacity-100 hover:scale-90'}`}
                          >
                            {getPublicUrl(member.icon_path) ? (
                              <img src={getPublicUrl(member.icon_path)!} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[8px] font-bold uppercase p-2 text-center" style={{ backgroundColor: member.color || 'transparent' }}>
                                {member.name}
                              </div>
                            )}
                          
                          {slot.members.length > 1 && (
                            isBest ? (
                              <div className="absolute top-0 right-0 bg-zinc-800 text-zinc-400 text-[6px] font-black px-1 py-0.5 rounded-bl uppercase">Best</div>
                            ) : (
                              <div className="absolute top-0 right-0 bg-zinc-950/80 text-zinc-600 text-[6px] font-black px-1 py-0.5 rounded-bl uppercase">Alt</div>
                            )
                          )}

                          <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover/member:opacity-100 transition-opacity">
                            <span className="text-[10px] font-black uppercase px-2 text-center text-white leading-tight">{member.name}</span>
                          </div>
                        </div>
                      );

                      if (member.type === 'entity' && !isSelf) {
                        return (
                          <Link key={mIdx} href={`/${gameSlug}/sections/${sectionId}/entities/${member.id}`} className="block">
                            {memberContent}
                          </Link>
                        );
                      }

                      return <div key={mIdx}>{memberContent}</div>;
                    })}
                  </div>
                </div>
              );
            })}

            {Array.from({ length: Math.max(0, maxTeamSize - team.slots.length) }).map((_, i) => (
                <div key={i} className="flex items-start gap-10">
                  <ChevronRight className="text-zinc-800 mt-6" size={28} />
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-zinc-800 flex items-center justify-center text-zinc-800">
                    <Users size={24} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isAddingTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-2xl font-black uppercase italic text-white tracking-widest">Team Architect</h3>
              <button onClick={() => setIsAddingTeam(false)} className="bg-zinc-800 p-2 rounded-full text-zinc-500 hover:text-white transition"><X /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-12">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Composition Codename</label>
                <input 
                  type="text" 
                  value={newTeamName} 
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. ULTIMATE FREEZE TEAM"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-8 py-5 text-white font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-xl"
                />
              </div>

              <div className="space-y-8">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Team Matrix (Horizontal Slots / Vertical Alternatives)</label>
                <div className="flex flex-nowrap items-start gap-12 overflow-x-auto pb-8 min-h-[400px]">
                  {Array.from({ length: maxTeamSize }).map((_, sIdx) => (
                    <div 
                      key={sIdx} 
                      className="flex items-start gap-12"
                      draggable={!!currentSlots[sIdx]}
                      onDragStart={() => (dragItem.current = sIdx)}
                      onDragEnter={() => (dragOverItem.current = sIdx)}
                      onDragEnd={handleSort}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {sIdx > 0 && <ChevronRight className="text-zinc-800 mt-10" size={32} />}
                      
                      <div className={`flex flex-col items-center gap-6 p-6 rounded-[2.5rem] border-2 transition-all ${dragItem.current === sIdx ? 'bg-green-500/10 border-green-500/50' : 'border-transparent bg-zinc-950/30'}`}>
                        {/* Vertical Stack in Configurator */}
                        <div className="flex flex-col gap-4">
                          {currentSlots[sIdx]?.members.map((member, mIdx) => (
                            <div key={mIdx} className="relative group">
                              <div className={`w-24 h-24 rounded-[2rem] overflow-hidden border-2 bg-zinc-950 transition-all shadow-2xl ${mIdx === 0 ? 'border-zinc-600' : 'border-zinc-800 scale-90 opacity-70'}`}>
                                {getPublicUrl(member.icon_path) ? (
                                  <img src={getPublicUrl(member.icon_path)!} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[9px] font-bold uppercase p-3 text-center" style={{ backgroundColor: member.color || 'transparent' }}>
                                    {member.name}
                                  </div>
                                )}
                                <button 
                                  onClick={() => removeMemberFromSlot(sIdx, mIdx)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-xl z-20"
                                >
                                  <X size={14} />
                                </button>
                                {mIdx === 0 && <div className="absolute top-0 left-0 bg-zinc-800 text-[6px] font-black px-1 py-0.5 rounded-br text-zinc-400">BEST</div>}
                              </div>
                            </div>
                          ))}
                          
                          <button 
                            onClick={() => openSelection(sIdx)}
                            className="w-24 h-24 rounded-[2rem] border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-700 hover:text-green-500 hover:border-green-500/50 hover:bg-green-500/5 transition-all group active:scale-95 shadow-inner"
                          >
                            <Plus size={32} />
                            <span className="text-[8px] font-black uppercase tracking-tighter mt-1">{currentSlots[sIdx] ? 'Add Alternative' : 'Add Slot'}</span>
                          </button>
                        </div>

                        {currentSlots[sIdx] && (
                          <div className="flex items-center gap-2 text-zinc-600 cursor-grab active:cursor-grabbing hover:text-zinc-400 transition-colors">
                            <GripVertical size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Reorder</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-zinc-800 bg-zinc-950/50">
              <button 
                onClick={() => handleSaveTeam(null)}
                className="w-full bg-green-500 text-black font-black uppercase tracking-[0.3em] py-6 rounded-3xl hover:bg-green-400 transition-all shadow-[0_15px_50px_rgba(34,197,94,0.25)] active:scale-[0.98] text-lg"
              >
                DEPLOY RECOMMENDED ARCHITECTURE
              </button>
            </div>
          </div>

          {isSelectingMember && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl">
              <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-zinc-800 flex flex-col gap-6 bg-zinc-900/50">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xl font-black uppercase italic text-zinc-400 tracking-widest">Select Team Element</h4>
                    <button onClick={() => setIsSelectingMember(false)} className="text-zinc-600 hover:text-white"><X /></button>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setSelectionType('entity')}
                      className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all ${selectionType === 'entity' ? 'bg-green-500 text-black shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
                    >
                      Specific Entity
                    </button>
                    <button 
                      onClick={() => setSelectionType('option')}
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
                          onChange={(e) => setEntitySearchTerm(e.target.value)}
                          placeholder="SEARCH DATABASE..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-[1.5rem] pl-16 pr-8 py-5 text-sm text-white font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all shadow-inner"
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 gap-6">
                        {filteredEntities.map(ent => (
                          <button 
                            key={ent.id} 
                            onClick={() => {
                              addMemberToSlot({ type: 'entity', id: ent.id, name: getTranslatedField(ent.name, currentLang, gameDefaultLang), icon_path: ent.icon_path });
                              setEntitySearchTerm("");
                            }}
                            className="flex flex-col items-center gap-3 group"
                          >
                            <div className="w-full aspect-square rounded-[2rem] overflow-hidden border-2 border-zinc-800 group-hover:border-green-500 transition-all group-hover:scale-105 shadow-xl bg-zinc-950">
                              {getPublicUrl(ent.icon_path) ? (
                                <img src={getPublicUrl(ent.icon_path)!} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[8px] font-black uppercase text-zinc-600 p-2 text-center">{getTranslatedField(ent.name, currentLang, gameDefaultLang)}</div>
                              )}
                            </div>
                            <span className="text-[10px] font-black text-zinc-500 uppercase text-center truncate w-full group-hover:text-green-400 transition-colors tracking-tight">
                              {getTranslatedField(ent.name, currentLang, gameDefaultLang)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectionType === 'option' && (
                    <div className="grid grid-cols-1 gap-4">
                      {fieldOptions.map(opt => (
                        <button 
                          key={opt.id} 
                          onClick={() => addMemberToSlot({ type: 'option', id: opt.id, name: getTranslatedField(opt.value_key, currentLang, gameDefaultLang), icon_path: opt.icon_path, color: opt.color })}
                          className="w-full flex items-center gap-6 p-6 rounded-[2rem] bg-zinc-950 border border-zinc-800 hover:border-green-500 transition-all text-left group"
                        >
                          {getPublicUrl(opt.icon_path) ? (
                            <img src={getPublicUrl(opt.icon_path)!} className="w-14 h-14 object-contain" />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl shadow-inner border border-zinc-800" style={{ backgroundColor: opt.color || '#111' }} />
                          )}
                          <div className="flex-1">
                            <div className="text-lg font-black text-white uppercase italic tracking-widest group-hover:text-green-400 transition-colors">{getTranslatedField(opt.value_key, currentLang, gameDefaultLang)}</div>
                            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mt-1">{opt.field_name}</div>
                          </div>
                          <ChevronRight className="text-zinc-800 group-hover:text-green-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
