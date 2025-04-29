# CMUFinds - Lost and Found System

This repository contains the source code for the CMUFinds web application, a platform designed to help the City of Malabon University community find lost items and return found ones.

This is a monorepo containing both the frontend and backend applications.

## Project Structure

*   `cmufinds-backend/`: Contains the Node.js/Express/Prisma backend API. See the [Backend README](./cmufinds-backend/README.md) for details on setup and running.
*   `cmufinds-frontend/`: Contains the Next.js frontend application. See the [Frontend README](./cmufinds-frontend/README.md) for details on setup and running.

## Getting Started

To run the complete application locally, you will generally need to:

1.  Set up the [backend](./cmufinds-backend#setup-and-running) (install dependencies, configure `.env`, run migrations, start server).
2.  Set up the [frontend](./cmufinds-frontend#setup-and-running) (install dependencies, configure `.env.local`, start development server).

Refer to the individual README files linked above for specific instructions.

## License

This project is licensed under the terms of the GNU General Public License v3.0. See the [LICENSE](./LICENSE) file for details. 