import { LocalizedString } from "@/lib/types";

export interface TeamMember {
  id: string;
  member_type: 'entity' | 'option';
  entity_id: string | null;
  option_id: string | null;
  slot_index: number;
  order_index: number;
}

export interface TeamData {
  id: string;
  name: LocalizedString;
  section_id: string;
  section_team_members: TeamMember[];
}

export interface TeamEntity {
  id: string;
  name: LocalizedString;
  icon_path: string | null;
}

export interface TeamFieldOption {
  id: string;
  value_key: LocalizedString;
  icon_path: string | null;
  color: string | null;
  field_name?: string;
}

export type Member = { 
  type: 'entity' | 'option'; 
  id: string; 
  name: string; 
  icon_path: string | null; 
  color?: string | null 
};

export type Slot = { 
  members: Member[] 
};

export type Team = { 
  id: string; 
  name: LocalizedString; 
  slots: Slot[] 
};
