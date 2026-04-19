"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { getTranslatedField } from "@/lib/localization-utils";
import { createClient } from "@/lib/supabase/client";
import { Trash2, Plus } from "lucide-react";
import { mapCharacterToApi, mapEnemyToApi, mapLightconeToApi, sendToSimulationBackend } from "@/lib/services/simulation.service";
import { 
  OwnedEntity, 
  Enemy, 
  FieldOption, 
  SectionStat, 
  SimulationResult, 
  OptimizationResult, 
  LogEntry 
} from "./types";

function renderLogEntry(log: LogEntry, i: number) {
  const actorColor = log.actor?.color || "#71717a";
  if (log.type === 'header' || log.type === 'wave') {
    return (
      <div key={i} className="py-4 border-y border-zinc-900 my-2 text-center">
        <span className="text-yellow-500 font-black tracking-[0.3em] uppercase">
          {log.type === 'wave' ? `=== ${log.message} ===` : `--- ${log.message} ---`}
        </span>
      </div>
    );
  }
  if (log.type === 'defeat' || log.type === 'victory') {
    return (
      <div key={i} className={`py-8 border-y-2 ${log.type === 'defeat' ? 'border-red-900/50 text-red-500' : 'border-green-900/50 text-green-500'} my-4 text-center bg-zinc-950`}>
        <span className="text-2xl font-black tracking-[0.5em] uppercase italic">
          {log.message}
        </span>
      </div>
    );
  }
  return (
    <div key={i} className="space-y-1">
      <div className="flex items-start gap-3">
        <span className="text-zinc-600 shrink-0 w-12">[{log.av}]</span>
        <div className="flex-1">
          {log.actor && (
            <span className="font-black uppercase mr-2" style={{ color: actorColor }}>
              {log.actor.name}:
            </span>
          )}
          <span className={`${log.type === 'action' ? 'text-white font-bold' : 'text-zinc-400'}`}>
            {log.message}
          </span>
        </div>
      </div>
      {log.subEntries && log.subEntries.length > 0 && (
        <div className="ml-[60px] space-y-0.5 border-l border-zinc-800 pl-4 py-1">
          {log.subEntries.map((sub, si) => (
            <div key={si} className="text-zinc-500 flex gap-2">
              <span className="text-zinc-800">└</span>
              <span>{sub}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderLogs(logs: LogEntry[]) {
  return (
    <div className="bg-black/50 border border-zinc-800 rounded-3xl p-6 font-mono text-[10px] space-y-4 overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-zinc-800">
      {logs.map(renderLogEntry)}
    </div>
  );
}

function ResultsPanel({ tab, simulationResult, optimizationResult, isOptimizing, hasEnemies }: {
  tab: 'damage' | 'team';
  simulationResult: SimulationResult | null;
  optimizationResult: OptimizationResult | null;
  isOptimizing: boolean;
  hasEnemies: boolean;
}) {
  const title = tab === 'damage' ? 'Simulation Result' : 'Optimization Result';
  return (
    <div className="lg:col-span-2 space-y-8">
      <h2 className="text-2xl font-black italic uppercase tracking-widest text-zinc-400">{title}</h2>
      {tab === 'damage' && (
        simulationResult ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-8 bg-zinc-900/80 border border-zinc-800 rounded-[2rem] text-center space-y-2">
                <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest">Full Simulation DMG</p>
                <p className="text-5xl font-black text-[#22c55e]">{simulationResult.steps?.find((s) => s.name.includes("Full Simulation"))?.value.toLocaleString() || simulationResult.total_damage?.toLocaleString()}</p>
              </div>
            </div>
            {simulationResult.logs && (
              <div className="space-y-6">
                <h3 className="text-xl font-black italic uppercase tracking-widest text-zinc-400">Battle Logs</h3>
                {renderLogs(simulationResult.logs)}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-[3rem] text-center space-y-4">
            <p className="text-zinc-600 font-bold uppercase tracking-widest italic">{hasEnemies ? "Click 'Run Simulation' to see results" : "Add enemies to the battle to start"}</p>
          </div>
        )
      )}
      {tab === 'team' && (
        optimizationResult ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-[3rem] space-y-6">
              <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#22c55e]">Best Team Configuration</span><span className="text-2xl font-black text-white italic">{optimizationResult.bestReport.totalDamage.toLocaleString()} TOTAL DMG</span></div>
            </div>
            <div className="space-y-6">
              <h3 className="text-xl font-black italic uppercase tracking-widest text-zinc-400">Battle Logs</h3>
              {renderLogs(optimizationResult.bestReport.logs)}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-[3rem] text-center space-y-4">
            <p className="text-zinc-600 font-bold uppercase tracking-widest italic">{isOptimizing ? "Optimizing..." : "Select enemies and click 'Find Best Team'"}</p>
          </div>
        )
      )}
    </div>
  );
}

interface OptimizerClientProps {
  ownedCharacters: OwnedEntity[];
  ownedLightcones: OwnedEntity[];
  enemies: Enemy[];
  fieldOptions: FieldOption[];
  sectionStats: SectionStat[];
  enemySectionStats: SectionStat[];
  gameDefaultLang: string;
  currentLang: string;
}

export default function OptimizerClient({ 
  ownedCharacters, 
  ownedLightcones,
  enemies,
  fieldOptions,
  sectionStats,
  enemySectionStats,
  gameDefaultLang, 
  currentLang 
}: OptimizerClientProps) {
  const supabase = createClient();
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedLightconeId, setSelectedLightconeId] = useState<string | null>(null);
  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null);
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);
  
  const [waves, setWaves] = useState<{
    initialEnemies: ({ id: string, instanceId: string } | null)[],
    enemyPool: { id: string, instanceId: string }[]
  }[]>([
    { initialEnemies: [null, null, null, null, null], enemyPool: [] }
  ]);
  const [activeWaveIdx, setActiveWaveIdx] = useState(0);

  const [abilityLevel, setAbilityLevel] = useState(1);
  const [enemyLevel, setEnemyLevel] = useState(80);
  const [maxCycles, setMaxCycles] = useState(10);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [tab, setTab] = useState<'damage' | 'team'>('damage');

  const validCharacters = useMemo(() => ownedCharacters.filter(c => c.section_entities), [ownedCharacters]);
  const validLightcones = useMemo(() => ownedLightcones.filter(lc => lc.section_entities), [ownedLightcones]);
  
  const selectedCharacter = useMemo(() => validCharacters.find(c => c.entity_id === selectedEntityId), [validCharacters, selectedEntityId]);
  const selectedEnemy = useMemo(() => enemies.find(e => e.id === selectedEnemyId), [enemies, selectedEnemyId]);

  const availableEnemyLevels = useMemo(() => {
    if (!selectedEnemy) return [];
    return Array.from(new Set(selectedEnemy.entity_stats?.map(s => s.level))).sort((a, b) => a - b);
  }, [selectedEnemy]);

  // Combined stats for mapping (ensures we have both game-level and section-level stats)
  const allStats = useMemo(() => [...sectionStats, ...enemySectionStats], [sectionStats, enemySectionStats]);

  useEffect(() => {
    if (selectedCharacter && selectedCharacter.section_entities.entity_abilities?.length > 0) {
      setSelectedAbilityId(selectedCharacter.section_entities.entity_abilities[0].id);
      setAbilityLevel(1);
    } else {
      setSelectedAbilityId(null);
    }
  }, [selectedCharacter]);

  useEffect(() => {
    if (selectedEnemy && availableEnemyLevels.length > 0 && !availableEnemyLevels.includes(enemyLevel)) {
        setEnemyLevel(availableEnemyLevels[availableEnemyLevels.length - 1]);
    }
  }, [selectedEnemy, availableEnemyLevels, enemyLevel]);

  const addWave = () => {
    setWaves([...waves, { initialEnemies: [null, null, null, null, null], enemyPool: [] }]);
    setActiveWaveIdx(waves.length);
  };

  const removeWave = (idx: number) => {
    if (waves.length <= 1) return;
    const newWaves = waves.filter((_, i) => i !== idx);
    setWaves(newWaves);
    setActiveWaveIdx(Math.max(0, activeWaveIdx >= idx ? activeWaveIdx - 1 : activeWaveIdx));
  };

  const addEnemyToWave = () => {
    if (!selectedEnemyId) return;
    const newWaves = [...waves];
    // eslint-disable-next-line security/detect-object-injection
    const currentWave = newWaves[activeWaveIdx];
    const totalEnemiesInBattle = waves.reduce((acc, w) => acc + w.initialEnemies.filter(e => e !== null).length + w.enemyPool.length, 0);
    const instanceId = `enemy_${totalEnemiesInBattle + 1}`;

    const emptySlotIdx = currentWave.initialEnemies.findIndex(slot => slot === null);
    if (emptySlotIdx !== -1) {
        // eslint-disable-next-line security/detect-object-injection
        currentWave.initialEnemies[emptySlotIdx] = { id: selectedEnemyId, instanceId };
    } else {
        currentWave.enemyPool.push({ id: selectedEnemyId, instanceId });
    }
    setWaves(newWaves);
  };

  const removeEnemyFromWave = (slotIdx: number, isPool: boolean = false, poolIdx: number = 0) => {
    const newWaves = [...waves];
    // eslint-disable-next-line security/detect-object-injection
    const currentWave = newWaves[activeWaveIdx];
    if (isPool) {
        currentWave.enemyPool.splice(poolIdx, 1);
    } else {
        // eslint-disable-next-line security/detect-object-injection
        currentWave.initialEnemies[slotIdx] = null;
    }
    setWaves(newWaves);
  };

  const getApiWaves = useCallback(() => {
    const enemyMap = new Map(enemies.map(e => [e.id, e]));
    return waves.map(w => ({
        enemies: w.initialEnemies.map(be => {
            if (!be) return null;
            const enemyData = enemyMap.get(be.id);
            return mapEnemyToApi(enemyData, enemyLevel, be.instanceId, currentLang, gameDefaultLang, allStats, fieldOptions);
        })
    }));
  }, [waves, enemies, enemyLevel, currentLang, gameDefaultLang, allStats, fieldOptions]);

  const handleSimulate = async () => {
    const totalEnemies = waves.reduce((acc, w) => acc + w.initialEnemies.filter(e => e !== null).length + w.enemyPool.length, 0);
    if (!selectedCharacter || !selectedAbilityId || totalEnemies === 0) return;

    setIsOptimizing(true);
    const CASTORICE_ID = 'aa5d5fbc-0c17-466e-ac4f-8432092d1841';
    const ownsCastorice = validCharacters.some(c => c.entity_id === CASTORICE_ID);

    const apiLCs = validLightcones.map(lc => mapLightconeToApi(lc, currentLang, gameDefaultLang, allStats, fieldOptions));
    const apiTeam = [mapCharacterToApi(selectedCharacter, currentLang, gameDefaultLang, allStats, fieldOptions)];
    const apiWaves = getApiWaves();

    try {
        const response = await sendToSimulationBackend({
            command: "simulate",
            game: "hsr",
            payload: {
                team: apiTeam,
                lightcone_pool: apiLCs,
                waves: apiWaves,
                settings: {
                    max_cycles: maxCycles,
                    has_castorice: ownsCastorice
                }
            }
        });

        if (response.status === "success") {
            setSimulationResult(response.data);
        }
    } catch (error) {
        console.error("Simulation failed:", error);
        alert("Failed to connect to simulation backend.");
    } finally {
        setIsOptimizing(false);
    }
  };

  const handleDownloadPayload = () => {
    const CASTORICE_ID = 'aa5d5fbc-0c17-466e-ac4f-8432092d1841';
    const ownsCastorice = validCharacters.some(c => c.entity_id === CASTORICE_ID);
    const apiWaves = getApiWaves();
    const apiLCs = validLightcones.map(lc => mapLightconeToApi(lc, currentLang, gameDefaultLang, allStats, fieldOptions));

    const settings = {
        max_cycles: maxCycles,
        has_castorice: ownsCastorice
    };

    let request;
    if (tab === 'damage') {
        if (!selectedCharacter) return;
        request = {
            command: "simulate" as const,
            game: "hsr" as const,
            payload: {
                team: [mapCharacterToApi(selectedCharacter, currentLang, gameDefaultLang, allStats, fieldOptions)],
                lightcone_pool: apiLCs,
                waves: apiWaves,
                settings
            }
        };
    } else {
        request = {
            command: "optimize" as const,
            game: "hsr" as const,
            payload: {
                character_pool: validCharacters.map(char => mapCharacterToApi(char, currentLang, gameDefaultLang, allStats, fieldOptions)),
                lightcone_pool: apiLCs,
                waves: apiWaves,
                settings
            }
        };
    }

    const blob = new Blob([JSON.stringify(request, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hsr_request_${request.command}_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOptimizeTeam = async () => {
    const totalEnemies = waves.reduce((acc, w) => acc + w.initialEnemies.filter(e => e !== null).length + w.enemyPool.length, 0);
    if (totalEnemies === 0) return;
    
    setIsOptimizing(true);
    setOptimizationResult(null);

    const CASTORICE_ID = 'aa5d5fbc-0c17-466e-ac4f-8432092d1841';
    const ownsCastorice = validCharacters.some(c => c.entity_id === CASTORICE_ID);

    const apiPool = validCharacters.map(char => mapCharacterToApi(char, currentLang, gameDefaultLang, allStats, fieldOptions));
    const apiLCs = validLightcones.map(lc => mapLightconeToApi(lc, currentLang, gameDefaultLang, allStats, fieldOptions));
    const apiWaves = getApiWaves();

    try {
        const response = await sendToSimulationBackend({
            command: "optimize",
            game: "hsr",
            payload: {
                character_pool: apiPool,
                lightcone_pool: apiLCs,
                waves: apiWaves,
                settings: {
                    max_cycles: maxCycles,
                    has_castorice: ownsCastorice
                }
            }
        });

        if (response.status === "success") {
            setOptimizationResult(response.data);
        }
    } catch (error) {
        console.error("Optimization failed:", error);
        alert("Failed to connect to simulation backend.");
    } finally {
        setIsOptimizing(false);
    }
  };

  // eslint-disable-next-line security/detect-object-injection
  const activeWave = waves[activeWaveIdx];

  let runButtonLabel: string;
  if (tab === 'damage') {
    runButtonLabel = 'Run Simulation';
  } else if (isOptimizing) {
    runButtonLabel = "Optimizing...";
  } else {
    runButtonLabel = "Find Best Team";
  }

  return (
    <div className="space-y-12">
      <div className="flex justify-center gap-4 bg-zinc-950 p-2 rounded-2xl border border-zinc-800 w-fit mx-auto">
        <button onClick={() => setTab('damage')} className={`px-8 py-3 rounded-xl font-black uppercase italic tracking-widest text-sm transition-all ${tab === 'damage' ? 'bg-[#22c55e] text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'text-zinc-500 hover:text-white'}`}>Damage Simulator</button>
        <button onClick={() => setTab('team')} className={`px-8 py-3 rounded-xl font-black uppercase italic tracking-widest text-sm transition-all ${tab === 'team' ? 'bg-[#22c55e] text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'text-zinc-500 hover:text-white'}`}>Team Optimizer</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="space-y-12">
          {tab === 'damage' && (
            <>
              <div className="space-y-6">
                  <h2 className="text-2xl font-black italic uppercase tracking-widest text-zinc-400">Select Character</h2>
                  <div className="grid grid-cols-4 gap-3">
                  {validCharacters.map((char) => {
                      const isSelected = char.entity_id === selectedEntityId;
                      const iconUrl = char.section_entities.icon_path ? supabase.storage.from("games").getPublicUrl(char.section_entities.icon_path).data.publicUrl : null;
                      return (
                      <button key={char.id} onClick={() => setSelectedEntityId(char.entity_id)} className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 ${isSelected ? "border-[#22c55e] scale-105 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "border-zinc-800 hover:border-zinc-600"}`}>
                          {iconUrl && <Image src={iconUrl} alt="" fill className="object-cover" />}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-1.5"><span className="text-[8px] font-bold uppercase truncate">{getTranslatedField(char.section_entities.name, currentLang, gameDefaultLang)}</span></div>
                      </button>
                      );
                  })}
                  </div>
              </div>

              <div className="space-y-6">
                  <h2 className="text-2xl font-black italic uppercase tracking-widest text-zinc-400">Select Lightcone</h2>
                  <div className="grid grid-cols-4 gap-3">
                  {validLightcones.map((lc) => {
                      const isSelected = lc.entity_id === selectedLightconeId;
                      const iconUrl = lc.section_entities.icon_path ? supabase.storage.from("games").getPublicUrl(lc.section_entities.icon_path).data.publicUrl : null;
                      return (
                      <button key={lc.id} onClick={() => setSelectedLightconeId(lc.entity_id)} className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 ${isSelected ? "border-[#22c55e] scale-105 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "border-zinc-800 hover:border-zinc-600"}`}>
                          {iconUrl && <Image src={iconUrl} alt="" fill className="object-cover" />}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-1.5"><span className="text-[8px] font-bold uppercase truncate">{getTranslatedField(lc.section_entities.name, currentLang, gameDefaultLang)}</span></div>
                      </button>
                      );
                  })}
                  </div>
              </div>
            </>
          )}

          <div className="space-y-6">
              <h2 className="text-2xl font-black italic uppercase tracking-widest text-zinc-400">Select Enemy</h2>
              <div className="grid grid-cols-4 gap-3">
              {enemies.map((enemy) => {
                  const isSelected = enemy.id === selectedEnemyId;
                  const iconUrl = enemy.icon_path ? supabase.storage.from("games").getPublicUrl(enemy.icon_path).data.publicUrl : null;
                  return (
                  <button key={enemy.id} onClick={() => setSelectedEnemyId(enemy.id)} className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 ${isSelected ? "border-[#22c55e] scale-105 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "border-zinc-800 hover:border-zinc-600"}`}>
                      {iconUrl && <Image src={iconUrl} alt="" fill className="object-cover" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-1.5"><span className="text-[8px] font-bold uppercase truncate">{getTranslatedField(enemy.name, currentLang, gameDefaultLang)}</span></div>
                  </button>
                  );
              })}
              </div>
          </div>

          <div className="space-y-6">
              <h2 className="text-2xl font-black italic uppercase tracking-widest text-zinc-400">Battle Waves</h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {waves.map((_, idx) => (
                  <button key={idx} onClick={() => setActiveWaveIdx(idx)} className={`px-4 py-2 rounded-lg font-black uppercase text-xs transition-all border ${activeWaveIdx === idx ? 'bg-[#22c55e] text-black border-[#22c55e]' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                    Wave {idx + 1}
                  </button>
                ))}
                <button onClick={addWave} className="px-4 py-2 rounded-lg font-black uppercase text-xs bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 transition-all flex items-center gap-2">
                  <Plus size={12} /> Add Wave
                </button>
              </div>

              <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase text-zinc-500 tracking-widest italic">Wave {activeWaveIdx + 1} Configuration</h3>
                  {waves.length > 1 && (
                    <button onClick={() => removeWave(activeWaveIdx)} className="text-red-500 hover:text-red-400 p-1 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Initial Enemies (Max 5)</p>
                  <div className="grid grid-cols-5 gap-2">
                    {activeWave.initialEnemies.map((slot, idx) => {
                      if (!slot) return (
                        <div key={idx} className="aspect-square rounded-lg border-2 border-dashed border-zinc-800 flex items-center justify-center text-zinc-800">
                          <span className="text-[8px] font-bold uppercase">{idx + 1}</span>
                        </div>
                      );
                      const enemyData = enemies.find(e => e.id === slot.id);
                      const iconUrl = enemyData?.icon_path ? supabase.storage.from("games").getPublicUrl(enemyData.icon_path).data.publicUrl : null;
                      return (
                        <div key={idx} className="relative aspect-square rounded-lg border-2 border-[#22c55e] overflow-hidden group">
                          {iconUrl && <Image src={iconUrl} alt="" fill className="object-cover" />}
                          <button onClick={() => removeEnemyFromWave(idx)} className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Trash2 size={16} className="text-white" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedEnemyId && (
                  <button onClick={addEnemyToWave} className="w-full py-2 bg-zinc-800 text-white font-bold uppercase text-xs rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors">
                    <Plus size={14} /> Add {getTranslatedField(selectedEnemy?.name, currentLang, gameDefaultLang)}
                  </button>
                )}
              </div>
          </div>

          <div className="space-y-6">
              <h2 className="text-2xl font-black italic uppercase tracking-widest text-zinc-400">Simulation Settings</h2>
              <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl space-y-4">
                  <div className="space-y-2">
                      <label className="text-zinc-500 font-bold uppercase text-xs">Max Cycles</label>
                      <input 
                          type="number" 
                          value={maxCycles} 
                          onChange={(e) => setMaxCycles(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-[#22c55e] font-black focus:outline-none focus:border-[#22c55e] text-center"
                      />
                  </div>
              </div>
          </div>

          {(selectedCharacter || waves.some(w => w.initialEnemies.some(e => e !== null))) && (
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl space-y-6">
              {tab === 'damage' && selectedCharacter && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center"><span className="text-zinc-500 font-bold uppercase text-xs">Character Level</span><span className="text-[#22c55e] font-black text-xl">{selectedCharacter.level}</span></div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-zinc-500 font-bold uppercase text-xs">Ability</label>
                          <select value={selectedAbilityId || ""} onChange={(e) => setSelectedAbilityId(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#22c55e] appearance-none cursor-pointer">
                              {selectedCharacter.section_entities.entity_abilities?.map((ab) => (<option key={ab.id} value={ab.id}>{getTranslatedField(ab.name, currentLang, gameDefaultLang)}</option>))}
                          </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-zinc-500 font-bold uppercase text-xs">Ability Level</label>
                            <select value={abilityLevel} onChange={(e) => setAbilityLevel(parseInt(e.target.value))} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-[#22c55e] font-bold focus:outline-none focus:border-[#22c55e] appearance-none cursor-pointer text-center">
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map((lvl) => (<option key={lvl} value={lvl}>Lv. {lvl}</option>))}
                            </select>
                        </div>
                    </div>
                </div>
              )}

              {selectedEnemy && (
                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <div className="space-y-2">
                        <label className="text-zinc-500 font-bold uppercase text-xs">Enemy Level</label>
                        <select value={enemyLevel} onChange={(e) => setEnemyLevel(parseInt(e.target.value))} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#22c55e] appearance-none cursor-pointer text-center">
                            {availableEnemyLevels.map((lvl) => (<option key={lvl} value={lvl}>Lv. {lvl}</option>))}
                        </select>
                    </div>
                  </div>
              )}

              <button onClick={tab === 'damage' ? handleSimulate : handleOptimizeTeam} disabled={(tab === 'damage' && (!selectedAbilityId || !waves.some(w => w.initialEnemies.some(e => e !== null)))) || (tab === 'team' && (validCharacters.length < 4 || !waves.some(w => w.initialEnemies.some(e => e !== null)) || isOptimizing))} className="w-full py-4 bg-[#22c55e] text-black font-black uppercase italic tracking-widest rounded-xl hover:bg-[#16a34a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {runButtonLabel}
              </button>

              <button 
                onClick={handleDownloadPayload}
                disabled={(tab === 'damage' && (!selectedCharacter || !waves.some(w => w.initialEnemies.some(e => e !== null)))) || (tab === 'team' && (validCharacters.length < 4 || !waves.some(w => w.initialEnemies.some(e => e !== null))))}
                className="w-full py-2 bg-zinc-800 text-zinc-400 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700"
              >
                Download API Payload (JSON)
              </button>
            </div>
          )}
        </div>

        <ResultsPanel
          tab={tab}
          simulationResult={simulationResult}
          optimizationResult={optimizationResult}
          isOptimizing={isOptimizing}
          hasEnemies={waves.some(w => w.initialEnemies.some(e => e !== null))}
        />
      </div>
    </div>
  );
}
