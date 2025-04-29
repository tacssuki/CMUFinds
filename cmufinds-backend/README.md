# CMUFinds Backend

This directory contains the backend server for the CMUFinds application.

## Overview

The backend is built using Node.js, Express, TypeScript, and Prisma ORM to handle API requests, interact with the database, manage real-time chat functionality via Socket.IO, and process file uploads.

## Tech Stack

*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Language:** TypeScript
*   **Database ORM:** Prisma
*   **Database:** PostgreSQL (as configured in `schema.prisma`)
*   **Real-time:** Socket.IO
*   **Security:** Helmet, CORS, express-rate-limit
*   **Environment Variables:** dotenv

## Project Structure

```
src/
├── controllers/  # Request handlers
├── middleware/   # Express middleware (auth, validation, etc.)
├── routes/       # API route definitions
├── services/     # Business logic, database interactions, external services
├── utils/        # Utility functions
└── server.ts     # Main server entry point
prisma/
├── migrations/   # Database migration history
└── schema.prisma # Database schema definition
uploads/          # Directory for user uploads (profile pics, post images) - Not version controlled
```

## Setup and Running

1.  **Install Dependencies:**
    ```bash
    npm install
    # or yarn install / pnpm install
    ```

2.  **Environment Variables:**
    *   Create a `.env` file in the `cmufinds-backend` directory.
    *   Copy the contents of a `.env.example` (if one exists) or define the necessary variables, including:
        *   `DATABASE_URL`: Connection string for your PostgreSQL database.
        *   `PORT`: Port the server will run on (e.g., 5000).
        *   `JWT_SECRET`: Secret key for signing JWT tokens.
        *   `FRONTEND_URL`: URL of the frontend application (for CORS).
        *   `API_URL`: URL of this backend API.
        *   *(Add any other required variables like email service credentials)*

3.  **Database Migration:**
    *   Ensure your PostgreSQL server is running and the database specified in `DATABASE_URL` exists.
    *   Apply Prisma migrations:
        ```bash
        npx prisma migrate deploy
        ```
    *   *(Optional)* Generate Prisma Client (usually happens automatically on install, but can be run manually):
        ```bash
        npx prisma generate
        ```

4.  **Run the Server:**
    *   **Development (with auto-reload using nodemon):**
        ```bash
        npm run dev
        ```
    *   **Production:**
        ```bash
        npm run build
        npm start
        ```

## API Endpoints

API routes are defined in `src/routes/`. The base path is `/api/v1`. Key routes include:

*   `/api/v1/auth`: Authentication (login, register, etc.)
*   `/api/v1/posts`: Lost and Found post management
*   `/api/v1/users`: User profile management
*   `/api/v1/chats`: Chat functionality
*   `/api/v1/reports`: Reporting system
*   `/api/v1/notifications`: User notifications
*   `/api/v1/admin`: Administrative endpoints
*   `/api/v1/uploads`: File uploads
*   Static file serving for uploads (e.g., `/uploads/profiles/...`) 