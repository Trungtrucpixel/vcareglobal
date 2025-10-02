# Overview

This is a comprehensive business management application for "Phúc An Đường" (appears to be a Vietnamese business), built as a full-stack web application. The system provides a multi-role dashboard for managing cards/benefits, branches with KPIs, staff equity tracking, cash flow monitoring, and system administration. It features role-based access control with support for admin, staff, customer, branch, and shareholder roles.

# User Preferences

Preferred communication style: Simple, everyday language.
Testing approach: Skip full automated UI tests, check basic functionality only to save resource costs.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite for build tooling and development
- **UI Library**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Styling**: Tailwind CSS with custom design tokens and Bootstrap integration for additional components

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy, using express-session for session management
- **Password Security**: Node.js crypto module with scrypt for password hashing
- **API Design**: RESTful endpoints with proper HTTP status codes and error handling
- **Middleware**: Custom logging middleware for API request monitoring

## Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless database hosting
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Session Store**: PostgreSQL-backed session storage using connect-pg-simple
- **Schema Management**: Drizzle Kit for database migrations and schema synchronization

### Recent Database Enhancements (January 2025)
- **PAD Token System**: Added `pad_token` field to users table (100 PAD = 1 triệu VNĐ) for digital asset tracking
- **Multi-Role Support**: New `roles` and `user_roles` tables enabling users to have multiple roles simultaneously (Sáng lập, Thiên thần, Phát triển, Đồng hành, Khách hàng, Góp tài sản, Sweat Equity)
- **Asset Contributions**: New `asset_contributions` table for tracking non-cash investments with valuation, PAD tokens, and contract documents
- **Enhanced Transactions**: Added `contribution_type` (cash/asset/effort/card) and `pad_token_amount` fields to transactions table
- **Profit Distribution Types**: Enhanced `profit_distribution` with `distribution_type` to differentiate between capital-based (30%) and labor-based (19%) profit sharing

## Authentication and Authorization
- **Strategy**: Session-based authentication with Passport.js local strategy
- **Password Security**: Salted and hashed passwords using Node.js scrypt
- **Role-Based Access**: Multi-role system (admin, staff, customer, branch, shareholder)
- **Session Management**: Express-session with PostgreSQL store for persistent sessions
- **Route Protection**: Custom protected route components for frontend authorization

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **WebSocket Support**: Real-time database connections using ws library

### UI and Styling
- **Radix UI**: Comprehensive primitive components for accessible UI elements
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Bootstrap**: Additional component styling and icons
- **Lucide React**: Icon library for consistent iconography
- **React Icons**: Additional icon sets including Bootstrap icons

### Development and Build Tools
- **Vite**: Modern build tool with HMR and optimized production builds
- **TypeScript**: Static type checking across the entire application
- **ESBuild**: Fast JavaScript bundler for server-side code
- **PostCSS**: CSS processing with Autoprefixer for vendor prefixes

### Third-Party Libraries
- **Chart.js**: Data visualization for dashboard analytics and KPI charts
- **Date-fns**: Date manipulation and formatting utilities
- **Zod**: Runtime type validation for forms and API data
- **Class Variance Authority**: Type-safe CSS class composition
- **CMDK**: Command palette component for enhanced user interaction

### Development Environment
- **Replit Integration**: Custom Vite plugins for Replit development environment
- **Error Handling**: Runtime error overlay for development debugging
- **Hot Module Replacement**: Fast development iteration with Vite HMR