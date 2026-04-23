"use client";

import { useState, useRef, useMemo, useCallback } from "react";
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
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
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
    setEditingTeamId(null);
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
    // eslint-disable-next-line security/detect-object-injection
    if (!newSlots[activeSlotIndex]) {
      // eslint-disable-next-line security/detect-object-injection
      newSlots[activeSlotIndex] = { members: [] };
    }
    
    // eslint-disable-next-line security/detect-object-injection
    if (newSlots[activeSlotIndex].members.some(m => m.id === member.id)) return;
    
    // eslint-disable-next-line security/detect-object-injection
    newSlots[activeSlotIndex].members.push(member);
    setCurrentSlots(newSlots);
    setIsSelectingMember(false);
    setActiveSlotIndex(null);
  };

  const removeMemberFromSlot = (slotIdx: number, memberIdx: number) => {
    const newSlots = [...currentSlots];
    // eslint-disable-next-line security/detect-object-injection
    newSlots[slotIdx].members.splice(memberIdx, 1);
    // eslint-disable-next-line security/detect-object-injection
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

  const isMemberInAnySlot = useCallback((entId: string) => {
    return currentSlots.some(s => s.members.some(m => m.id === entId));
  }, [currentSlots]);

  const filteredEntities = useMemo(() => {
    return sectionEntities.filter(ent => {
      if (isMemberInAnySlot(ent.id)) return false;
      if (!entitySearchTerm) return true;
      const name = getTranslatedField(ent.name, currentLang, gameDefaultLang).toLowerCase();
      return name.includes(entitySearchTerm.toLowerCase());
    });
  }, [sectionEntities, isMemberInAnySlot, entitySearchTerm, currentLang, gameDefaultLang]);

  return {
    isAddingTeam,
    setIsAddingTeam,
    editingTeamId,
    setEditingTeamId,
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
