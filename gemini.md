# GachaStats Application Objectives

This document outlines the core features and objectives for the GachaStats web application.

## 1. Core Concepts

The application is designed to be a flexible platform for managing and displaying information about various "gacha" or collectible-based games.

### 1.1. User Roles

-   **Admin:** Can manage all aspects of the application, including creating games, defining data structures, and managing content.
-   **User:** Can view the information presented for each game. (Future functionality may include user-specific tracking, but this is not in the initial scope).

### 1.2. Game Management

-   Admins are responsible for creating and editing **Games**. A "Game" is the top-level container for all related information (e.g., "Zenless Zone Zero", "Genshin Impact").

### 1.3. Game Sections (Categories)

-   For each game, an admin can create custom **Sections**. These represent the different types of collectibles or entities within that game.
-   **Examples:** `Characters`, `Weapons`, `Bangboos`, `Echoes`, `Stigmata`.
-   Each section can be customized with its own unique **icon** and **display color** to make it visually distinct.

### 1.4. Customizable Fields

-   This is the core of the application's flexibility. For each **Section**, an admin can define the specific data fields that will describe the items within it.
-   **Example for a "Characters" section:**
    -   `Name`
    -   `Element`
    -   `Speciality` / `Path`
    -   `Weapon Type`
    -   `Rarity`

### 1.5. Field Configuration

-   Each field can be configured with the following properties:
    -   **Input Type:**
        -   **Manual:** The value is a free-text input. (e.g., a character's `Name`).
        -   **Predetermined:** The value must be chosen from a predefined list of options created by the admin. (e.g., a character's `Element`).
    -   **Associated Data:** For fields with **Predetermined** values, admins can specify if the options have their own associated `color` or `icon`.
        -   `Element` field: Values like "Fire" and "Ice" can each have a unique color and icon.
        -   `Weapon Type` field: Values like "Sword" and "Bow" can each have a unique icon.

### 1.6. Value Management for Predetermined Fields

-   After creating a field with a "Predetermined" input type, admins can then populate the list of possible values.
-   **Example:** For the `Element` field, an admin can add:
    -   Value: "Ether", Color: `#FFFFFF`, Icon: `ether.svg`
    -   Value: "Ice", Color: `#ADD8E6`, Icon: `ice.svg`
    -   Value: "Fire", Color: `#FF4500`, Icon: `fire.svg`

## 2. Admin Workflow Example

To illustrate the intended functionality, here is a step-by-step example of an admin setting up a new game.

1.  **Create Game:** Admin creates a new game called `"Zenless Zone Zero (ZZZ)"`.
2.  **Create Sections:** Inside the "ZZZ" game, the admin creates three sections:
    -   `Characters` (with a person icon)
    -   `Weapons` (with a sword icon)
    -   `Bangboo` (with a robot icon)
3.  **Define Character Fields:** The admin navigates to the `Characters` section and defines its fields:
    -   `Name`: Type `Manual`.
    -   `Element`: Type `Predetermined`, with `Color` and `Icon` support for its values.
    -   `Speciality`: Type `Predetermined`, with `Color` and `Icon` support for its values.
    -   `Weapon`: Type `Predetermined`, with `Icon` support for its values.
4.  **Populate Predetermined Values:**
    -   For the `Element` field, the admin adds values like "Ether", "Physical", "Fire", etc., each with a corresponding color and icon.
    -   For the `Speciality` field, the admin adds values like "Rupture", "Anomaly", "Stun", etc.
    -   For the `Weapon` field, the admin adds values like "W-Engine", "Drill", etc., each with an icon.
5.  **Create a New Item:** The admin can now create a new entry in the `Characters` section.
    -   **Name:** "Yi Xuan" (manual text input)
    -   **Element:** Selects "Ether" from the dropdown list.
    -   **Speciality:** Selects "Rupture" from the dropdown list.
    -   **Weapon:** Selects "W-Engine" from the dropdown list.
    -   **Character Icon:** Uploads a primary image for Yi Xuan herself.
6.  **View Result:** The new character, "Yi Xuan", is now visible in the "Characters" section of the "ZZZ" game page, displaying all the information and icons that were just configured.
