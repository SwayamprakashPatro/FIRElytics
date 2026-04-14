# FIRElytics

This is a premium starter kit for Next.js 14+ with App Router, Tailwind CSS, and full Supabase integration. It includes pre-installed support for Chart.js, Markdown rendering, and modern UI components.

## ✨ Features

- **Next.js 14 App Router** - The latest and greatest.
- **Tailwind CSS** - For stunning utility-first styling.
- **Supabase JS Client** - All set up in `lib/supabase.ts`.
- **Chart.js & React-Chartjs-2** - For professional data visualizations.
- **React Markdown** - Pre-installed for content-rich pages.
- **Premium Design System** - A sleek, professional dark and light theme-optimized UI.

## 🚀 Getting Started

### 1. Installation

Clone or download this repository and install the dependencies:

```bash
npm install
```

### 2. Configure Supabase

Create a `.env.local` file in the root directory (one has been created for you with placeholders):

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_project_anon_key
```

You can find these values in your Supabase project settings under **Settings > API**.

### 3. Run Development Server

Start the application locally:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## 📄 Structure

- `/app` - Next.js App Router folders (Home, Dashboard, Layout).
- `/lib` - Utility configurations (Supabase client).
- `/public` - Static assets.
- `package.json` - Project metadata and dependencies.

## 🛠 Built With

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Chart.js](https://www.chartjs.org/)
- [React Markdown](https://github.com/remarkjs/react-markdown)

---
