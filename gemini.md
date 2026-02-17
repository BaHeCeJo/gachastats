# GachaStats Application Specification

This document outlines the core features, objectives, and future roadmap for the GachaStats web application.

## 1. Core Concepts

The application is designed to be a flexible platform for an **Admin** to build and manage a database of information for various "gacha" or collectible-based games.

### 1.1. Game & Section Management
-   **Games:** The top-level container for all information (e.g., "Zenless Zone Zero").
-   **Sections:** For each game, an admin can create custom categories of items (e.g., `Characters`, `Weapons`, `Echoes`). Each section can have a unique display name, key, color, and icon.

### 1.2. Customizable Fields
For each **Section**, an admin can define the specific data fields that describe the items within it. This is the core of the application's flexibility.

**Field Properties:**
-   `display_name`: The label shown on the edit page (e.g., "Element Type").
-   `key`: A unique identifier for the field.
-   `required`: Whether the field must have a value.
-   `order_index`: A number to control the display order of fields.
-   `manual_fill`: A boolean that determines the input method.
    -   `false`: The value must be chosen from a predefined list of options.
    -   `true`: The value is entered manually as free-text.
-   `is_multi`: A boolean that allows for multiple values.
    -   `false`: Only one value can be assigned.
    -   `true`: Multiple values can be assigned.
-   `has_icon` / `has_color`: For predetermined fields, this allows each option to have its own associated icon or color.

### 1.3. Field Input Methods
The combination of `manual_fill` and `is_multi` creates different input experiences when editing an entity:

-   **Single Predetermined (Dropdown):** (`manual_fill: false`, `is_multi: false`)
    -   *Example:* A `Rarity` field where you select one option from a dropdown (e.g., "5-Star").
-   **Multiple Predetermined (Checkboxes):** (`manual_fill: false`, `is_multi: true`)
    -   *Example:* A `Factions` field where you can check multiple boxes (e.g., "Belobog", "Stellaron Hunters").
-   **Single Manual (Text Input):** (`manual_fill: true`, `is_multi: false`)
    -   *Example:* An entity's `Name`.
-   **Multiple Manual (Tag Input):** (`manual_fill: true`, `is_multi: true`)
    -   *Example:* A `Synergies` field where an admin can type "Damage Over Time", press Enter to create a tag, then type "Debuffer" and press Enter to create another tag.

### 1.4. Entity & Skin Management
-   **Entities:** These are the actual items within a section (e.g., the character "Acheron").
-   **Skins:** Each entity can have multiple **Skins**. This allows for different visual or thematic representations of the same entity. One skin can be marked as the **Default** skin.
-   **Skin Images:** Each skin has two dedicated image slots, which can be uploaded directly on the entity's page:
    -   **Icon:** A smaller, squarer image, suitable for lists and avatars.
    -   **Full Art:** A larger, representative image.

## 2. Admin Workflow Example

1.  **Create Game:** Admin creates a new game: `"Honkai: Star Rail"`.
2.  **Create Section:** Inside the game, the admin creates a section: `Characters`.
3.  **Define Fields:** The admin defines the fields for the `Characters` section:
    -   `Name`: Manual, not multi.
    -   `Path`: Predetermined, not multi.
    -   `Tags`: Manual, **is multi** (this will use the Tag Input).
4.  **Populate Options:** For the `Path` field, the admin navigates to "Manage Options" and adds "Nihility", "Preservation", "The Hunt", etc.
5.  **Create Entity:** The admin creates a new entity: `"Acheron"`.
6.  **Edit Entity Values:** On Acheron's page, the admin:
    -   Sets the `Path` to "Nihility" using the dropdown.
    -   In the `Tags` field, types "DPS" and hits Enter, then types "Debuffer" and hits Enter.
7.  **Manage Skins:**
    -   On Acheron's page, the admin creates a new skin named "Base Outfit" and sets it as the default.
    -   For this skin, they upload a square **Icon** and a rectangular **Full Art** image.
8.  **View Result:**
    -   When viewing the list of all entities in the "Characters" section, Acheron appears with her default skin's icon next to her name.
    -   Navigating to her page shows all the data, including the tags and the skin images.

## 3. Future Roadmap

This section outlines potential features and enhancements for the future development of GachaStats.

-   **Public-Facing Views:** Create the read-only public website that displays all the game data managed by the admin.
-   **User Accounts & Tracking:** Allow non-admin users to create accounts to track their own collections (e.g., "I have this character", "I'm missing this weapon").
-   **Advanced Filtering & Sorting:** On public pages, allow users to filter and sort entities based on their field values (e.g., show all "5-Star" characters of the "Nihility" path).
-   **Team Builder:** A tool that would allow users to create and save teams or loadouts using the entities from the database.
-   **Public API:** Expose the application's data via a read-only API for use in third-party apps or websites.