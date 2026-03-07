"use client";

import { useState, useRef, useMemo } from "react";
import { getTranslatedField } from "@/lib/localization";
import { Member, Slot, TeamEntity } from "./types";

interface UseTeamBuilderProps {
  sectionEntities: TeamEntity[];
  currentLang: string;
  gameDefaultLang: string;
  currentEntityId?: string | null;
}

export function useTeamBuilder({
  sectionEntities,
  currentLang,
  gameDefaultLang,
  currentEntityId,
}: UseTeamBuilderProps) {
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [currentSlots, setCurrentSlots] = useState<Slot[]>([]);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [isSelectingMember, setIsSelectingMember] = useState(false);
  const [selectionType, setSelectionType] = useState<'entity' | 'option' | null>(null);
  const [entitySearchTerm, setEntitySearchTerm] = useState("");
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const dragItemRef = useRef<number | null>(null);
  const dragOverItemRef = useRef<number | null>(null);

  const handleStartAddTeam = () => {
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

  const openSelection = (slotIndex: number) => {
    setActiveSlotIndex(slotIndex);
    setIsSelectingMember(true);
    if (!selectionType) setSelectionType('entity');
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
    if (dragItemRef.current === null || dragOverItemRef.current === null) return;
    const _currentSlots = [...currentSlots];
    const draggedItemContent = _currentSlots.splice(dragItemRef.current, 1)[0];
    _currentSlots.splice(dragOverItemRef.current, 0, draggedItemContent);
    dragItemRef.current = null;
    dragOverItemRef.current = null;
    setDraggingIndex(null);
    setCurrentSlots(_currentSlots);
  };

  const filteredEntities = useMemo(() => {
    return sectionEntities.filter(ent => {
      if (currentSlots.some(s => s.members.some(m => m.id === ent.id))) return false;
      if (!entitySearchTerm) return true;
      const name = getTranslatedField(ent.name, currentLang, gameDefaultLang).toLowerCase();
      return name.includes(entitySearchTerm.toLowerCase());
    });
  }, [sectionEntities, currentSlots, entitySearchTerm, currentLang, gameDefaultLang]);

  return {
    isAddingTeam,
    setIsAddingTeam,
    newTeamName,
    setNewTeamName,
    currentSlots,
    setCurrentSlots,
    activeSlotIndex,
    isSelectingMember,
    setIsSelectingMember,
    selectionType,
    setSelectionType,
    entitySearchTerm,
    setEntitySearchTerm,
    draggingIndex,
    setDraggingIndex,
    dragItemRef,
    dragOverItemRef,
    handleStartAddTeam,
    openSelection,
    addMemberToSlot,
    removeMemberFromSlot,
    handleSort,
    filteredEntities,
  };
}
