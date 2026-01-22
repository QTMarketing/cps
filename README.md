# Check Printing System (CPS)

A comprehensive check printing and payment management system built with Next.js 14, TypeScript, Tailwind CSS, and Prisma with PostgreSQL.

## Features

- **User Management**: Multi-role user system (admin, manager, user)
- **Store Management**: Multi-store support
- **Bank Management**: Multiple bank accounts per store
- **Vendor Management**: Vendor information and categorization
- **Check Processing**: Complete check lifecycle management
- **Audit Logging**: Comprehensive activity tracking
- **Dark Theme**: Modern, professional interface

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **UI Components**: Custom components with Tailwind CSS

## Database Models

### User
- `id`: Unique identifier
- `username`: Unique username
- `email`: Unique email address
- `password`: Hashed password
- `role`: User role (admin, manager, user)
- `storeId`: Associated store

### Store
- `id`: Unique identifier
- `name`: Store name
- `address`: Store address
- `phone`: Contact phone number

### Bank
- `id`: Unique identifier
- `bankName`: Bank name
- `accountNumber`: Account number
- `routingNumber`: Routing number
- `storeId`: Associated store
- `balance`: Current balance

### Vendor
- `id`: Unique identifier
- `vendorName`: Vendor name
- `vendorType`: Type (Merchandise, Expense, Employee)
- `description`: Optional description
- `contact`: Contact information
- `storeId`: Associated store

### Check
- `id`: Unique identifier
- `checkNumber`: Unique check number
- `paymentMethod`: Payment method (Check, EDI, MO, Cash)
- `bankId`: Associated bank
- `vendorId`: Associated vendor
- `amount`: Check amount
- `memo`: Optional memo
- `status`: Status (Draft, Submitted, Approved, Printed, Reconciled)
- `issuedBy`: User who issued the check

### AuditLog
- `id`: Unique identifier
- `userId`: User who performed the action
- `action`: Action type (CREATE, UPDATE, DELETE, VIEW)
- `entityType`: Entity type (User, Store, Bank, Vendor, Check)
- `entityId`: ID of the affected entity
- `timestamp`: When the action occurred

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `GET /api/users/[id]` - Get user by ID
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

### Stores
- `GET /api/stores` - Get all stores
- `POST /api/stores` - Create store
- `GET /api/stores/[id]` - Get store by ID
- `PUT /api/stores/[id]` - Update store
- `DELETE /api/stores/[id]` - Delete store

### Banks
- `GET /api/banks` - Get all banks
- `POST /api/banks` - Create bank
- `GET /api/banks/[id]` - Get bank by ID
- `PUT /api/banks/[id]` - Update bank
- `DELETE /api/banks/[id]` - Delete bank

### Vendors
- `GET /api/vendors` - Get all vendors
- `POST /api/vendors` - Create vendor
- `GET /api/vendors/[id]` - Get vendor by ID
- `PUT /api/vendors/[id]` - Update vendor
- `DELETE /api/vendors/[id]` - Delete vendor

### Checks
- `GET /api/checks` - Get all checks
- `POST /api/checks` - Create check
- `GET /api/checks/[id]` - Get check by ID
- `PUT /api/checks/[id]` - Update check
- `DELETE /api/checks/[id]` - Delete check

### Audit Logs
- `GET /api/audit-logs` - Get all audit logs
- `POST /api/audit-logs` - Create audit log

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your database credentials:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/cps_database?schema=public"
   ```

3. **Set up the database**
   ```bash
   # Create the database (if it doesn't exist)
   createdb cps_database
   
   # Push the schema to the database
   npm run db:push
   
   # Or use migrations
   npm run db:migrate
   ```

4. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

### Database Setup Script

You can also use the provided setup script:

```bash
./setup-db.sh
```

This will:
- Create the `.env` file
- Generate the Prisma client
- Provide next steps for database setup

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Cheque PDF Generator

The cheque generator produces bank-ready PDFs with MICR encoding using `pdf-lib`.

### Prerequisites

- Place the MICR font file `micr-encoding.regular.ttf` in `public/fonts/` (already included in this repo).
- Signature images can be uploaded via the Signatures uploader (stored under `public/uploads/signatures`).

### API Usage

```
POST /api/cheque/print
Authorization: Bearer <auth-token>
Content-Type: application/json
```

Sample payload:

```json
{
  "bankName": "First National Bank",
  "dbaName": "QT Office DBA",
  "corporationName": "QuickTrack Inc.",
  "address": {
    "street": "123 Main Street",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90001"
  },
  "chequeNumber": "1050",
  "routingNumber": "123456789",
  "accountNumber": "987654321",
  "merchantNumber": "M-55421",
  "payeeName": "John Doe",
  "amount": 1523.75,
  "memo": "Invoice #4471",
  "date": "November 18, 2025",
  "signatureImageURL": "/uploads/signatures/6a2f3b5b-38a8-4651-9a94-0989fac78805.jpg"
}
```

The response is a PDF stream suitable for download or inline viewing.

### Cheque Test UI

- Navigate to `/admin/cheque-test` (SUPER_ADMIN only).
- Paste or edit the JSON payload.
- Click “Generate PDF” to download the cheque.
- Use “Reset Sample” to restore the default payload.

## QA Checklist

- [ ] Login/logout flows work for USER, ADMIN, SUPER_ADMIN roles.
- [ ] Sidebar links respect role visibility (e.g., cheque test only for SUPER_ADMIN).
- [ ] Write Checks page can create cheques and upload invoices; invoices appear in Reports/Recent Checks.
- [ ] `/api/cheque/print` returns a PDF with correct MICR line, signature, and formatted data.
- [ ] `/admin/cheque-test` successfully downloads PDFs for valid payloads and surfaces validation errors.
- [ ] MICR font file exists in `public/fonts/` so printed cheques have proper routing/account encoding.
- [ ] README instructions are sufficient for another developer to run migrations, upload invoices, and print cheques.

## Database Management

### Prisma Studio
To view and manage your database through a web interface:
```bash
npm run db:studio
```

### Migrations
To create and apply database migrations:
```bash
npm run db:migrate
```

### Schema Push
To push schema changes directly to the database:
```bash
npm run db:push
```

## Project Structure

```
src/
├── app/
│   ├── api/                 # API routes
│   │   ├── users/          # User CRUD operations
│   │   ├── stores/         # Store CRUD operations
│   │   ├── banks/          # Bank CRUD operations
│   │   ├── vendors/        # Vendor CRUD operations
│   │   ├── checks/         # Check CRUD operations
│   │   └── audit-logs/     # Audit log operations
│   ├── layout.tsx          # Root layout
│   ├── page.tsx           # Dashboard
│   └── [pages]/           # Application pages
├── components/
│   └── ui/                # UI components
├── lib/
│   ├── prisma.ts          # Prisma client
│   └── audit.ts           # Audit logging utilities
└── prisma/
    └── schema.prisma      # Database schema
```

## Usage

1. **Access the application**: http://localhost:3000
2. **Navigate using the sidebar**:
   - Write Checks
   - Reports
   - Add Vendor
   - Add User
   - Add Bank

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.