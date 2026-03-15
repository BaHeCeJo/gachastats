"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { bulkUpsertEntitiesAction } from './actions';

import { LocalizedString } from '@/lib/localization';

interface InitialEntityData {
  id: string;
  name: LocalizedString;
  icon_path: string | null;
  field_values: {
    field_id: string | undefined;
    values: string[];
  }[];
  entity_stats: {
    stat_id: string;
    level: number;
    phase_index: number;
    value: number;
  }[];
}

export default function BulkEntityManager({ 
  sectionId, 
  gameDefaultLang,
  initialEntitiesData 
}: { 
  sectionId: string; 
  gameDefaultLang: string;
  initialEntitiesData: InitialEntityData[];
}) {
  const [jsonInput, setJsonInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();

  const handleGenerate = () => {
    setJsonInput(JSON.stringify(initialEntitiesData, null, 2));
    setMessage({ type: 'success', text: 'Current data generated below.' });
  };

  const handleImport = async () => {
    try {
      setIsProcessing(true);
      const data = JSON.parse(jsonInput);
      if (!Array.isArray(data)) throw new Error('Data must be an array of entities.');

      const res = await bulkUpsertEntitiesAction(sectionId, gameDefaultLang, data);
      
      if (res.success) {
        setMessage({ type: 'success', text: 'Successfully updated entities!' });
        router.refresh();
      } else {
        throw new Error('Failed to update entities.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON format.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-tight">Bulk Entity Management</h2>
          <p className="text-xs text-zinc-500 font-medium">Import or Export entities via JSON.</p>
        </div>
        <button 
          onClick={handleGenerate}
          className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg transition-all"
        >
          Generate Current JSON
        </button>
      </div>

      <div className="space-y-4">
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="Paste entity JSON here or click Generate..."
          className="w-full h-96 bg-black border border-zinc-800 rounded-xl p-4 font-mono text-xs text-green-500 focus:outline-none focus:border-green-500/50 transition-all"
        />

        {message && (
          <div className={`p-3 rounded-lg text-xs font-bold ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {message.text}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={isProcessing || !jsonInput}
          className="w-full py-4 bg-green-500 disabled:bg-zinc-800 text-black disabled:text-zinc-500 font-black uppercase tracking-[0.2em] rounded-xl hover:bg-green-400 transition-all flex items-center justify-center gap-3"
        >
          {isProcessing ? (
            <span className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
          ) : 'Import & Update Entities'}
        </button>
      </div>

      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">JSON Structure Hint:</h4>
        <pre className="text-[9px] text-zinc-600 font-mono leading-relaxed overflow-x-auto">
{`[
  {
    "id": "optional-uuid",
    "name": { "en": "New Hero" },
    "field_values": [
      { "field_id": "field-uuid", "values": ["option-uuid-or-text"] }
    ],
    "entity_stats": [
      { "stat_id": "hp-uuid", "level": 1, "phase_index": 0, "value": 1000 }
    ]
  }
]`}
        </pre>
      </div>
    </div>
  );
}
