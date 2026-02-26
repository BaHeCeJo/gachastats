# GachaStats Application Specification

This document outlines the core features, objectives, and architectural details for the GachaStats web application.

## 1. Core Concepts

The application is a flexible platform for an **Admin** to build and manage a localized database of information for various "gacha" or collectible-based games.

### 1.1. Game & Section Management
-   **Games:** The top-level container (e.g., "Zenless Zone Zero"). Each game defines:
    -   `default_lang`: The primary language for the game.
    -   `supported_languages`: A list of languages the admin intends to provide data for.
-   **Sections:** Custom categories within a game (e.g., `Characters`, `Weapons`, `Echoes`). Each section can have a unique key, color, and icon.

### 1.2. Multi-language Support (Localization)
Localization is integrated into the core data model. Fields that require translation (Names, Descriptions, Field Labels, Field Values) use a `LocalizedString` structure:
```typescript
type LocalizedString = {
  [langCode: string]: string; // e.g., { "en": "Name", "fr": "Nom" }
};
```
The application handles fallbacks to the game's `default_lang` if a translation is missing for the user's preferred language.

### 1.3. Customizable Fields
For each **Section**, an admin defines the data fields that describe the items.
**Field Properties:**
-   `key`: Unique identifier (and default label).
-   `required`: Mandatory field check.
-   `order_index`: Controls display order.
-   `manual_fill` & `is_multi`: Determines the input method.
-   `has_icon` / `has_color`: Allows predetermined options (like "Elements") to have associated visual markers.

### 1.4. Field Input Methods
| `manual_fill` | `is_multi` | Input Experience | Example |
| :--- | :--- | :--- | :--- |
| `false` | `false` | **Dropdown** | `Rarity` (5-Star) |
| `false` | `true` | **Multi-Select/Checkboxes** | `Factions` |
| `true` | `false` | **Text Input** | `Name` |
| `true` | `true` | **Tag Input** | `Synergies` (DPS, Debuffer) |

### 1.5. Entity & Skin Management
-   **Entities:** Items within a section (e.g., "Acheron").
-   **Skins:** Multiple visual/thematic representations. One is marked as **Default**.
-   **Images:** Each skin supports two image types uploaded to Supabase Storage:
    -   **Icon:** Square image for lists/avatars.
    -   **Full Art:** High-resolution representative artwork.

## 2. Key Features

The following core features are implemented and functional:

-   **Admin Panel:** Full CRUD capabilities for Games, Sections, Fields, Options, and Entities, providing a "No-Code" experience for managing complex data.
-   **Public-Facing Views:** A read-only, aesthetically polished localized website for end-users. Includes a dynamic background system that adapts to the game's theme.
-   **Localized Dynamic Fields:** Support for multi-language names, descriptions, and custom field values with automatic fallbacks to the game's default language.
-   **Advanced Filtering:** A visual filtering system for sections that allows users to drill down by dynamic attributes (e.g., Element, Rarity, Path) with visual indicators.
-   **Skin Management:** Support for multiple skins per entity. Each skin has its own name, Icon (for lists), and Full Art (for detail pages) managed via Supabase Storage.
-   **Admin Translation Tools:** A manual language selector in the admin header combined with visual "missing translation" indicators to help admins identify content gaps.
-   **Role-Based Access:** Integrated with Supabase Auth to ensure only authorized admins can modify the database.
-   **Responsive & Immersive UI:** A modern "gamer-centric" design featuring blurred backdrops, high-quality image rendering, and smooth transitions.

## 3. Admin Workflow Example

1.  **Create Game:** Admin creates "Honkai: Star Rail", sets `default_lang` to "en" and adds "zh-CN" and "ja" to `supported_languages`.
2.  **Create Section:** Creates "Characters" section.
3.  **Define Fields:**
    -   `Name`: Manual, single (Localized).
    -   `Path`: Predetermined, single (with icons).
    -   `Tags`: Manual, multi (Localized).
4.  **Populate Options:** For `Path`, adds "Nihility" (with its icon), providing translations for all supported languages.
5.  **Create Entity:** Creates "Acheron".
6.  **Edit Values:**
    -   Enters names in English, Chinese, and Japanese.
    -   Selects "Nihility" from the dropdown.
    -   Adds tags like "DPS" and "Debuffer" in multiple languages.
7.  **Manage Skins:**
    -   Creates "Base Outfit" skin.
    -   Uploads Icon and Full Art images.
8.  **View Result:** Acheron appears in the list with her icon. Her detail page shows all localized data and the full art.

## 4. Future Roadmap

This section outlines potential features and enhancements for the future development of GachaStats.

### Phase 1: User Engagement & Social
-   **User Collections:** Personal tracking for owned items/characters ("My Box").
-   **Team Builder:** Allow users to create, save, and share teams or loadouts using database entities.
-   **Comments & Ratings:** Integrated discussion system for each entity and user-submitted ratings (e.g., 1-5 stars).

### Phase 2: Enhanced Content & Visualization
-   **Skill/Ability Breakdown:** A dedicated, structured way to define complex character skills with level scaling and icons.
-   **Tier List Creator:** A tool for admins or users to build and publish visual tier lists for different sections.
-   **Entity Comparison Tool:** Side-by-side comparison of stats and fields between two or more entities.

### Phase 3: Platform & Performance
-   **Global Search:** A fast, fuzzy-search bar to find any entity or game across the entire platform.
-   **Theme Customization:** Allow admins to define primary colors and custom fonts per game to better match the game's brand.
-   **Public API & Webhooks:** Expose data via a read-only API and trigger webhooks when data is updated.
-   **Bulk Data Import/Export:** Support for CSV/JSON to simplify large-scale data migrations or updates.
