# GachaStats Admin Platform

A powerful, flexible, and multi-language administration platform for managing databases of collectible-based games (Gacha games). Built with **Next.js (App Router)** and **Supabase**, it allows administrators to define custom data structures for any game without writing code.

## 🚀 Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Supabase**
  - PostgreSQL Database
  - Authentication (Admin access)
  - Storage (Images, Icons, Full Art)
  - Row Level Security (RLS)
- **Tailwind CSS**
- **Lucide React** (Icons)

## 🏗️ Core Architecture

The platform uses a hierarchical, generic data model to support any type of game:

1.  **Games:** The top-level container (e.g., "Zenless Zone Zero", "Honkai: Star Rail"). Each game has its own set of supported languages and a default language.
2.  **Sections:** Custom categories within a game (e.g., "Characters", "Weapons", "Bangboos").
3.  **Fields:** Dynamic attributes defined per section. 
    - Supports multiple input types: Dropdowns (Single/Multi), Text (Single), and Tag Inputs (Multi).
    - Supports Predetermined options (e.g., Rarity, Element) or Manual entry.
4.  **Entities:** The actual items within a section (e.g., "Ellen Joe"). 
    - Entities inherit the field structure of their section.
    - Entities support **Skins**, allowing for multiple visual representations (Icons and Full Art).

## 🌍 Multi-language Support

Localization is a first-class citizen in GachaStats. 
- Most text data (Names, Descriptions, Field Values) is stored as `LocalizedString` objects.
- Each game defines its `default_lang` and `supported_languages`.
- The UI adapts based on the available translations, falling back to the game's default language when necessary.

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js 18+ 
- A Supabase project

### 2. Installation
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Development
```bash
npm run dev
```

## 📖 Documentation
For a detailed breakdown of the application logic and admin workflows, refer to [gemini.md](./gemini.md).
