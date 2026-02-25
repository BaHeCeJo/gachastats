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

-   **Admin Panel:** Full CRUD capabilities for Games, Sections, Fields, Options, and Entities.
-   **Public-Facing Views:** A read-only, aesthetically polished localized website for end-users to browse game data.
-   **Localized Dynamic Fields:** Support for multi-language names, descriptions, and custom field values with automatic fallbacks.
-   **Advanced Filtering:** A visual filtering system for sections that allows users to drill down by dynamic attributes (e.g., Element, Rarity, Path).
-   **Skin Management:** Support for multiple skins per entity, including dedicated Icon and Full Art (Splash Art) image management via Supabase Storage.
-   **Admin Translation Tools:** A manual language selector in the admin header combined with visual "missing translation" indicators to help admins ensure full coverage across all supported languages.
-   **Responsive Design:** A modern, "gamer-centric" UI that works across various screen sizes.

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

-   **User Collections:** Personal tracking for owned items/characters.
-   **Team Builder:** A tool that would allow users to create and save teams or loadouts using the entities from the database.
-   **Public API:** Expose the application's data via a read-only API for use in third-party apps or websites.