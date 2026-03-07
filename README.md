# GachaStats Admin & Collection Platform

A high-performance, immersive, and multi-language platform for building game databases and tracking personal collectibles. Built with **Next.js 16 (App Router)**, **Supabase**, and **Tailwind CSS 4**.

## ✨ Core Features

-   **🎮 Collection Management:** Interactive grid where users can toggle character ownership with one tap. Supports multiple gacha games in a single "My Box" dashboard.
-   **🛠️ Admin Control Panel:** Full CRUD capabilities for games, sections, custom fields, and entities. No code required to define new data structures.
-   **🤝 Team Builder:** Recommend optimal teams/combinations for any collectible item.
-   **👤 Secure Profiles:** Custom nickname and profile picture uploads to isolated, secure storage paths.
-   **🌍 Multi-Language Native:** Seamlessly manage and browse content in English, French, and more.

## 🚀 Getting Started

Follow these steps to set up the project locally:

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd gachastats
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# For administrative actions in local scripts/proxies
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 3. Supabase Backend Setup

To make the application functional, you need to set up your Supabase project:

#### Database
1.  **Profiles Table:** Extend your `auth.users` with a `profiles` table containing `nickname` (text), `avatar_url` (text), and `role` (text, defaults to 'user').
2.  **Schema:** Create tables for `games`, `game_sections`, `section_fields`, `field_options`, `section_entities`, `entity_field_values`, `user_games`, and `user_entities`.
3.  **Role Protection:** Add a database trigger to prevent non-admin users from changing their own `role`.

#### Storage Buckets
Create the following **Public** buckets:
-   `games`: For all game assets (covers, icons, entity images).
-   `users`: For user profile pictures.

#### RLS (Row Level Security) Policies
-   **Storage:** Apply a policy to the `users` bucket allowing users to `INSERT/UPDATE/DELETE` only if the path matches `users/${auth.uid()}/`.
-   **Tables:** Ensure `games`, `game_sections`, etc., are readable by everyone but writable only by users with the `admin` role.

### 4. Run the Website

#### Development Mode
```bash
npm run dev
```

#### Production Build & Test
```bash
npm run build
npm start
```

## 🛠️ Performance & Tech

- **Framework:** Next.js 16 (Turbopack, Proxy Middleware)
- **Data Fetching:** ISR (Incremental Static Regeneration) for lightning-fast public pages.
- **Interactions:** React 19 `useActionState` and `useTransition` for smooth, zero-jank form handling.
- **Images:** Next.js `Image` component with remote pattern optimization for Supabase storage.

## 📖 Detailed Specs
For a full breakdown of the architecture, schema, and future roadmap, see [gemini.md](./gemini.md).
