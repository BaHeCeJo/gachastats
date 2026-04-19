# Optimizer API Data Structure (HSR)

This document outlines the JSON structure used by the GachaStats Optimizer and Simulation backend. All requests are sent to the endpoint defined in `NEXT_PUBLIC_SIMULATOR_API_URL`.

## 1. Top-Level Request (`SimulationRequest`)
The main wrapper for all backend commands.

```json
{
  "command": "simulate" | "optimize",
  "game": "hsr",
  "payload": {
    "team": [CharacterPayload],         // For "simulate" command (1-4 characters)
    "character_pool": [CharacterPayload],// For "optimize" command (Full user collection)
    "waves": [WavePayload],
    "settings": {
      "max_cycles": 10,
      "has_castorice": false
    }
  }
}
```

---

## 2. Character Payload (`CharacterPayload`)
Represents a character in a team or in the pool. Use **IDs** for all backend logic. Names are provided for display/logging purposes only.

| Field | Type | Description |
| :--- | :--- | :--- |
| `character_id` | `UUID` | Unique ID from Supabase `section_entities`. |
| `name` | `string` | Display name (for logs/UI). |
| `level` | `number` | Character level (1-80). |
| `eidolon` | `number` | Number of duplicates (0-6). |
| `basic_stats` | `Record<UUID, ApiStatValue>` | Map of stat IDs to values. |
| `advanced_stats` | `Record<UUID, ApiStatValue>` | Map of static stat IDs to values. |
| `trace_levels` | `Record<string, number>` | Skill levels. |
| `lightcone` | `LightconeData | null` | Currently equipped lightcone. |
| `relics` | `RelicData[]` | Currently equipped relics (4 slots). |
| `ornaments` | `RelicData[]` | Currently equipped ornaments (2 slots). |

### Stat Value (`ApiStatValue`)
```json
{
  "value": 100.5,
  "name": "Display Name"
}
```

### Lightcone Data (`LightconeData`)
```json
{
  "id": "UUID",
  "name": "Display Name",
  "level": 80,
  "superimposition": 1,
  "basic_stats": { "UUID": { "value": 1058, "name": "HP" } }
}
```


### Relic/Ornament Data (`RelicData`)
```json
{
  "id": "UUID",
  "name": "Display Name",
  "set_id": "UUID",
  "level": 15,
  "main_stat": { "type": "atk_percent", "value": 43.2 },
  "sub_stats": [
    { "type": "crit_dmg", "value": 12.5 },
    { "type": "spd", "value": 4 }
  ]
}
```

---

## 3. Enemy Payload (`EnemyPayload`)
Represents an enemy in a battle wave.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | Unique ID from Supabase `section_entities`. |
| `instance_id` | `string` | Unique identifier (e.g., `enemy_01`). |
| `name` | `string` | Display name. |
| `level` | `number` | Enemy level. |
| `basic_stats` | `Record<UUID, ApiStatValue>` | Map of stat IDs to values. |
| `advanced_stats` | `Record<UUID, ApiStatValue>` | Map of static stat IDs to values. |
| `weaknesses` | `string[]` | List of localized elements. |

---

## 4. Wave Payload (`WavePayload`)
Battles consist of multiple waves. Each wave has 5 initial slots and an overflow pool.

```json
{
  "enemies": [
    EnemyPayload, // Slot 1
    null,         // Slot 2
    EnemyPayload, // Slot 3
    null,         // Slot 4
    null          // Slot 5
  ],
  "pool": [
    EnemyPayload, // First enemy to spawn when a slot opens
    EnemyPayload  // Second enemy to spawn...
  ]
}
```

---

## 5. Settings Object
Global simulation parameters.

| Field | Type | Description |
| :--- | :--- | :--- |
| `max_cycles` | `number` | The cycle limit (e.g., 10). |
| `has_castorice` | `boolean` | System-wide flag for special logic. |

---

## 6. Response Structure
The backend returns a standard response wrapper.

```json
{
  "status": "success",
  "data": {
    "logs": [
      {
        "av": 15.5,
        "type": "action",
        "actor": { "id": "...", "name": "...", "color": "..." },
        "message": "Used Skill on enemy_01",
        "details": "Dealt 50,000 DMG"
      }
    ],
    "result": {
      "total_damage": 1250000,
      "cycles_used": 2.5,
      "score": 1000,
      "best_team": ["UUID1", "UUID2", "UUID3", "UUID4"] // For 'optimize' command
    }
  }
}
```
