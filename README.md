# CampusLove

CampusLove is a university-only dating MVP built from the provided tech-stack document.

## Tech stack

- Frontend: React.js, Vite, Tailwind CSS
- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Auth: JWT
- Uploads: Multer, Cloudinary-ready image storage
- Chat and notifications: Socket.io
- Email OTP: Nodemailer

## Included features

- Landing page
- Signup page
- Login page
- Upload ID page
- Email OTP verification
- Pending verification page
- Admin approval/rejection system
- Profile setup page
- Swipe page
- Match system
- Chat page with Socket.io real-time messages
- Seen/unseen message tracking on chat open
- Match-only chat
- Block user
- Report user
- Settings page
- Admin login page
- Admin dashboard
- Reports page
- Admin announcements
- User and admin notification system
- Email notification when admin approves or rejects a profile

## Important security behavior

- Users must be older than 18.
- Users cannot swipe, match, chat, call, report, or block until admin approval.
- New users start with `verificationStatus = "email-pending"` and `isVerified = false`.
- After OTP verification, users move to `verificationStatus = "pending"`.
- Admin approval sets `verificationStatus = "approved"` and `isVerified = true`.
- No one can become admin from the site. Create admins only from the database seed script.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`:

```bash
cp backend/.env.example backend/.env
```

3. Update `.env` with MongoDB, JWT, email, and Cloudinary values.

4. Create an admin:

```bash
npm run seed:admin -- admin@university.edu StrongPassword123
```

5. Start the project:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:8000`

## API map

- `POST /api/auth/register`
- `POST /api/auth/verify-otp`
- `POST /api/auth/login`
- `GET /api/users/me`
- `PUT /api/users/profile`
- `POST /api/swipe/like/:id`
- `POST /api/swipe/skip/:id`
- `GET /api/swipe/users`
- `GET /api/matches`
- `GET /api/messages/:matchId`
- `POST /api/messages/:matchId`
- `POST /api/report/:userId`
- `POST /api/block/:userId`
- `GET /api/admin/pending-users`
- `PUT /api/admin/approve/:id`
- `PUT /api/admin/reject/:id`
- `GET /api/admin/reports`
- `PUT /api/admin/reports/:id`
- `PUT /api/admin/block-user/:id`
- `POST /api/admin/announcements`
- `GET /api/notifications`

## Database collections

- `users`
- `likes`
- `matches`
- `messages`
- `reports`
- `notifications`
- `announcements`

## Notes for production

- Use HTTPS and secure cookies.
- Store uploaded ID cards in private Cloudinary folders or private object storage.
- Add rate limits to OTP, login, swipe, message, report, and upload endpoints.
- Add CSRF protection if cookie auth is used.
- Add moderation tools for profile photos, bio text, and chat messages.
- Complete WebRTC peer connection UI using the included Socket.io signaling events.
- Add database backups and admin audit logs.
