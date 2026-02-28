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

-   **Admin Panel:** Full CRUD for Games, Sections, Fields, Options, and Entities.
-   **Public-Facing Views:** Immersive, localized browse experience with dynamic backgrounds.
-   **Interactive Collection Tracker:** 
    -   Secure `user_games` and `user_entities` tracking.
    -   One-tap "owned" toggling with optimistic UI updates.
    -   Visual filtering within the collection management view.
-   **Secure Profile Management:**
    -   Custom nickname and PP upload to Supabase Storage.
    -   **Security Trigger:** Database-level protection preventing users from promoting themselves to 'admin'.
-   **Storage Security:** Advanced RLS policies ensuring users can only manage files in their own `users/[user_id]/` folder.
-   **Responsive & Immersive UI:** High-impact visual design using `lucide-react` icons, blurred backdrops, and massive game icons.

## 3. Database Schema Highlights

-   **profiles:** Extends auth.users with `nickname`, `avatar_url`, and `role`. Protected by `tr_protect_user_role` trigger.
-   **user_games:** Many-to-many join table for users and games played.
-   **user_entities:** Many-to-many join table for users and specific collectibles owned.
-   **game_sections:** Includes `is_collectible` boolean to drive UI logic.

## 4. Future Roadmap

### Phase 2: Enhanced Content & Visualization
-   **Skill/Ability Breakdown:** Structured scaling tables for character abilities.
-   **Tier List Creator:** Visual drag-and-drop tool for ranking entities.
-   **Entity Comparison Tool:** Side-by-side stat comparisons.

### Phase 3: Platform & Performance
-   **Global Search:** Fast fuzzy-search for games and entities.
-   **Public API:** Read-only access for third-party integrations.
-   **Bulk Import:** CSV/JSON tools for mass data entry.
