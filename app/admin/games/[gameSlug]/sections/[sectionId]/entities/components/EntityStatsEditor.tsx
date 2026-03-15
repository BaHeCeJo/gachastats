"use client";

import { useState, useMemo } from 'react';
import { getTranslatedField } from "@/lib/localization";
import { SectionStat, SectionAscension, EntityStatValue } from '@/lib/supabase/queries';

interface SectionData {
  has_stats?: boolean;
  has_ascension?: boolean;
  max_level?: number;
}

export default function EntityStatsEditor({
  section, sectionStats, sectionAscensions, entityStats, activeLang, gameDefaultLang, onChange
}: {
  section: SectionData;
  sectionStats: SectionStat[];
  sectionAscensions: SectionAscension[];
  entityStats: EntityStatValue[];
  activeLang: string;
  gameDefaultLang: string;
  onChange: (stats: { stat_id: string; level: number; phase_index: number; value: number }[]) => void;
}) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    entityStats.forEach(s => {
      initial[`${s.stat_id}::${s.level}::${s.phase_index}`] = s.value;
    });
    return initial;
  });

  const [showJsonMode, setShowJsonMode] = useState(false);
  const [jsonInput, setJsonInput] = useState('');

  const { scalableStats, staticStats } = useMemo(() => {
    return {
      scalableStats: sectionStats.filter(s => s.is_scalable !== false),
      staticStats: sectionStats.filter(s => s.is_scalable === false)
    };
  }, [sectionStats]);

  const boundariesToShow = useMemo(() => {
    if (section.has_ascension && sectionAscensions.length > 0) {
      const boundaries: { level: number; phase_index: number }[] = [];
      sectionAscensions.sort((a, b) => a.phase_index - b.phase_index).forEach(asc => {
        boundaries.push({ level: asc.min_level, phase_index: asc.phase_index });
        boundaries.push({ level: asc.max_level, phase_index: asc.phase_index });
      });
      return boundaries;
    }
    const max = section.max_level || 1;
    if (max === 1) return [{ level: 1, phase_index: 0 }];
    return [{ level: 1, phase_index: 0 }, { level: max, phase_index: 0 }];
  }, [section, sectionAscensions]);

  const phasesToShow = useMemo(() => {
    if (section.has_ascension && sectionAscensions.length > 0) {
      return sectionAscensions.sort((a, b) => a.phase_index - b.phase_index);
    }
    return [{ phase_index: 0, min_level: 1 }];
  }, [section, sectionAscensions]);

  const syncToParent = (currentValues: Record<string, number>) => {
    const statsArray = Object.entries(currentValues).map(([key, value]) => {
      const [sId, lvl, pIdx] = key.split('::');
      return { stat_id: sId, level: parseInt(lvl), phase_index: parseInt(pIdx), value };
    });
    onChange(statsArray);
  };

  const handleValueChange = (statId: string, level: number, phaseIndex: number, val: string) => {
    const num = parseFloat(val) || 0;
    const newValues = { ...values, [`${statId}::${level}::${phaseIndex}`]: num };
    setValues(newValues);
    syncToParent(newValues);
  };

  const fillAllPhases = (statId: string, value: number) => {
    const newValues = { ...values };
    phasesToShow.forEach(phase => {
      newValues[`${statId}::${phase.min_level}::${phase.phase_index}`] = value;
    });
    setValues(newValues);
    syncToParent(newValues);
  };

  const fillAllScalable = (statId: string, value: number) => {
    const newValues = { ...values };
    boundariesToShow.forEach(b => {
      newValues[`${statId}::${b.level}::${b.phase_index}`] = value;
    });
    setValues(newValues);
    syncToParent(newValues);
  };

  const handleGenerateJSON = () => {
    const statsArray = Object.entries(values).map(([key, value]) => {
      const [sId, lvl, pIdx] = key.split('::');
      return { stat_id: sId, level: parseInt(lvl), phase_index: parseInt(pIdx), value };
    });
    setJsonInput(JSON.stringify(statsArray, null, 2));
  };

  const handleApplyJSON = () => {
    try {
      const data = JSON.parse(jsonInput);
      if (!Array.isArray(data)) throw new Error("Stats must be an array");
      const newValues: Record<string, number> = {};
      (data as EntityStatValue[]).forEach((s) => {
        newValues[`${s.stat_id}::${s.level}::${s.phase_index}`] = s.value;
      });
      setValues(newValues);
      syncToParent(newValues);
      setShowJsonMode(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid JSON format for Stats array.";
      alert(msg);
    }
  };

  if (!section.has_stats || sectionStats.length === 0) return null;

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
        <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-200 flex items-center gap-3">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Entity Statistics
            </h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Manage growth curves and static attributes</p>
        </div>
        <button 
            type="button"
            onClick={() => setShowJsonMode(!showJsonMode)}
            className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border ${showJsonMode ? 'bg-blue-500 text-white border-blue-400' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'}`}
        >
            {showJsonMode ? 'Close JSON Editor' : 'Bulk Edit (JSON)'}
        </button>
      </div>

      {showJsonMode ? (
        <div className="bg-black border border-blue-500/30 rounded-3xl p-8 space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">Stats JSON Editor</h4>
                <button 
                    type="button"
                    onClick={handleGenerateJSON}
                    className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 rounded-lg transition-all"
                >
                    Generate Current Stats JSON
                </button>
            </div>
            <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste stats JSON array here..."
                className="w-full h-96 bg-zinc-950 border border-zinc-800 rounded-2xl p-6 font-mono text-xs text-blue-400 focus:outline-none focus:border-blue-500/30 transition-all"
            />
            <button 
                type="button"
                onClick={handleApplyJSON}
                className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
            >
                Apply JSON Changes to Tables
            </button>
        </div>
      ) : (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Scalable Stats Section */}
          {scalableStats.length > 0 && (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-green-500">Scalable Stats (Level-Dependent)</h3>
                {section.has_ascension && <span className="text-[10px] text-zinc-600 font-bold uppercase italic tracking-widest">Ascension Boundaries</span>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="p-2 text-xs font-bold text-zinc-500 uppercase tracking-widest w-32">Level / Phase</th>
                      {scalableStats.map(stat => (
                        <th key={stat.id} className="p-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                          <div className="flex flex-col gap-1">
                            <span>{getTranslatedField(stat.name, activeLang, gameDefaultLang)}</span>
                            <button 
                              type="button"
                              onClick={() => {
                                const firstVal = values[`${stat.id}::${boundariesToShow[0].level}::${boundariesToShow[0].phase_index}`] || 0;
                                fillAllScalable(stat.id, firstVal);
                              }}
                              className="text-[9px] text-zinc-600 hover:text-green-500 uppercase font-black tracking-tighter text-left transition-colors"
                            >
                              [Fill All]
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {boundariesToShow.map((boundary, idx) => (
                      <tr key={`${boundary.level}-${boundary.phase_index}-${idx}`} className="border-b border-zinc-800/50 hover:bg-white/[0.02] group">
                        <td className="p-2 text-white font-bold whitespace-nowrap">
                          <span className="text-zinc-400 text-[10px] mr-2">P{boundary.phase_index}</span>
                          Lv. {boundary.level}
                        </td>
                        {scalableStats.map(stat => (
                          <td key={stat.id} className="p-2">
                            <input 
                              type="number" 
                              step="any"
                              aria-label={`${getTranslatedField(stat.name, activeLang, gameDefaultLang)} Phase ${boundary.phase_index} Level ${boundary.level}`}
                              value={values[`${stat.id}::${boundary.level}::${boundary.phase_index}`] ?? ''} 
                              onChange={(e) => handleValueChange(stat.id, boundary.level, boundary.phase_index, e.target.value)}
                              className="w-24 bg-zinc-950 border border-zinc-800 rounded p-1 text-white text-sm focus:border-green-500 transition-colors group-hover:border-zinc-700"
                              placeholder="0"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Static Stats Section */}
          {staticStats.length > 0 && (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Static Stats (Level-Independent)</h3>
                <span className="text-[10px] text-zinc-600 font-bold uppercase italic tracking-widest">Changes only with Ascension</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="p-2 text-xs font-bold text-zinc-500 uppercase tracking-widest w-32">Phase</th>
                      {staticStats.map(stat => (
                        <th key={stat.id} className="p-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                          <div className="flex flex-col gap-1">
                            <span>{getTranslatedField(stat.name, activeLang, gameDefaultLang)}</span>
                            {section.has_ascension && (
                              <button 
                                type="button"
                                onClick={() => {
                                  const firstVal = values[`${stat.id}::${phasesToShow[0].min_level}::${phasesToShow[0].phase_index}`] || 0;
                                  fillAllPhases(stat.id, firstVal);
                                }}
                                className="text-[9px] text-zinc-600 hover:text-blue-400 uppercase font-black tracking-tighter text-left transition-colors"
                              >
                                [Copy P0 to All]
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {phasesToShow.map((phase) => (
                      <tr key={phase.phase_index} className="border-b border-zinc-800/50 hover:bg-white/[0.02] group">
                        <td className="p-2 text-white font-bold whitespace-nowrap">
                          <span className="text-zinc-400 text-[10px] mr-2">P{phase.phase_index}</span>
                          {section.has_ascension ? `Phase ${phase.phase_index}` : 'Base Value'}
                        </td>
                        {staticStats.map(stat => (
                          <td key={stat.id} className="p-2">
                            <input 
                              type="number" 
                              step="any"
                              aria-label={`${getTranslatedField(stat.name, activeLang, gameDefaultLang)} Phase ${phase.phase_index}`}
                              value={values[`${stat.id}::${phase.min_level}::${phase.phase_index}`] ?? ''} 
                              onChange={(e) => handleValueChange(stat.id, phase.min_level, phase.phase_index, e.target.value)}
                              className="w-24 bg-zinc-950 border border-zinc-800 rounded p-1 text-white text-sm focus:border-blue-500 transition-colors group-hover:border-zinc-700"
                              placeholder="0"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
