# GachaStats Admin Platform

A powerful, flexible, and multi-language administration platform for managing databases of collectible-based games (Gacha games). Built with **Next.js (App Router)** and **Supabase**, it allows administrators to define custom data structures for any game without writing code.

## Core Features

-   **Dynamic Schema Builder:** Define games, sections (Characters, Weapons, etc.), and custom fields (Rarity, Element, Path) on the fly.
-   **First-Class Localization:** Built-in support for multiple languages with automatic fallbacks and specialized admin translation tools.
-   **Advanced Skin Management:** Support for multiple skins per entity, with dedicated slots for Icons and Full (Splash) Art.
-   **Visual Filtering:** Public-facing section pages include a powerful, visually-driven filtering system based on dynamic fields.
-   **Modern, Immersive UI:** A high-performance, responsive interface with a dark, gamer-centric aesthetic and dynamic background effects.
-   **Secure Admin Panel:** Protected by Supabase Auth and Row-Level Security (RLS).

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database & Auth:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage for high-quality assets.
- **Styling:** Tailwind CSS + Lucide React.

## Architecture Overview

1.  **Games:** Top-level containers defining supported languages.
2.  **Sections:** Categories within games (e.g., "Bangboos").
3.  **Fields:** Dynamic attributes with flexible input methods (Dropdowns, Multi-select, Tags, Text).
4.  **Entities:** Items with inherited field structures and multiple visual **Skins**.

## Getting Started

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

## Detailed Documentation
For a deep dive into the system's logic, database schema, and future roadmap, please refer to [gemini.md](./gemini.md).
