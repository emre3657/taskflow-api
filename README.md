# TaskFlow API

Backend REST API for TaskFlow. Built with Node.js, Express, and PostgreSQL, featuring JWT-based authentication and a secure todo management system.

## 🎯 Features

- **User Management**: Registration, login, profile updates, account deletion
- **Content Validation**: Email verification, password reset
- **Todo CRUD**: Create, read, update, delete operations
- **Priority Levels**: LOW, MEDIUM, HIGH
- **Completion Status**: Todo completion date and status tracking
- **Security**: Helmet, XSS sanitization, rate limiting, CORS
- **Authentication**: JWT access/refresh token system
- **Email Service**: Email sending via Resend

## 🛠️ Technologies

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT (jsonwebtoken)
- **Encryption**: bcryptjs
- **Validation**: Zod
- **Email**: Resend API
- **Security**: Helmet, express-xss-sanitizer, express-rate-limit
- **Development**: TypeScript, tsx

## 📋 Requirements

- Node.js (v18+)
- PostgreSQL (v12+)
- npm or yarn

## 🚀 Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file (refer to `.env.example`):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/taskflow

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your_secret_key_here
REFRESH_SECRET=your_refresh_secret_here

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
MAIL_FROM=noreply@taskflow.com

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173
```

### 3. Database Setup
```bash
# Run database migrations
npx prisma migrate deploy

# (Optional) View database with Prisma Studio
npx prisma studio
```

## 📦 Project Structure

```
src/
├── server.ts                    # Express app and middleware configuration
├── controllers/                 # Business logic and route handlers
│   ├── auth-controller.ts
│   ├── todo-controller.ts
│   └── user-controller.ts
├── services/                    # Database operations and business rules
│   ├── auth-service.ts
│   ├── todo-service.ts
│   ├── user-service.ts
│   ├── email-service.ts
│   └── todo-service-helpers.ts
├── routes/                      # API route definitions
│   ├── auth-route.ts
│   ├── todo-route.ts
│   └── user-route.ts
├── middleware/                  # Custom middleware
│   ├── authenticaton-middleware.ts
│   ├── error-handler-middleware.ts
│   └── not-found-middleware.ts
├── schemas/                     # Zod validation schemas
│   ├── auth-schema.ts
│   ├── todo-schema.ts
│   └── users-schema.ts
├── errors/                      # Custom error classes
│   ├── custom-api-error.ts
│   ├── bad-request-error.ts
│   ├── conflict-error.ts
│   ├── forbidden-error.ts
│   ├── not-found-error.ts
│   ├── unauthenticated-error.ts
│   └── index.ts
├── lib/                         # Configuration and utilities
│   └── prisma.ts               # Prisma client singleton
├── utils/                       # Helper functions
│   ├── jwt-util.ts
│   ├── hash-util.ts
│   └── day-util.ts
├── helpers/                     # Helper functions
│   └── cookie-helper.ts
└── @types/                      # TypeScript type definitions
    └── express/
        └── index.d.ts           # Express global types
```

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/logout-all` - Logout from all devices
- `POST /api/v1/auth/forgot-password` - Initiate password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `POST /api/v1/auth/verify-email/confirm` - Verify email

### Todos
- `GET /api/v1/todos` - List all todos (authentication required)
- `POST /api/v1/todos` - Create new todo
- `GET /api/v1/todos/:id` - Get specific todo
- `PATCH /api/v1/todos/:id` - Update todo
- `DELETE /api/v1/todos/:id` - Delete todo

### User
- `GET /api/v1/users/profile` - Get profile info (authentication required)
- `PATCH /api/v1/users/profile` - Update profile
- `DELETE /api/v1/users/account` - Delete account

## 📊 Database Şeması

### User
```prisma
- id: UUID (primary key)
- username: String (unique)
- email: String (unique)
- passwordHash: String
- emailVerifiedAt: DateTime?
- createdAt: DateTime
- updatedAt: DateTime
```

### Todo
```prisma
- id: UUID (primary key)
- userId: UUID (foreign key)
- title: String
- description: String?
- priority: TodoPriority (LOW, MEDIUM, HIGH)
- completed: Boolean
- dueDate: DateTime?
- completedAt: DateTime?
- createdAt: DateTime
- updatedAt: DateTime
- Indexes: userId, completed, priority, dueDate
```

### RefreshToken
```prisma
- id: UUID (primary key)
- userId: UUID (foreign key)
- tokenHash: String (unique)
- expiresAt: DateTime
- revokedAt: DateTime?
- createdAt: DateTime
```

### PasswordResetToken
```prisma
- id: UUID (primary key)
- userId: UUID (foreign key)
- tokenHash: String (unique)
- expiresAt: DateTime
- createdAt: DateTime
```

### EmailVerificationToken
```prisma
- id: UUID (primary key)
- userId: UUID (foreign key)
- tokenHash: String (unique)
- expiresAt: DateTime
- createdAt: DateTime
```

## 🔒 Security Features

- **JWT Tokens**: Access token (15m) and refresh token (7d)
- **Password Hashing**: Passwords hashed using bcryptjs
- **Rate Limiting**: Limits on login and form submissions
- **CORS**: Restricted access to frontend URL
- **Helmet**: HTTP security headers
- **XSS Sanitization**: Input sanitization
- **Cookie Security**: HttpOnly, Secure, SameSite flags

## 📝 Validation

Input validation using Zod. All schemas are in `src/schemas/`:

- `auth-schema.ts` - Registration and login schemas
- `todo-schema.ts` - Todo create and update schemas
- `users-schema.ts` - User profile schemas

## 🚀 Development

### Run in Development Mode
```bash
npm run dev
```

Server starts at `http://localhost:3000`.

### Production Build
```bash
npm run build
```

### Run in Production
```bash
npm start
```

## 🔄 Migration Commands

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Deploy migrations
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Add seed data (requires seed file)
npx prisma db seed
```

## 📮 Email Service

Email sending via [Resend](https://resend.com):

- **Registration Email**: Email verification link
- **Password Reset**: Reset link
- **Welcome Email**: After successful registration

Email templates are managed via [Resend Dashboard](https://app.resend.com).

## 🐛 Error Handling

Consistent error responses using custom error classes:

```json
{
  "message": "Error message",
  "statusCode": 400
}
```

Error types:
- `BadRequestError` (400)
- `ConflictError` (409)
- `NotFoundError` (404)
- `ForbiddenError` (403)
- `UnauthenticatedError` (401)

## 📚 Useful Resources

- [Express.js Documentation](https://expressjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [JWT Introduction](https://jwt.io/introduction)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)

## 📄 License

ISC

## 👨‍💻 Developer

Emre
