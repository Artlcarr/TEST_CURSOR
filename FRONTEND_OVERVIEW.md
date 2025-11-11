# TogetherUnite Frontend Overview

This document describes what your frontend application looks like and how users interact with it.

## Design & Styling

### Color Scheme

- **Primary Color**: Blue (#0070f3) - Used for buttons and accents
- **Secondary Color**: Light gray (#f0f0f0) - Used for secondary buttons
- **Background**: White with subtle shadows on cards
- **Text**: Dark gray (#333) for headings, lighter gray (#666) for body text

### Typography

- **Font Family**: System fonts (San Francisco, Segoe UI, Roboto, etc.)
- **Headings**: Bold, larger sizes (48px for main hero, 36px for sections)
- **Body Text**: 16px, regular weight

### Layout

- **Container**: Max width 1200px, centered
- **Cards**: White background, rounded corners (8px), subtle shadow
- **Forms**: Clean, spacious inputs with proper labels
- **Buttons**: Rounded corners (6px), hover effects

## Pages & Features

### 1. Homepage (`/`)

**Layout:**

- **Header**: Blue gradient background with white text
  - Logo/Title: "TogetherUnite"
  - Tagline: "Transform one voice into thousands"
  - Auth buttons (Sign In/Sign Up) or user welcome message

**Main Content:**

- **Hero Section**: Centered text explaining the platform

  - Heading: "Citizen-Powered Advocacy"
  - Description of the service

- **Action Cards** (shown when logged in):

  - "Create Campaign" - Link to campaign creation
  - "My Campaigns" - Link to campaign list
  - "Join Campaign" - Link to join a campaign

- **Features Section**: "How It Works"
  - 4 cards in a grid:
    1. Create Campaign
    2. Share & Invite
    3. Advocates Join
    4. Email Delivery

**Visual Elements:**

- Blue gradient header
- White cards with shadows
- Hover effects on clickable cards
- Responsive grid layout

---

### 2. Sign In Page (`/auth/signin`)

**Layout:**

- Centered form (max width 400px)
- Clean, minimal design

**Form Fields:**

- Email input
- Password input
- Sign In button (blue, full width)
- Link to Sign Up page

**Features:**

- Error messages displayed in red
- Loading state during sign in
- Redirects to home or specified redirect URL after sign in

---

### 3. Sign Up Page (`/auth/signup`)

**Layout:**

- Centered form (max width 400px)
- Two-step process: Sign Up → Email Confirmation

**Step 1: Sign Up Form**

- Email input
- Password input (with validation requirements)
- Confirm Password input
- Sign Up button
- Link to Sign In page

**Step 2: Email Confirmation**

- Confirmation code input
- Confirm button
- Instructions to check email

**Features:**

- Password validation (minimum 8 characters, uppercase, lowercase, number, symbol)
- Error messages
- Loading states
- Email verification flow

---

### 4. Campaigns List (`/campaigns`)

**Layout:**

- Header with "My Campaigns" title
- "Create Campaign" button (top right)
- Grid of campaign cards

**Campaign Card:**

- Campaign title
- Campaign type (Pay-Per-Send or Unlimited)
- Status (active, archived, etc.)
- Expiration date (if applicable)
- Created date
- Clickable to view campaign details

**Empty State:**

- Message: "You haven't created any campaigns yet."
- "Create Your First Campaign" button

---

### 5. Create Campaign (`/campaigns/create`)

**Layout:**

- Centered form (max width 800px)
- Multi-section form

**Form Sections:**

1. **Campaign Title**

   - Text input
   - Placeholder: "e.g., Support Climate Action Bill"

2. **Email Subject**

   - Text input
   - Placeholder: "e.g., Support Climate Action Bill"

3. **Email Body**

   - Large textarea
   - Placeholder: "Write your email message here..."
   - Multi-line text input

4. **Campaign Type**

   - Dropdown select
   - Options:
     - "Pay-Per-Send ($2.99 per email)"
     - "Unlimited ($29.99/month)"

5. **Recipients** (Government Contact Picker)

   - Add Recipient button
   - Browse Directory button (placeholder)
   - Recipient list with remove buttons
   - Counter: "X / 200 recipients"
   - Sample contacts from directory

6. **Submit Button**
   - "Create Campaign" button (blue, full width)
   - Disabled if no recipients selected
   - Loading state during creation

**Government Contact Picker:**

- Add recipient form (name + email)
- Sample directory contacts (US Congress, State Governors)
- Recipient list with remove functionality
- Maximum 200 recipients validation

---

### 6. Campaign Details (`/campaigns/[id]`)

**Layout:**

- Campaign title as heading
- Multiple information cards

**Cards:**

1. **Campaign Details**

   - Campaign type
   - Status
   - Expiration date (if applicable)

2. **Share Campaign**

   - Campaign URL (read-only input)
   - "Copy Link" button
   - QR Code display (256x256 pixels)
   - "Download QR Code" link

3. **Email Preview**

   - Email subject
   - Email body (formatted preview)

4. **Recipients**
   - Number of recipients
   - Recipient list (if displayed)

---

### 7. Join Campaign (`/campaigns/join/[id]`)

**Layout:**

- Campaign title as heading
- Multiple sections for review and action

**Sections:**

1. **Review & Personalize**

   - Email subject (read-only)
   - Email body (editable textarea)
   - Users can personalize the message

2. **Select Recipients**

   - List of all recipients
   - Checkboxes to select/deselect recipients
   - Visual feedback (blue background when selected)
   - Recipient name and email displayed

3. **Send Email**
   - Cost information (if pay-per-send): "$2.99 per email send"
   - "Send Email" button (blue, full width)
   - Disabled if no recipients selected
   - Loading state during sending

**Features:**

- Requires authentication (redirects to sign in if not logged in)
- Stripe payment integration for pay-per-send campaigns
- Email sending functionality
- Success/error messages

---

## User Flow

### For Organizers:

1. **Sign Up** → Create account
2. **Sign In** → Access dashboard
3. **Create Campaign** → Fill out campaign form
   - Add title, subject, body
   - Select campaign type
   - Add recipients (up to 200)
4. **View Campaign** → See campaign details
   - Get campaign URL
   - Get QR code
   - Share with advocates
5. **Manage Campaigns** → View all campaigns
   - See campaign status
   - View campaign details

### For Advocates:

1. **Receive Campaign Link** → Click shared link or scan QR code
2. **Sign In/Sign Up** → Create account (if needed)
3. **Join Campaign** → View campaign details
   - Review email content
   - Personalize message (optional)
   - Select recipients
4. **Pay (if pay-per-send)** → Complete Stripe payment
5. **Send Email** → Emails sent to selected recipients

---

## Components

### Government Contact Picker

- **Purpose**: Add government officials as recipients
- **Features**:
  - Add recipient manually (name + email)
  - Browse directory (placeholder for future implementation)
  - Sample contacts from directory
  - Remove recipients
  - Maximum 200 recipients validation

### QR Code Generator

- **Library**: qrcode.react
- **Usage**: Generate QR codes for campaign sharing
- **Size**: 256x256 pixels
- **Download**: Available as PNG

---

## Responsive Design

- **Desktop**: Full width layouts, grid layouts for cards
- **Tablet**: Adjusted grid columns, maintained spacing
- **Mobile**: Stacked layouts, full-width buttons, responsive text

---

## Interactive Elements

### Buttons

- **Primary**: Blue background, white text
- **Secondary**: Light gray background, dark text
- **Hover Effects**: Darker shade, slight lift
- **Disabled State**: Grayed out, not clickable

### Forms

- **Inputs**: White background, gray border, rounded corners
- **Focus State**: Blue border
- **Error State**: Red text for error messages
- **Loading State**: Disabled inputs, loading text on buttons

### Cards

- **Hover Effect**: Slight lift (translateY), increased shadow
- **Clickable**: Cursor pointer, visual feedback

---

## Authentication Flow

1. **Sign Up**:

   - User enters email and password
   - Password validation (8+ chars, uppercase, lowercase, number, symbol)
   - Email verification code sent
   - User enters confirmation code
   - Account created

2. **Sign In**:

   - User enters email and password
   - AWS Cognito authentication
   - Session created
   - Redirect to home or specified URL

3. **Sign Out**:
   - Button in header (when logged in)
   - Clears session
   - Redirects to home

---

## Payment Integration

### Stripe Integration

- **Library**: @stripe/stripe-js
- **Usage**: Pay-per-send campaigns
- **Flow**:
  1. User clicks "Send Email"
  2. Stripe checkout session created
  3. User redirected to Stripe checkout
  4. Payment completed
  5. User redirected back
  6. Email sent

---

## Current Limitations

1. **OAuth Email Integration**: Not yet implemented (uses SMTP)
2. **Government Directory**: Placeholder (sample contacts only)
3. **Campaign Analytics**: Not yet implemented
4. **Email List Export**: Not yet implemented
5. **Advanced Styling**: Basic styling, could be enhanced
6. **Mobile Optimization**: Basic responsive design, could be improved

---

## Future Enhancements

1. **Enhanced UI/UX**:

   - Better color scheme and branding
   - Improved typography
   - More animations and transitions
   - Better loading states
   - Skeleton screens

2. **Additional Features**:

   - Campaign analytics dashboard
   - Email templates
   - Campaign scheduling
   - Advanced recipient filtering
   - Campaign performance metrics

3. **Mobile App**:
   - Native mobile application
   - Push notifications
   - Offline support

---

## Technical Stack

- **Framework**: Next.js 14
- **UI Library**: React 18
- **Styling**: CSS Modules + Global CSS
- **Authentication**: AWS Amplify
- **Payments**: Stripe
- **QR Codes**: qrcode.react
- **HTTP Client**: Axios

---

## Screenshots Description

### Homepage

- Blue gradient header with "TogetherUnite" branding
- Hero section with platform description
- Action cards for logged-in users
- "How It Works" feature grid

### Create Campaign

- Clean form layout
- Government contact picker
- Recipient management
- Campaign type selection

### Campaign Details

- Campaign information cards
- QR code display
- Shareable link
- Email preview

### Join Campaign

- Email personalization
- Recipient selection
- Payment information (if applicable)
- Send button

---

## Summary

Your frontend is a clean, functional web application with:

- Modern, minimalist design
- Clear user flows
- Responsive layout
- Authentication integration
- Payment processing
- Campaign management
- Email personalization

The design is focused on usability and functionality, with room for future enhancements in styling and features.
