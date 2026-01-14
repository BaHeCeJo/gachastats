# Game Admin Platform

A web-based administration and content management platform for games, built with **Next.js (App Router)** and **Supabase**.  
This project provides secure admin pages to initialize and manage games, define their data structures, and customize gameplay entities such as characters, elements, weapons, and paths.

---

## Tech Stack

- **Next.js 14+** (App Router)
- **TypeScript**
- **Supabase**
  - Authentication
  - PostgreSQL database
  - Row Level Security (RLS)
- **Tailwind CSS**
- **Server Actions & Server Components**

---

## Core Concepts

- **Games** are configurable entities that define which mechanics are available.
- **Characters** can have different attribute combinations depending on the game:
  - Element + Weapon + Path
  - Element + Path
  - Element + Weapon
- **Weapons** are restricted by character compatibility (e.g. sword, lance).
- **Admin pages** allow full customization without code changes.
- **Profiles table** links Supabase Auth users to application roles.

---

## Getting Started

### 1. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
