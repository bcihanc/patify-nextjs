# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Patify" - a Next.js application built with Supabase authentication, using the App Router architecture. It's based on the Next.js + Supabase starter template but customized for Patify's specific needs including Apple Sign-In integration.

## Development Commands

### Core Development Workflow
- `npm run dev` - Start development server with Turbopack for faster builds
- `npm run build` - Build production application
- `npm start` - Start production server

### Environment Setup
Environment variables are required for Supabase integration:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase project's anonymous key
- `PUBLIC_URL` - Your app's public URL (for OAuth redirects)

Copy `.env.example` to `.env.local` if available, or create `.env.local` with the required variables.

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Authentication**: Supabase Auth with cookie-based sessions
- **Styling**: Tailwind CSS + shadcn/ui components
- **OAuth Providers**: Apple Sign-In (configured)
- **Font**: Geist font family
- **Theme**: next-themes for dark/light mode switching

### Project Structure

#### Authentication Flow
- Cookie-based authentication using `@supabase/ssr`
- Server-side auth client: `lib/supabase/server.ts`
- Client-side auth client: `lib/supabase/client.ts`
- Middleware handles session refresh: `middleware.ts`
- Auth actions in `app/actions.ts` (sign up, sign in, sign out, password reset, Apple OAuth)

#### Route Structure
- `/` - Landing page
- `/auth/login` - Login page
- `/auth/error` - Auth error handling
- `/home` - Protected home page (requires authentication)
- `/home/reset-password` - Password reset form
- `/protected` - Example protected route
- Support pages: `/cr` (Copyright), `/pp` (Privacy Policy), `/csae` (CSAE)

#### Component Architecture
- `components/ui/` - shadcn/ui components (Button, Input, Card, etc.)
- `components/` - Custom app components (HeaderAuth, LoginForm, etc.)
- `components/tutorial/` - Tutorial/onboarding components
- Layout uses app/layout.tsx for global structure with navigation

#### Authentication Components
- `HeaderAuth` - Navigation auth state display
- `LoginForm` - Email/password login form
- `SubmitButton` - Form submission with loading states
- `LogoutButton` - Sign out functionality

### Apple Sign-In Configuration
Apple OAuth is configured with:
- Client ID: `com.bcc.buschat.web`
- Redirect URI: `https://api.patify.net/auth/v1/callback`
- Scopes: name, email
- Meta tags configured in app/layout.tsx head section

### Supabase Integration
- Database types: `database.types.ts`
- Environment variable validation: `utils/supabase/check-env-vars.ts`
- Three client configurations for different contexts:
  - Server Components: `lib/supabase/server.ts`
  - Client Components: `lib/supabase/client.ts`
  - Middleware: `lib/supabase/middleware.ts`

### UI System
- Uses shadcn/ui with default style configuration
- Components configured in `components.json`
- Tailwind config in `tailwind.config.ts`
- Global styles in `app/globals.css`
- Responsive design with mobile-first approach

## Development Patterns

### Server Actions
All authentication logic uses Server Actions in `app/actions.ts`:
- Form validation and error handling
- Supabase client calls on server-side
- Redirect handling with encoded messages
- Apple OAuth flow initiation

### Error Handling
- `encodedRedirect()` utility for error/success messages in URLs
- Client-side error boundary at `/auth/error`
- Form validation with user-friendly messages

### Protected Routes
- Middleware checks authentication for all routes except static assets
- Protected pages should check user session and redirect if needed
- Use `createClient()` from appropriate context (server/client)

### Styling Conventions
- Use Tailwind CSS classes
- shadcn/ui components for consistent design
- CSS variables for theming (defined in globals.css)
- Responsive design with mobile-first approach

## Key Files to Understand

- `app/layout.tsx` - Root layout with navigation and Apple Sign-In meta tags
- `app/actions.ts` - All authentication server actions
- `lib/supabase/` - Supabase client configurations for different contexts
- `middleware.ts` - Session management and route protection
- `components/header-auth.tsx` - Authentication state in navigation
- `utils/supabase/check-env-vars.ts` - Environment validation

## Deployment Notes

- Requires Supabase project with proper OAuth configuration
- Apple Sign-In requires proper domain configuration and certificates
- Environment variables must be set in production environment
- Uses Vercel deployment patterns (can be deployed via Vercel button)