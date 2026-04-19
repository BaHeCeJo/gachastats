# GachaStats Application Specification

This document outlines the core features, objectives, and architectural details for the GachaStats web application.

## 1. Core Concepts

The application is a flexible platform for an **Admin** to build and manage a localized database of information for various "gacha" or collectible-based games, and for **Users** to track their personal collections.

### 1.1. Game & Section Management
-   **Games:** Top-level containers (e.g., "Zenless Zone Zero").
-   **Sections:** Custom categories (e.g., `Characters`, `Weapons`). 
-   **Collectibility:** Each section has an `is_collectible` toggle. If true, users can track ownership of items within that section.

### 1.2. Multi-language Support (Localization)
Localization is integrated into the core data model. Fields use a `LocalizedString` structure:
```typescript
type LocalizedString = {
  [langCode: string]: string; // e.g., { "en": "Name", "fr": "Nom" }
};
```
The system handles fallbacks to the game's `default_lang` and respects user-selected browser/cookie languages.

### 1.3. User Collections & Identity
-   **Profiles:** Users can customize their `nickname` and upload a `profile picture` to a secure `users` bucket.
-   **My Box:** A visual dashboard of games the user plays and entities they own.
-   **Interactive Grid:** A specialized management view where users can toggle ownership of entities with a single click (Grayed out = Not Owned, Full Color = Owned).

## 2. Key Features (Implemented)

-   **Admin Panel:** 
    - Full CRUD for Games, Sections, Fields, Options, and Entities.
    - **Advanced JSON Editor:** Bulk edit name, field values, stats, and abilities for any entity via a raw JSON interface with schema validation.
-   **Public-Facing Views:** Immersive, localized browse experience with dynamic backgrounds and responsive grid layouts.
-   **Interactive Collection Tracker:** 
    -   Secure `user_games` and `user_entities` tracking.
    -   One-tap "owned" toggling with optimistic UI updates.
    -   Visual filtering and sorting within the collection management view.
-   **Secure Profile Management:**
    -   Custom nickname and PP upload to Supabase Storage.
    -   **Security Trigger:** Database-level protection preventing users from promoting themselves to 'admin'.
-   **Storage Security:** Advanced RLS policies ensuring users can only manage files in their own `users/[user_id]/` folder.
-   **Responsive & Immersive UI:** High-impact visual design using `lucide-react` icons, blurred backdrops, and massive game icons.
-   **Recommended Teams & Builder:** 
    -   Powerful administrative tool to define optimal character combinations.
    -   Visual "Team Builder" interface for grouping entities with specific roles and synergies.
-   **Advanced Entity System:**
    - **Stats System:** Support for base stats and level-based scaling across multiple ascension phases.
    - **Ability Engine:** Support for complex ability definitions, including scaling attributes and multiple ability forms.

## 3. Technical Architecture & Optimizations

### 3.1. Tech Stack
- **Framework:** Next.js 16 (App Router / Turbopack)
- **State Management:** React 19 (Server Actions, `useActionState`, `useTransition`)
- **Backend:** Supabase (Auth, PostgreSQL, Storage)
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide React (Surgically imported for tree-shaking)

### 3.2. Performance Optimizations
- **Next.js 16 Proxy Middleware:** Migrated from `middleware.ts` to the optimized `proxy.ts` convention for faster request handling.
- **Server Action Caching:** Replaced `revalidateTag` with the preferred `updateTag` API for fine-grained, efficient cache invalidation.
- **Dynamic Imports:** Heavy components like the `TeamBuilder` are loaded dynamically (`next/dynamic`) to reduce the initial bundle size and speed up page loads.
- **Incremental Static Regeneration (ISR):** Public pages are pre-rendered with a 1-hour revalidation window (`export const revalidate = 3600`), ensuring fast delivery while keeping data fresh.
- **Optimistic UI:** Ownership toggles update instantly on the client while the database request completes in the background.

### 3.3. Security Implementation
- **Role Protection:** A database trigger `tr_protect_user_role` prevents any non-admin from updating their own `role` field in the `profiles` table.
- **Path Isolation:** RLS policies in Supabase Storage ensure users can only `INSERT`, `UPDATE`, or `DELETE` files within their unique `users/[user_id]/` path.

## 4. Database Performance Tuning (Advanced)

To achieve sub-100ms response times, the following database-level optimizations are recommended:

### 4.1. Recommended Indexes
Execute these in the Supabase SQL Editor:
```sql
-- Speed up collection tracking
CREATE INDEX idx_user_entities_lookup ON user_entities(user_id, entity_id);

-- Speed up section browsing
CREATE INDEX idx_section_entities_section ON section_entities(section_id);

-- Speed up field value filtering
CREATE INDEX idx_entity_field_values_composite ON entity_field_values(entity_id, game_field_id);
```

### 4.2. Connection Pooling
Always use the Supabase Transaction Pooler (Port 6543) in production `.env` files to minimize connection handshake latency.

## 5. Database Schema Highlights

-   **profiles:** Extends auth.users with `nickname`, `avatar_url`, and `role`.
-   **user_games:** Tracks which games a user has added to their collection.
-   **user_entities:** Tracks specific collectibles (characters/weapons) owned by a user.
-   **game_sections:** Defines the categories within a game (e.g., "Agents", "W-Engines").
-   **section_entities:** The actual collectible items.

## 5. Future Roadmap

### Phase 2: Enhanced Content & Visualization
-   **Skill/Ability Breakdown:** Structured scaling tables for character abilities.
-   **Tier List Creator:** Visual drag-and-drop tool for ranking entities.
-   **Entity Comparison Tool:** Side-by-side stat comparisons.

### Phase 3: Platform & Performance
-   **Global Search:** Fast fuzzy-search for games and entities.
-   **Public API:** Read-only access for third-party integrations.
-   **Bulk Import:** CSV/JSON tools for mass data entry.
