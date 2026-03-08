"use client";

import { useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, ChevronRight, Users } from "lucide-react";
import { getTranslatedField, useLocalizationParams } from "@/lib/localization";
import { upsertTeamAction, deleteTeamAction } from "@/lib/actions/team";
import { getPublicUrl } from "@/lib/supabase/client";
import { TeamData, TeamEntity, TeamFieldOption, Team, Member, Slot } from "./teambuilder/types";
import { TeamCard } from "./teambuilder/TeamCard";
import { TeamEditorModal } from "./teambuilder/TeamEditorModal";
import { MemberSelectionModal } from "./teambuilder/MemberSelectionModal";
import { useTeamBuilder } from "./teambuilder/useTeamBuilder";

/**
 * Maps database team members to internal Slot structure.
 */
function mapMembersToSlots(team: TeamData, sectionEntities: TeamEntity[], fieldOptions: TeamFieldOption[], currentLang: string, gameDefaultLang: string): Slot[] {
  const slotMap: Record<number, Member[]> = {};
  const members = [...(team.section_team_members || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  
  members.forEach((m) => {
    const sIdx = m.slot_index ?? 0;
    // eslint-disable-next-line security/detect-object-injection
    if (!slotMap[sIdx]) slotMap[sIdx] = [];
    
    if (m.member_type === 'entity' && m.entity_id) {
      const ent = sectionEntities.find(e => e.id === m.entity_id);
      // eslint-disable-next-line security/detect-object-injection
      slotMap[sIdx].push({ type: 'entity', id: m.entity_id, name: getTranslatedField(ent?.name || {}, currentLang, gameDefaultLang), icon_path: ent?.icon_path || null });
    } else if (m.member_type === 'option' && m.option_id) {
      const opt = fieldOptions.find(o => o.id === m.option_id);
      // eslint-disable-next-line security/detect-object-injection
      slotMap[sIdx].push({ type: 'option', id: m.option_id, name: getTranslatedField(opt?.value_key || {}, currentLang, gameDefaultLang), icon_path: opt?.icon_path || null, color: opt?.color });
    }
  });

  return Object.keys(slotMap).map(Number).sort((a, b) => a - b).map(idx => ({ 
    // eslint-disable-next-line security/detect-object-injection
    members: slotMap[idx] 
  }));
}

export default function TeamBuilder({
  sectionId, gameSlug, sectionEntities, fieldOptions, maxTeamSize, existingTeams, gameDefaultLang, isAdmin = false, currentEntityId = null,
}: {
  sectionId: string; gameSlug: string; sectionEntities: TeamEntity[]; fieldOptions: TeamFieldOption[]; maxTeamSize: number; existingTeams: TeamData[]; gameDefaultLang: string; isAdmin?: boolean; currentEntityId?: string | null;
}) {
  const { currentLang } = useLocalizationParams();

  const processedTeams: Team[] = useMemo(() => existingTeams.map(t => ({
    id: t.id, name: t.name, slots: mapMembersToSlots(t, sectionEntities, fieldOptions, currentLang, gameDefaultLang)
  })), [existingTeams, sectionEntities, fieldOptions, currentLang, gameDefaultLang]);

  const {
    isAddingTeam, setIsAddingTeam, newTeamName, setNewTeamName, currentSlots, draggingIndex, setDraggingIndex, dragItemRef, dragOverItemRef, isSelectingMember, setIsSelectingMember, selectionType, setSelectionType, entitySearchTerm, setEntitySearchTerm, handleStartAddTeam, openSelection, addMemberToSlot, removeMemberFromSlot, handleSort, filteredEntities,
  } = useTeamBuilder({ sectionEntities, currentLang, gameDefaultLang, currentEntityId });

  const handleSaveTeam = async () => {
    const res = await upsertTeamAction(sectionId, null, newTeamName, currentSlots);
    if (res.success) window.location.reload(); else alert(res.error);
  };

  const handleDeleteTeam = async (id: string) => {
    if (confirm("Are you sure you want to delete this team?")) {
      const res = await deleteTeamAction(id);
      if (res.success) window.location.reload();
    }
  };

  const handleEditTeam = (team: Team) => {
    setNewTeamName(getTranslatedField(team.name, currentLang, gameDefaultLang));
    setIsAddingTeam(true);
  };

  const renderProminentMember = useCallback((member: Member, isSelf: boolean, isBest: boolean, hasSelfInSlot: boolean) => {
    const isProminent = isSelf || (isBest && !hasSelfInSlot);
    const iconUrl = getPublicUrl('games', member.icon_path);
    
    let borderClass = 'border-zinc-800 opacity-40 scale-75 hover:opacity-100 hover:scale-90';
    if (isProminent) {
      borderClass = isSelf ? 'border-green-500 ring-4 ring-green-500/20 z-10 scale-100 opacity-100 hover:scale-110' : 'border-zinc-600 scale-100 opacity-100 hover:scale-110';
    }

    const content = (
      <div className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 bg-zinc-900 group/member transition-all shadow-xl ${borderClass}`}>
        {iconUrl ? <Image src={iconUrl} alt={member.name} fill sizes="80px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold uppercase p-2 text-center" style={{ backgroundColor: member.color || 'transparent' }}>{member.name}</div>}
        <div className={`absolute top-0 right-0 ${isBest ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-950/80 text-zinc-600'} text-[6px] font-black px-1 py-0.5 rounded-bl uppercase`}>{isBest ? 'Best' : 'Alt'}</div>
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover/member:opacity-100 transition-opacity"><span className="text-[10px] font-black uppercase px-2 text-center text-white leading-tight">{member.name}</span></div>
      </div>
    );
    return (member.type === 'entity' && !isSelf) ? <Link href={`/${gameSlug}/sections/${sectionId}/entities/${member.id}`} className="block">{content}</Link> : content;
  }, [gameSlug, sectionId]);

  return (
    <div className="space-y-8 mt-12 pt-12 border-t border-zinc-200/20 dark:border-white/5">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-black uppercase tracking-widest italic flex items-center gap-4 text-black dark:text-zinc-50"><span className="w-8 h-1 bg-green-500" />Recommended Teams</h2>{isAdmin && <button onClick={handleStartAddTeam} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 transition"><Plus size={18} />Create Team</button>}</div>
      <div className="grid grid-cols-1 gap-12">
        {processedTeams.map(team => {
            if (currentEntityId === null) return <TeamCard key={team.id} team={team} currentLang={currentLang} gameDefaultLang={gameDefaultLang} isAdmin={isAdmin} onEdit={handleEditTeam} onDelete={handleDeleteTeam} />;
            return (
                <div key={team.id} className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] p-10 relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-green-500/50" />
                  {isAdmin && <button onClick={() => handleDeleteTeam(team.id)} className="absolute top-8 right-8 text-zinc-600 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2Icon size={24} /></button>}
                  <h3 className="text-2xl font-black uppercase italic text-white mb-10 tracking-widest border-b border-zinc-800/50 pb-4 inline-block">{getTranslatedField(team.name, currentLang, gameDefaultLang) || "Unnamed Team"}</h3>
                  <div className="flex flex-nowrap items-start gap-10 overflow-x-auto pb-4 pt-32 scrollbar-hide">
                    {team.slots.map((slot, sIdx) => {
                      const sId = slot.members.findIndex(m => m.id === currentEntityId);
                      const translateVal = sId > 0 ? `-${sId * 6}rem` : '0';
                      return (
                        <div key={sIdx} className="flex items-start gap-10">{sIdx > 0 && <ChevronRight className="text-zinc-800 mt-6" size={28} />}
                          <div className="flex flex-col gap-4 min-w-[80px] transition-transform duration-500 ease-out" style={{ transform: `translateY(${translateVal})` }}>
                            {slot.members.map((m, mIdx) => <div key={mIdx}>{renderProminentMember(m, m.id === currentEntityId, mIdx === 0, sId !== -1)}</div>)}
                          </div>
                        </div>
                      );
                    })}
                    {Array.from({ length: Math.max(0, maxTeamSize - team.slots.length) }).map((_, i) => <div key={i} className="flex items-start gap-10"><ChevronRight className="text-zinc-800 mt-6" size={28} /><div className="w-20 h-20 rounded-2xl border-2 border-dashed border-zinc-800 flex items-center justify-center text-zinc-800"><Users size={24} /></div></div>)}
                  </div>
                </div>
            );
        })}
      </div>
      <TeamEditorModal isOpen={isAddingTeam} onClose={() => setIsAddingTeam(false)} teamName={newTeamName} onTeamNameChange={setNewTeamName} maxTeamSize={maxTeamSize} currentSlots={currentSlots} draggingIndex={draggingIndex} onDragStart={(idx) => { dragItemRef.current = idx; setDraggingIndex(idx); }} onDragEnter={(idx) => { dragOverItemRef.current = idx; }} onDragEnd={handleSort} onRemoveMember={removeMemberFromSlot} onOpenSelection={openSelection} onSave={handleSaveTeam} />
      <MemberSelectionModal isOpen={isSelectingMember} onClose={() => setIsSelectingMember(false)} selectionType={selectionType} onSelectionTypeChange={setSelectionType} entitySearchTerm={entitySearchTerm} onSearchTermChange={setEntitySearchTerm} filteredEntities={filteredEntities} fieldOptions={fieldOptions} onSelectMember={addMemberToSlot} currentLang={currentLang} gameDefaultLang={gameDefaultLang} />
    </div>
  );
}

function Trash2Icon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" ><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
  );
}
