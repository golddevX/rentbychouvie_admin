# Rental Fashion Admin Dashboard

Staff dashboard for rental fashion operations. Written in Next.js with TypeScript and Tailwind CSS.

## 🏗️ Admin Features

### Lead Management (`/dashboard/leads`)
- View all leads with status (NEW, CONTACTED, QUOTED, WON, REJECTED)
- Create/edit leads
- Convert leads to bookings
- Assign to sales staff
- Track lead source & notes

### Booking Calendar (`/dashboard/bookings`)
- Calendar view of all bookings
- Check availability
- Create/edit bookings
- Block dates for maintenance

### Inventory Management (`/dashboard/inventory`)
- **QR Scanning** - Scan QR code to view item details
- Item list with status (AVAILABLE, RENTED, DAMAGED, RETIRED)
- Search/filter by product
- Item-level tracking

### Rental Workflow (`/dashboard/rentals`)
- **Pickup** - QR scan to start rental, record condition
- **Return** - QR scan to end rental, check condition, damage fee
- Active rentals list
- Rental history

### Payment Processing (`/dashboard/payments`)
- Pending payments list
- Multiple payment methods (CASH, CARD, STRIPE, MOMO)
- Payment processing
- Refund handling
- Receipt generation & printing

### Analytics & Reports (`/dashboard/reports`)
- Daily revenue
- Inventory status
- Rental analytics
- Lead conversion funnel
- Staff performance

## 🔐 RBAC Restricted Features

Based on user role:
- **SUPER_ADMIN**: All features
- **MANAGER**: Lead/booking/staff, reports
- **SALES**: Leads, booking creation
- **OPERATOR**: QR scanning, pickup/return
- **CASHIER**: Payment processing, receipts

## 📁 Architecture

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   └── dashboard/
│       ├── leads/
│       ├── bookings/
│       ├── inventory/
│       ├── rentals/
│       │   ├── pickup/
│       │   └── return/
│       ├── payments/
│       ├── reports/
│       ├── layout.tsx
│       └── page.tsx
├── components/
│   ├── Sidebar.tsx
│   └── ...
├── lib/
│   ├── api-client.ts
│   └── api.ts
├── store/
│   └── auth.store.ts
└── types/
```

## 🚀 Quick Start

```bash
cd admin

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Start dev server (port 3002)
npm run dev

# Build for production
npm build
npm start
```

## 🔑 Key Endpoints Used

All requires JWT auth header except login:

```
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/leads
GET    /api/leads/:id
PATCH  /api/leads/:id
POST   /api/leads/:id/convert-to-booking

GET    /api/bookings
GET    /api/bookings/:id
POST   /api/bookings

GET    /api/inventory/items
GET    /api/inventory/qr/:code (QR scan)
PATCH  /api/inventory/items/:id/status

GET    /api/rentals
POST   /api/rentals/:id/pickup (QR)
POST   /api/rentals/:id/return (QR)

GET    /api/payments
POST   /api/payments
PATCH  /api/payments/:id/process
PATCH  /api/payments/:id/refund
POST   /api/payments/:id/receipt

GET    /api/reports/*
GET    /api/users (staff mgmt)
```

## 🔌 State Management

Uses **Zustand** for auth state:

```typescript
import { useAuthStore } from '@/store/auth.store';

const { user, accessToken, login, logout } = useAuthStore();
```

## 🌐 Deployment (Render)

1. Push to GitHub
2. Connect repo to Render
3. Set environment variables: `NEXT_PUBLIC_API_URL`
4. Deploy

## 🛠️ Development Tips

### Update API calls
Edit `src/lib/api.ts` to add new endpoints

### Add new page
Create under `src/app/dashboard/feature/page.tsx`

### Protect routes
Check `useAuthStore` in page component:
```typescript
if (!user) {
  router.push('/login');
  return null;
}
```

## 📜 License

MIT
