"use client";

import Image from "next/image";
import { Trash2, GripVertical } from "lucide-react";
import { getPublicUrl } from "@/lib/supabase/client";
import { getTranslatedField } from "@/lib/localization";
import { Team } from "./types";

interface TeamCardProps {
  team: Team;
  currentLang: string;
  gameDefaultLang: string;
  isAdmin?: boolean;
  onEdit: (team: Team) => void;
  onDelete: (id: string) => void;
}

export function TeamCard({
  team,
  currentLang,
  gameDefaultLang,
  isAdmin,
  onEdit,
  onDelete,
}: TeamCardProps) {
  return (
    <div className="group relative bg-zinc-950/40 border border-zinc-800/50 rounded-[2.5rem] p-10 hover:border-green-500/30 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-start mb-8">
        <h4 className="text-xl font-black italic uppercase tracking-widest text-zinc-500 group-hover:text-green-400 transition-colors">
          {getTranslatedField(team.name, currentLang, gameDefaultLang)}
        </h4>
        {isAdmin && (
          <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(team)} className="bg-zinc-800 p-3 rounded-2xl hover:bg-green-500 hover:text-black transition-all">
              <GripVertical size={18} />
            </button>
            <button onClick={() => onDelete(team.id)} className="bg-zinc-800 p-3 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-8 items-center justify-center lg:justify-start">
        {team.slots.map((slot, sIdx) => (
          <div key={sIdx} className="flex items-center gap-8">
            <div className="relative">
              {slot.members.map((member, mIdx) => {
                const iconUrl = getPublicUrl('games', member.icon_path);
                return (
                  <div
                    key={mIdx}
                    className={`
                      w-20 h-20 rounded-2xl border-2 transition-all shadow-2xl overflow-hidden bg-zinc-950
                      ${mIdx === 0 ? 'relative z-10 border-zinc-600' : 'absolute -bottom-2 -right-2 scale-90 opacity-40 grayscale border-zinc-800 z-0'}
                    `}
                  >
                    {iconUrl ? (
                      <Image src={iconUrl} alt={member.name} fill sizes="80px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] font-black uppercase text-center p-2" style={{ backgroundColor: member.color || 'transparent' }}>
                        {member.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {sIdx < team.slots.length - 1 && <div className="w-1 h-1 bg-zinc-800 rounded-full" />}
          </div>
        ))}
      </div>
    </div>
  );
}
