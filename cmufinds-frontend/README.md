# CMUFinds Frontend

This directory contains the frontend application for CMUFinds, built with Next.js.

## Overview

The frontend provides the user interface for interacting with the CMUFinds platform, allowing users to register, log in, create/view lost and found posts, manage their profile, chat, and report items or users.

## Tech Stack

*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **UI Components:** shadcn/ui
*   **State Management:** Zustand
*   **Forms:** React Hook Form (likely, based on common practices with shadcn/ui)
*   **Data Fetching:** Fetch API (via custom wrappers like `lib/api.ts`)
*   **Real-time:** Socket.IO Client

## Project Structure

```
app/
├── (routes)/       # Main application routes (e.g., posts, profile, admin)
│   ├── page.tsx      # Page component
│   └── layout.tsx    # Layout component for the route
├── layout.tsx      # Root layout for the entire application
├── globals.css     # Global CSS styles
└── ...             # Other root files (loading, error, not-found)
components/
├── ui/             # Reusable UI components (from shadcn/ui)
├── layout/         # Layout components (Navbar, etc.)
├── providers/      # Context providers (Theme, etc.)
└── ...             # Feature-specific components (Chat, Forms, etc.)
lib/
├── api.ts          # Base API fetch wrapper
├── postsAPI.ts     # API functions specific to posts
├── utils.ts        # Utility functions (e.g., cn for classnames)
└── ...             # Other library code
store/
├── authStore.ts    # Zustand store for authentication state
└── ...             # Other global state stores
public/
└── ...             # Static assets (images, fonts)
```

## Setup and Running

1.  **Install Dependencies:**
    ```bash
    npm install
    # or yarn install / pnpm install
    ```

2.  **Environment Variables:**
    *   Create a `.env.local` file in the `cmufinds-frontend` directory.
    *   Define the necessary environment variables, primarily the backend API URL:
        ```
        NEXT_PUBLIC_API_URL=http://localhost:5000 # Replace with your backend URL
        ```
        *(Ensure this matches the URL your backend server is running on)*

3.  **Run the Development Server:**
    ```bash
    npm run dev
    # or yarn dev / pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) (or your configured port) in your browser.

4.  **Build for Production:**
    ```bash
    npm run build
    ```

5.  **Run Production Server:**
    ```bash
    npm start
    ```

## Key Features

*   User Authentication (Register/Login)
*   Lost & Found Post Creation & Management
*   Post Searching & Filtering
*   User Profiles
*   Real-time Chat between users about posts
*   Notification System
*   Reporting System (Posts/Users)
*   Admin Dashboard (User/Post/Report Management) 