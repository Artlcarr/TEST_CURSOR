# TogetherUnite

A citizen-powered advocacy platform that transforms one voice into thousands. Enables organizers to launch shareable email campaigns that supporters (Advocates) can personalize and send directly to government representatives.

## Architecture

- **Frontend**: React/Next.js hosted on S3 + CloudFront
- **Backend**: AWS Lambda + API Gateway (Serverless)
- **Database**: PostgreSQL on RDS
- **Auth**: Amazon Cognito (Email + Google/Microsoft OAuth)
- **Email**: Amazon SES (SMTP) with bounce tracking
- **Payments**: Stripe
- **Infrastructure**: AWS CDK (TypeScript)

## Project Structure

```
togetherunite/
├── frontend/          # React/Next.js application
├── backend/           # Lambda functions
├── infra/             # CDK infrastructure code
└── scripts/           # Deployment scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- AWS CLI configured
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- Stripe account
- Domain name (optional)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Bootstrap CDK (first time only):
```bash
npm run bootstrap
```

3. Deploy infrastructure:
```bash
npm run deploy
```

4. Start development server:
```bash
npm run dev
```

## MVP Build Steps

1. ✅ Dev Env + CDK Bootstrap
2. ✅ RDS PostgreSQL + Secrets
3. ✅ Cognito Auth (Email + Google)
4. ✅ S3 + CloudFront (Frontend)
5. ✅ Lambda + API Gateway (CRUD)
6. ✅ Government Contact Picker
7. ✅ Stripe Payments (Lambda)
8. ✅ SES Email + Bounce Tracking
9. ✅ CI/CD + Monitoring

## Pricing Tiers

### Advocate
- $2.99/year validation fee
- Optional recurring annual validation

### Organizer
- $2.99/year validation fee
- Optional recurring annual validation

### Campaign (Pay-Per-Send)
- Free for organizer
- $2.99 per outreach email (paid by Advocate)
- Max 200 email list
- 1 email per advocate per day per campaign
- Auto-archived after 365 days or 30 days dormant
- Reactivation: $29.99

### Campaign (Unlimited)
- $29.99/month (Organizer pays)
- $24.99/month if prepaid 6+ months
- Free for Advocate to send
- Max 200 email list
- 1 email per advocate per day per campaign

### Add-ons
- **Campaign Donation**: 4.5% + $0.50 per donation
- **Campaign Analytics**: $29.99/month ($19.99 if prepaid 6+ months)
- **Campaign Email List**: $29.99/month ($19.99 if prepaid 6+ months)

## License

Proprietary

