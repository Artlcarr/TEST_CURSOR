# TogetherUnite Architecture

## Overview

TogetherUnite is a citizen-powered advocacy platform built on AWS serverless architecture. It enables organizers to create email campaigns that advocates can personalize and send to government representatives.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                    (Next.js/React)                           │
│              Hosted on S3 + CloudFront                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    API Gateway                               │
│              (REST API Endpoints)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌────▼──────┐
│   Campaigns  │ │    Auth     │ │ Payments  │
│   Lambda     │ │   Lambda    │ │  Lambda   │
└───────┬──────┘ └─────────────┘ └───────────┘
        │
        │
┌───────▼──────────────────────────────────────┐
│         RDS PostgreSQL Database              │
│  (Campaigns, Advocates, Actions, etc.)       │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│         Amazon SES (Email Sending)           │
│  └─> SNS Bounce Topic ─> Bounce Handler      │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│         Amazon Cognito (Authentication)      │
│  - Email/Password                            │
│  - Google OAuth                              │
│  - Microsoft OAuth (optional)                │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│         Stripe (Payments)                     │
│  - Validation Fees                           │
│  - Campaign Subscriptions                     │
│  - Pay-Per-Send                              │
│  - Donations                                 │
└──────────────────────────────────────────────┘
```

## Components

### Frontend (Next.js/React)

**Location**: `frontend/`

**Key Pages:**
- `/` - Homepage
- `/auth/signin` - Sign in
- `/auth/signup` - Sign up
- `/campaigns` - List campaigns
- `/campaigns/create` - Create campaign
- `/campaigns/[id]` - Campaign details
- `/campaigns/join/[id]` - Join campaign as advocate

**Components:**
- `GovernmentContactPicker` - Select government contacts

**Features:**
- AWS Amplify for authentication
- Stripe integration for payments
- QR code generation for campaigns
- Responsive design

### Backend (AWS Lambda)

#### Campaigns Lambda (`backend/campaigns/`)

**Endpoints:**
- `GET /campaigns` - List campaigns
- `GET /campaigns/{id}` - Get campaign details
- `POST /campaigns` - Create campaign
- `PUT /campaigns/{id}` - Update campaign
- `DELETE /campaigns/{id}` - Delete campaign

**Database Tables:**
- `campaigns` - Campaign information
- `advocates` - Advocate/user information
- `campaign_actions` - Email send records

#### Auth Lambda (`backend/auth/`)

**Endpoints:**
- `POST /auth` - Get user information

**Features:**
- Integrates with Cognito
- Manages advocate records

#### Payments Lambda (`backend/payments/`)

**Endpoints:**
- `POST /payments` - Create payment session
- `POST /payments/webhook` - Stripe webhook handler

**Payment Types:**
- Validation fee ($2.99)
- Campaign unlimited subscription ($29.99/month)
- Email send ($2.99 per send)
- Campaign reactivation ($29.99)
- Donation (4.5% + $0.50 fee)

#### Email Lambda (`backend/email/`)

**Endpoints:**
- `POST /email` - Send email via SES

**Features:**
- Personalizes email messages
- Enforces daily limits (1 email per advocate per day per campaign)
- Supports OAuth and SMTP sending
- Records actions in database

#### Bounce Handler Lambda (`backend/email/bounce-handler/`)

**Features:**
- Handles SES bounce notifications
- Removes invalid email addresses
- Notifies organizers of issues

### Infrastructure (AWS CDK)

**Location**: `infra/`

**Stack Components:**
1. **VPC** - Network isolation for RDS
2. **RDS PostgreSQL** - Database with secrets management
3. **Cognito** - User authentication and OAuth
4. **S3 + CloudFront** - Frontend hosting
5. **Lambda Functions** - Serverless compute
6. **API Gateway** - REST API
7. **SES** - Email sending with bounce tracking
8. **SNS** - Bounce notifications

## Data Model

### Campaigns Table
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  organizer_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  email_subject VARCHAR(255) NOT NULL,
  email_body TEXT NOT NULL,
  recipient_list JSONB NOT NULL,
  campaign_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  expires_at TIMESTAMP,
  qr_code_url TEXT,
  campaign_url TEXT,
  max_recipients INTEGER DEFAULT 200
);
```

### Advocates Table
```sql
CREATE TABLE advocates (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  validation_fee_paid BOOLEAN DEFAULT FALSE,
  validation_expires_at TIMESTAMP,
  created_at TIMESTAMP
);
```

### Campaign Actions Table
```sql
CREATE TABLE campaign_actions (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  advocate_id UUID NOT NULL REFERENCES advocates(id),
  email_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  recipient_email VARCHAR(255),
  personalized_message TEXT,
  created_at TIMESTAMP
);
```

## Security

### Authentication
- AWS Cognito for user management
- Email/password authentication
- Google OAuth integration
- JWT tokens for API access

### Authorization
- Campaign ownership validation
- Advocate validation checks
- Payment verification via Stripe webhooks

### Data Protection
- RDS encryption at rest
- Secrets Manager for credentials
- HTTPS for all communications
- VPC isolation for database

## Scalability

### Serverless Architecture
- Lambda auto-scaling
- RDS connection pooling
- CloudFront CDN caching
- S3 for static assets

### Limits
- 200 recipients per campaign
- 1 email per advocate per day per campaign
- Campaign duration: 365 days or 30 days dormant

## Monitoring

### CloudWatch
- Lambda function logs
- API Gateway logs
- RDS performance insights
- Custom metrics

### Alerts
- Lambda errors
- API Gateway 5xx errors
- RDS connection issues
- SES bounce rates

## Cost Optimization

### Development
- RDS t3.micro instance
- Lambda on-demand pricing
- CloudFront free tier
- S3 standard storage

### Production
- RDS reserved instances
- Lambda provisioned concurrency (if needed)
- CloudFront caching
- S3 lifecycle policies

## Future Enhancements

1. **OAuth Email Integration** - Gmail/Outlook API for direct sending
2. **Campaign Analytics** - Detailed tracking dashboard
3. **Email List Export** - Download opt-in emails
4. **Donation Features** - Enhanced donation flow
5. **Corporate Accounts** - B2B features
6. **Referral System** - Advocate and campaign referrals
7. **Advanced Analytics** - ML-powered insights
8. **Mobile App** - React Native application

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Development

### Local Development
```bash
# Install dependencies
npm install

# Start frontend dev server
cd frontend && npm run dev

# Deploy infrastructure
cd infra && cdk deploy
```

### Testing
- Unit tests for Lambda functions
- Integration tests for API endpoints
- E2E tests for frontend flows

## Support

For issues or questions, please refer to:
- [README.md](./README.md) - Project overview
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- AWS documentation for infrastructure components

