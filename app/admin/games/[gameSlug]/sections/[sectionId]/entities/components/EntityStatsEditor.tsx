"use client";

import { useState, useMemo, useRef } from 'react';
import { getTranslatedField } from "@/lib/localization";
import { SectionStat, SectionAscension, EntityStatValue } from '@/lib/supabase/queries';
import * as XLSX from 'xlsx';

type Boundary = { level: number; phase_index: number };

function getBaseBoundaries(section: { has_ascension?: boolean; max_level?: number }, sectionAscensions: SectionAscension[]): Boundary[] {
  const boundaries: Boundary[] = [];
  if (section.has_ascension && sectionAscensions.length > 0) {
    [...sectionAscensions].sort((a, b) => a.phase_index - b.phase_index).forEach(asc => {
      boundaries.push({ level: asc.min_level, phase_index: asc.phase_index });
      boundaries.push({ level: asc.max_level, phase_index: asc.phase_index });
    });
  } else {
    boundaries.push({ level: 1, phase_index: 0 });
    const max = section.max_level || 1;
    if (max > 1) boundaries.push({ level: max, phase_index: 0 });
  }
  return boundaries;
}

function getAllLevelBoundaries(section: { has_ascension?: boolean; max_level?: number }, sectionAscensions: SectionAscension[], existing: Boundary[]): Boundary[] {
  const additions: Boundary[] = [];
  if (section.has_ascension && sectionAscensions.length > 0) {
    sectionAscensions.forEach(asc => {
      for (let l = asc.min_level; l <= asc.max_level; l++) {
        if (!existing.some(b => b.level === l && b.phase_index === asc.phase_index)) {
          additions.push({ level: l, phase_index: asc.phase_index });
        }
      }
    });
  } else {
    const max = section.max_level || 1;
    for (let l = 1; l <= max; l++) {
      if (!existing.some(b => b.level === l && b.phase_index === 0)) {
        additions.push({ level: l, phase_index: 0 });
      }
    }
  }
  return additions;
}

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
  const [values, setValues] = useState<Record<string, string | number>>(() => {
    const initial: Record<string, string | number> = {};
    entityStats.forEach(s => {
      initial[`${s.stat_id}::${s.level}::${s.phase_index}`] = s.value;
    });
    return initial;
  });

  const [showAllLevels, setShowAllLevels] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { scalableStats, staticStats } = useMemo(() => {
    return {
      scalableStats: sectionStats.filter(s => s.is_scalable !== false),
      staticStats: sectionStats.filter(s => s.is_scalable === false)
    };
  }, [sectionStats]);

  const boundariesToShow = useMemo(() => {
    const boundaries: Boundary[] = getBaseBoundaries(section, sectionAscensions);

    // Show all levels if requested
    if (showAllLevels) {
      boundaries.push(...getAllLevelBoundaries(section, sectionAscensions, boundaries));
    }

    // Add any additional levels that currently have data
    const existingLevels = new Set(Object.keys(values).map(key => {
      const [, lvl, pIdx] = key.split('::');
      return `${lvl}::${pIdx}`;
    }));

    existingLevels.forEach(combined => {
      const [lvl, pIdx] = combined.split('::');
      const level = parseInt(lvl);
      const phase_index = parseInt(pIdx);
      if (!boundaries.find(b => b.level === level && b.phase_index === phase_index)) {
        boundaries.push({ level, phase_index });
      }
    });

    return boundaries.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.phase_index - b.phase_index;
    });
  }, [section, sectionAscensions, values, showAllLevels]);

  const phasesToShow = useMemo(() => {
    if (section.has_ascension && sectionAscensions.length > 0) {
      return [...sectionAscensions].sort((a, b) => a.phase_index - b.phase_index);
    }
    return [{ phase_index: 0, min_level: 1, max_level: section.max_level || 1 }];
  }, [section, sectionAscensions]);

  const [newLevelInput, setNewLevelInput] = useState('');
  const [newLevelPhase, setNewLevelPhase] = useState(0);

  const [showPlainTextMode, setShowPlainTextMode] = useState(false);
  const [plainTextInput, setPlainTextInput] = useState('');

  const handleAddLevel = () => {
    const lvl = parseInt(newLevelInput);
    if (isNaN(lvl) || lvl < 1) return;
    
    const newValues = { ...values };
    scalableStats.forEach(stat => {
      const key = `${stat.id}::${lvl}::${newLevelPhase}`;
      // eslint-disable-next-line security/detect-object-injection
      if (newValues[key] === undefined) {
        // eslint-disable-next-line security/detect-object-injection
        newValues[key] = 0;
      }
    });
    setValues(newValues);
    syncToParent(newValues);
    setNewLevelInput('');
  };

  const handleRemoveLevel = (level: number, phaseIndex: number) => {
    const newValues = { ...values };
    scalableStats.forEach(stat => {
      delete newValues[`${stat.id}::${level}::${phaseIndex}`];
    });
    setValues(newValues);
    syncToParent(newValues);
  };

  const handleExportExcel = () => {
    const rows: (string | number)[][] = [];

    // Header Row
    const headers: string[] = ['Level', 'Phase'];
    scalableStats.forEach(s => {
      headers.push(getTranslatedField(s.name, activeLang, gameDefaultLang));
    });
    staticStats.forEach(s => {
      headers.push(getTranslatedField(s.name, activeLang, gameDefaultLang) + " (Static)");
    });
    rows.push(headers);

    // Data Rows
    boundariesToShow.forEach(b => {
      const phase = phasesToShow.find(p => p.phase_index === b.phase_index);
      const row: (string | number)[] = [b.level, b.phase_index];
      // Scalable
      scalableStats.forEach(s => {
        row.push(Number(values[`${s.id}::${b.level}::${b.phase_index}`]) || 0);
      });
      // Static (using min_level of the phase)
      staticStats.forEach(s => {
        const minLvl = phase?.min_level || 1;
        row.push(Number(values[`${s.id}::${minLvl}::${b.phase_index}`]) || 0);
      });
      rows.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Entity Stats");
    
    XLSX.writeFile(workbook, `entity_stats_export.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const worksheetName = workbook.SheetNames[0];
      // eslint-disable-next-line security/detect-object-injection
      const worksheet = workbook.Sheets[worksheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

      if (data.length < 2) return;

      const newValues = { ...values };
      const [headers, ...dataRows] = data;

      // Map column index → stat ID
      const scalableColMap = new Map<number, string>();
      const staticColMap = new Map<number, string>();

      const scalableByName = new Map(scalableStats.map(s => [getTranslatedField(s.name, activeLang, gameDefaultLang), s]));
      const staticByName = new Map(staticStats.map(s => [getTranslatedField(s.name, activeLang, gameDefaultLang), s]));

      headers.forEach((header, idx) => {
        if (idx < 2) return; // Level and Phase

        const cleanHeader = typeof header === 'string' ? header.replace(" (Static)", "") : String(header);

        const sStat = scalableByName.get(cleanHeader);
        if (sStat) { scalableColMap.set(idx, sStat.id); return; }

        const stStat = staticByName.get(cleanHeader);
        if (stStat) { staticColMap.set(idx, stStat.id); }
      });

      // Parse rows
      for (const row of dataRows) {
        const [levelCell, phaseCell] = row;
        const level = parseInt(String(levelCell));
        const phaseIndex = parseInt(String(phaseCell));

        if (isNaN(level)) continue;

        // Scalable Stats
        scalableColMap.forEach((statId, colIdx) => {
          // eslint-disable-next-line security/detect-object-injection
          const val = parseFloat(String(row[colIdx]).replace(',', '.'));
          if (!isNaN(val)) {
            newValues[`${statId}::${level}::${phaseIndex}`] = val;
          }
        });

        // Static Stats
        const matchingPhase = phasesToShow.find(p => p.phase_index === phaseIndex);
        staticColMap.forEach((statId, colIdx) => {
          // eslint-disable-next-line security/detect-object-injection
          const val = parseFloat(String(row[colIdx]).replace(',', '.'));
          if (!isNaN(val) && matchingPhase) {
            newValues[`${statId}::${matchingPhase.min_level}::${phaseIndex}`] = val;
          }
        });
      }

      setValues(newValues);
      syncToParent(newValues);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleApplyPlainText = () => {
    const lines = plainTextInput.split('\n').filter(l => l.trim());
    const newValues = { ...values };

    lines.forEach(line => {
      // Clean the line: remove commas, treat space as separator
      const cleanLine = line.replace(/,/g, '');
      const parts = cleanLine.split(/\s+/).filter(p => p.trim());
      
      if (parts.length < 2) return;

      const level = parseInt(parts[0]);
      if (isNaN(level)) return;

      // Determine phase_index for this level
      let phaseIndex = 0;
      if (section.has_ascension && sectionAscensions.length > 0) {
        const matchingPhase = sectionAscensions.find(a => level >= a.min_level && level <= a.max_level);
        if (matchingPhase) phaseIndex = matchingPhase.phase_index;
      }

      // Map subsequent parts to scalable stats
      scalableStats.forEach((stat, idx) => {
        const valPart = parts[idx + 1];
        if (valPart !== undefined) {
          // Parse float, handling percentages
          let val = parseFloat(valPart.replace('%', ''));
          if (isNaN(val)) val = 0;
          newValues[`${stat.id}::${level}::${phaseIndex}`] = val;
        }
      });
    });

    setValues(newValues);
    syncToParent(newValues);
    setPlainTextInput('');
    setShowPlainTextMode(false);
  };

  const syncToParent = (currentValues: Record<string, string | number>) => {
    const statsArray = Object.entries(currentValues).map(([key, value]) => {
      const [sId, lvl, pIdx] = key.split('::');
      let numVal = 0;
      if (typeof value === 'string') {
        numVal = parseFloat(value.replace(',', '.')) || 0;
      } else {
        numVal = value;
      }
      return { stat_id: sId, level: parseInt(lvl), phase_index: parseInt(pIdx), value: numVal };
    });
    onChange(statsArray);
  };

  const handleValueChange = (statId: string, level: number, phaseIndex: number, val: string) => {
    const newValues = { ...values, [`${statId}::${level}::${phaseIndex}`]: val };
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
        <div className="flex items-center gap-3">
            <button 
                type="button"
                onClick={() => { setShowPlainTextMode(!showPlainTextMode); }}
                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border ${showPlainTextMode ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'}`}
            >
                {showPlainTextMode ? 'Close Plain Text Editor' : 'Import (Text)'}
            </button>
            <div className="flex gap-2">
                <button 
                    type="button"
                    onClick={handleExportExcel}
                    className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-green-950/30 text-green-500 border border-green-900/50 hover:bg-green-950/50 rounded-xl transition-all"
                >
                    Export (Excel)
                </button>
                <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-blue-950/30 text-blue-500 border border-blue-900/50 hover:bg-blue-950/50 rounded-xl transition-all"
                >
                    Import (Excel)
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleImportExcel}
                />
            </div>
        </div>
      </div>

      {showPlainTextMode && (
        <div className="bg-black border border-green-500/30 rounded-3xl p-8 space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-green-400 uppercase tracking-widest">Plain Text Stats Importer</h4>
                <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">
                    Format: Level Stat1 Stat2 Stat3... (Space separated)
                </div>
            </div>
            <textarea
                value={plainTextInput}
                onChange={(e) => setPlainTextInput(e.target.value)}
                placeholder="Paste multi-line text here (e.g. 80 1200 600 101...)"
                className="w-full h-96 bg-zinc-950 border border-zinc-800 rounded-2xl p-6 font-mono text-xs text-green-400 focus:outline-none focus:border-green-500/30 transition-all"
            />
            <button 
                type="button"
                onClick={handleApplyPlainText}
                className="w-full py-4 bg-green-600 text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-green-500 transition-all shadow-lg shadow-green-600/20"
            >
                Import from Plain Text
            </button>
        </div>
      )}

      {!showPlainTextMode && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Scalable Stats Section */}
          {scalableStats.length > 0 && (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-green-500">Scalable Stats (Level-Dependent)</h3>
                <div className="flex items-center gap-4">
                    {!section.has_ascension && (
                        <button
                            type="button"
                            onClick={() => setShowAllLevels(!showAllLevels)}
                            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded border transition-all ${showAllLevels ? 'bg-green-600/20 text-green-500 border-green-500/50' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'}`}
                        >
                            {showAllLevels ? 'Showing All Levels' : 'Show All Levels'}
                        </button>
                    )}
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            value={newLevelInput}
                            onChange={e => setNewLevelInput(e.target.value)}
                            placeholder="Level"
                            className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[10px] text-white focus:border-green-500 outline-none"
                        />
                        {section.has_ascension && (
                            <select 
                                value={newLevelPhase}
                                onChange={e => setNewLevelPhase(parseInt(e.target.value))}
                                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[10px] text-white focus:border-green-500 outline-none"
                            >
                                {sectionAscensions.map(a => (
                                    <option key={a.phase_index} value={a.phase_index}>P{a.phase_index}</option>
                                ))}
                            </select>
                        )}
                        <button 
                            type="button"
                            onClick={handleAddLevel}
                            className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-green-600 text-black rounded hover:bg-green-500 transition-all"
                        >
                            Add Level
                        </button>
                    </div>
                </div>
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
                                const firstVal = parseFloat(String(values[`${stat.id}::${boundariesToShow[0].level}::${boundariesToShow[0].phase_index}`] || 0));
                                fillAllScalable(stat.id, firstVal);
                              }}
                              className="text-[9px] text-zinc-600 hover:text-green-500 uppercase font-black tracking-tighter text-left transition-colors"
                            >
                              [Fill All]
                            </button>
                          </div>
                        </th>
                      ))}
                      <th className="w-10"></th>
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
                              type="text" 
                              aria-label={`${getTranslatedField(stat.name, activeLang, gameDefaultLang)} Phase ${boundary.phase_index} Level ${boundary.level}`}
                              value={values[`${stat.id}::${boundary.level}::${boundary.phase_index}`] ?? ''} 
                              onChange={(e) => handleValueChange(stat.id, boundary.level, boundary.phase_index, e.target.value)}
                              className="w-24 bg-zinc-950 border border-zinc-800 rounded p-1 text-white text-sm focus:border-green-500 transition-colors group-hover:border-zinc-700"
                              placeholder="0"
                            />
                          </td>
                        ))}
                        <td className="p-2 text-right">
                            <button 
                                type="button"
                                onClick={() => handleRemoveLevel(boundary.level, boundary.phase_index)}
                                className="p-1.5 text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="Remove this level"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                        </td>
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
                                  const firstVal = parseFloat(String(values[`${stat.id}::${phasesToShow[0].min_level}::${phasesToShow[0].phase_index}`] || 0));
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
                              type="text" 
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
