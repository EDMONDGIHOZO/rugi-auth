# React Dashboard Development Prompt

## Project Overview

Build a modern, responsive React-based admin dashboard for managing a centralized authentication service. The dashboard should provide comprehensive management interfaces for applications, users, roles, and audit logs.

## Tech Stack Requirements

- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (https://ui.shadcn.com/)
- **State Management**: React Query (TanStack Query) for server state
- **Routing**: React Router v6
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios or fetch API
- **Date Handling**: date-fns or dayjs
- **Icons**: lucide-react (comes with shadcn/ui)

## API Backend Details

### Base URL

The backend API is available at `http://localhost:3000` (or configurable via environment variable).

### Authentication

- All admin endpoints require JWT Bearer token authentication
- Token is obtained via `POST /login` endpoint
- Token should be stored securely and included in `Authorization: Bearer <token>` header
- Token refresh via `POST /refresh` endpoint

### Available Endpoints

#### Authentication

- `POST /register` - Register new user
- `POST /login` - Login and get tokens
  - Body: `{ email, password, client_id, client_secret? }`
  - Returns: `{ access_token, refresh_token, token_type, expires_in }`
- `POST /refresh` - Refresh access token
- `POST /revoke` - Revoke refresh token
- `GET /me` - Get current user info (requires auth)

#### Applications Management

- `POST /apps` - Create new application
  - Body: `{ name, type: "PUBLIC" | "CONFIDENTIAL", redirect_uris: string[] }`
  - Returns: `{ message, app: { id, name, client_id, client_secret, type, redirect_uris, created_at } }`
- `POST /apps/:appId/roles` - Create/verify role for app
  - Body: `{ role_name: string }`

**Note**: The following endpoints need to be implemented in the backend for full dashboard functionality:

- `GET /apps` - List all applications (with pagination)
- `GET /apps/:appId` - Get application details
- `GET /apps/:appId/users` - Get users with roles for an app
- `PUT /apps/:appId` - Update application
- `DELETE /apps/:appId` - Delete application

#### Users Management

- `POST /users/:userId/roles` - Assign role to user
  - Body: `{ app_id, role_name }`
  - Returns: `{ message, userAppRole: { id, user, app, role, assigned_at } }`

**Note**: The following endpoints need to be implemented in the backend:

- `GET /users` - List all users (with pagination, search, filters)
- `GET /users/:userId` - Get user details with roles across all apps
- `GET /users/:userId/roles` - Get all roles for a user
- `PUT /users/:userId` - Update user (email, verification status, MFA)
- `DELETE /users/:userId` - Delete user
- `DELETE /users/:userId/roles/:roleId` - Remove role from user

#### Audit Logs

- `GET /audit` - List audit logs
  - Query params: `user_id?`, `action?`, `page?`, `limit?`, `start_date?`, `end_date?`
  - Actions: `LOGIN`, `REFRESH`, `REVOKE`, `ROLE_ASSIGN`, `REGISTER`
  - Returns: `{ data: AuditLog[], pagination: { page, limit, total, totalPages } }`

## Dashboard Features & Pages

### 1. Authentication & Layout

- **Login Page**: Email/password form with client credentials
- **Protected Routes**: All dashboard routes require authentication
- **Sidebar Navigation**: Collapsible sidebar with navigation items
- **Header**: User profile dropdown, logout, notifications
- **Layout**: Responsive layout that works on mobile, tablet, desktop

### 2. Dashboard Home

- **Overview Cards**:
  - Total Users
  - Total Applications
  - Active Sessions (refresh tokens)
  - Recent Audit Events (last 24h)
- **Charts** (using recharts or similar):
  - User registrations over time (line chart)
  - Login activity by day (bar chart)
  - App usage distribution (pie chart)
- **Recent Activity**: Table of latest audit logs
- **Quick Actions**: Create app, create user, view audit logs

### 3. Applications Management (`/apps`)

- **Applications List Page**:
  - Data table with columns: Name, Client ID, Type, Redirect URIs, Created At, Actions
  - Search/filter by name, type
  - Pagination
  - Actions: View, Edit, Delete, Manage Roles
  - "Create App" button
- **Create/Edit Application Form**:
  - Name (text input)
  - Type (radio/select: PUBLIC or CONFIDENTIAL)
  - Redirect URIs (multi-input field, add/remove dynamically)
  - Client Secret display (only on create, with copy button and warning)
  - Validation with error messages
- **Application Detail Page** (`/apps/:id`):
  - Application info card
  - Users with roles table (showing which users have which roles)
  - Roles management section
  - Refresh tokens list (active sessions)
  - Audit logs filtered by app

### 4. Users Management (`/users`)

- **Users List Page**:
  - Data table with columns: Email, Verified, MFA Enabled, Roles Count, Created At, Actions
  - Search by email
  - Filter by verification status, MFA status
  - Pagination
  - Actions: View, Edit, Delete, Manage Roles
  - "Create User" button
- **Create/Edit User Form**:
  - Email (text input)
  - Password (password input, required on create only)
  - Email Verified (checkbox)
  - MFA Enabled (checkbox, read-only if not enabled)
  - Validation with error messages
- **User Detail Page** (`/users/:id`):
  - User info card
  - Roles by App table (showing apps and roles for each)
  - Assign Role form (select app, select/create role)
  - Remove role action
  - Active sessions (refresh tokens)
  - Audit logs filtered by user

### 5. Roles Management (`/roles`)

- **Roles List Page**:
  - Table showing all roles across the system
  - Usage count (how many users have this role)
  - Actions: View usage, Delete (if unused)
- **Role Usage Details**:
  - Show which users have this role in which apps
  - Filter by app

### 6. Audit Logs (`/audit`)

- **Audit Logs List Page**:
  - Data table with columns: Timestamp, User, Action, Metadata, Details
  - Filters:
    - User (autocomplete/search)
    - Action (multi-select dropdown)
    - Date range (date picker)
  - Pagination
  - Export to CSV/JSON option
  - Real-time updates (optional: polling or WebSocket)

### 7. Settings (`/settings`)

- **Profile Settings**: Update current user profile
- **API Configuration**: Display API base URL, token expiry info
- **Security Settings**: Change password, MFA setup

## UI/UX Requirements

### Design System

- Use shadcn/ui components as base
- Consistent color scheme (default shadcn theme or custom)
- Dark mode support (optional but recommended)
- Responsive design (mobile-first approach)
- Loading states for all async operations
- Error states with helpful messages
- Empty states with illustrations/guidance

### Component Requirements

- **Data Tables**: Sortable, filterable, paginated tables using shadcn/ui Table component
- **Forms**: All forms should use React Hook Form with Zod validation
- **Modals/Dialogs**: Use shadcn/ui Dialog for create/edit forms
- **Toast Notifications**: Use shadcn/ui Toast for success/error messages
- **Confirmations**: Use shadcn/ui AlertDialog for delete confirmations
- **Date Pickers**: Use shadcn/ui Calendar component for date selection
- **Select/Dropdown**: Use shadcn/ui Select for dropdowns
- **Badges**: Use shadcn/ui Badge for status indicators (Verified, MFA, App Type)

### Key Interactions

- Copy to clipboard functionality for client IDs, secrets, tokens
- Inline editing where appropriate
- Bulk actions (select multiple items)
- Keyboard shortcuts for common actions
- Smooth transitions and animations

## Data Models Reference

### User

```typescript
{
  id: string;
  email: string;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
}
```

### App

```typescript
{
  id: string;
  name: string;
  client_id: string;
  client_secret?: string; // Only on create
  type: "PUBLIC" | "CONFIDENTIAL";
  redirect_uris: string[];
  created_at: string;
}
```

### Role

```typescript
{
  id: number;
  name: string;
}
```

### UserAppRole

```typescript
{
  id: string;
  user: { id: string; email: string };
  app: { id: string; name: string; clientId: string };
  role: { id: number; name: string };
  assigned_at: string;
  assigned_by?: string;
}
```

### AuditLog

```typescript
{
  id: string;
  userId?: string;
  user?: { id: string; email: string };
  action: "LOGIN" | "REFRESH" | "REVOKE" | "ROLE_ASSIGN" | "REGISTER";
  metadata?: Record<string, any>;
  createdAt: string;
}
```

### RefreshToken

```typescript
{
  token: string;
  userId: string;
  appId: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  deviceInfo?: Record<string, any>;
}
```

## Implementation Guidelines

### Project Structure

```
src/
  components/
    ui/              # shadcn/ui components
    layout/          # Layout components (Sidebar, Header, etc.)
    features/        # Feature-specific components
      apps/
      users/
      audit/
  pages/             # Page components
  hooks/             # Custom React hooks
  lib/               # Utilities, API client, constants
  types/             # TypeScript types
  store/             # State management (if needed)
  utils/             # Helper functions
```

### API Client Setup

- Create an axios instance with interceptors for:
  - Adding auth token to requests
  - Refreshing token on 401
  - Error handling
- Use React Query for data fetching, caching, and mutations
- Implement optimistic updates where appropriate

### Error Handling

- Global error boundary
- API error handling with user-friendly messages
- Network error handling
- Form validation errors

### Performance

- Code splitting for routes
- Lazy loading for heavy components
- Optimistic updates for better UX
- Debounced search inputs
- Virtual scrolling for large lists (optional)

## Additional Features (Nice to Have)

1. **Real-time Updates**: WebSocket connection for live audit logs
2. **Export Functionality**: Export tables to CSV/Excel
3. **Advanced Filtering**: Save filter presets
4. **Bulk Operations**: Bulk assign roles, bulk delete
5. **Activity Feed**: Real-time activity feed on dashboard
6. **Analytics**: More detailed charts and analytics
7. **User Impersonation**: Admin can login as another user (if backend supports)
8. **API Key Management**: Generate and manage API keys for dashboard access
9. **Backup/Restore**: Export/import configuration
10. **Multi-language Support**: i18n support

## Getting Started Checklist

1. Set up React + TypeScript project (Vite recommended)
2. Install and configure Tailwind CSS
3. Install and configure shadcn/ui
4. Set up React Router
5. Set up React Query
6. Create API client with authentication
7. Implement authentication flow (login, token management)
8. Create layout components (Sidebar, Header)
9. Implement protected routes
10. Build each feature page incrementally
11. Add error handling and loading states
12. Polish UI/UX and add animations
13. Test responsive design
14. Add dark mode (optional)

## Environment Variables

Create `.env` file:

```
VITE_API_BASE_URL=http://localhost:3000
VITE_DASHBOARD_CLIENT_ID=<client_id_for_dashboard>
VITE_DASHBOARD_CLIENT_SECRET=<client_secret_for_dashboard>
```

## Notes

- The backend may need additional endpoints for full dashboard functionality (GET /apps, GET /users, etc.)
- Client credentials for the dashboard itself should be created via the backend API
- All sensitive data (client secrets, tokens) should be handled securely
- Consider implementing rate limiting on the frontend for API calls
- Add proper TypeScript types for all API responses
- Use React Query's cache invalidation strategically after mutations
