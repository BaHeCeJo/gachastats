# GachaStats Admin & Collection Platform

A powerful, immersive, and multi-language platform for managing gacha game databases and tracking personal user collections. Built with **Next.js 15 (App Router)**, **Supabase**, and **Tailwind CSS**.

## ✨ Core Features

-   **🎮 Collection Tracking:** Interactive "My Box" experience. Users can toggle ownership of characters and items with one tap in a beautiful, visual grid.
-   **👤 User Profiles:** Customizable nicknames and profile picture uploads to secure, isolated storage folders.
-   **🛠️ Dynamic Schema Builder:** Admins can define games, sections, and custom fields (Rarity, Element, etc.) without code.
-   **🌍 Pro-Grade Localization:** Full support for English and French, with dynamic fallbacks and localized filtering.
-   **🔒 Rock-Solid Security:** 
    -   **Database Triggers:** Prevent unauthorized role escalations (users cannot make themselves admins).
    -   **Isolated Storage:** Users only have access to their specific `users/[user_id]/` folder.
    -   **Strict RLS:** Row-level security ensures private collections stay private.

## 🚀 Quick Start

### 1. Install Dependencies
Run the following command to install the framework and all UI components (`lucide-react`, `@heroicons/react`, etc.):

```bash
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Database Initialization
Ensure your Supabase project has the required tables and security triggers. 
1.  Run the schema setup (refer to `gemini.md` for logic).
2.  Create two Public buckets: `games` and `users`.
3.  Apply the storage RLS policies provided during development.

### 4. Run Development Server
```bash
npm run dev
```
Visit `http://localhost:3000` to see the site in action.

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router / Turbopack)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage (Buckets: `games`, `users`)
- **Icons:** Lucide React & Heroicons
- **Styling:** Tailwind CSS 4

## 📖 Documentation
For detailed architecture, schema breakdowns, and the development roadmap, see [gemini.md](./gemini.md).
