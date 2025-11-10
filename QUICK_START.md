# TogetherUnite Quick Start Guide

This is a condensed version of the deployment guide for quick reference.

## Prerequisites

- Node.js 18+
- AWS CLI configured
- AWS CDK CLI installed
- Stripe account
- Google OAuth credentials (optional)

## Quick Deployment Steps

### 1. Install Dependencies

```bash
npm install
cd frontend && npm install && cd ..
cd infra && npm install && cd ..
cd backend/campaigns && npm install && cd ../..
cd backend/auth && npm install && cd ../..
cd backend/payments && npm install && cd ../..
cd backend/email && npm install && cd ../..
cd backend/email/bounce-handler && npm install && cd ../../..
```

### 2. Set Environment Variables

```bash
# Infrastructure
export GOOGLE_CLIENT_ID=your-google-client-id
export GOOGLE_CLIENT_SECRET=your-google-client-secret
export STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
export STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
export CDK_DEFAULT_REGION=us-east-1
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
```

### 3. Bootstrap CDK

```bash
cd infra
cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/us-east-1
cd ..
```

### 4. Build and Deploy

```bash
# Build frontend
cd frontend
npm run build
cd ..

# Deploy infrastructure
cd infra
npm run build
cdk deploy --all
cd ..
```

### 5. Update Frontend Environment Variables

After deployment, update `frontend/.env.local` with CDK outputs:

```env
NEXT_PUBLIC_USER_POOL_ID=<from CDK output>
NEXT_PUBLIC_USER_POOL_CLIENT_ID=<from CDK output>
NEXT_PUBLIC_COGNITO_DOMAIN=<configure in AWS Console>
NEXT_PUBLIC_REDIRECT_SIGN_IN=https://<FrontendUrl>
NEXT_PUBLIC_REDIRECT_SIGN_OUT=https://<FrontendUrl>
NEXT_PUBLIC_API_URL=<ApiEndpoint>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 6. Post-Deployment Configuration

1. **Configure Cognito Domain:**
   - AWS Console → Cognito → Your User Pool → Domain
   - Create domain and update `NEXT_PUBLIC_COGNITO_DOMAIN`

2. **Configure Stripe Webhook:**
   - Stripe Dashboard → Webhooks → Add endpoint
   - URL: `<ApiEndpoint>/payments/webhook`
   - Events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Update `STRIPE_WEBHOOK_SECRET` and Lambda environment

3. **Verify SES Email:**
   - AWS Console → SES → Verified identities
   - Verify your email address or domain

### 7. Test

```bash
# Local development
cd frontend
npm run dev

# Test API
curl https://<ApiEndpoint>/campaigns
```

## Important Notes

- **Cost:** ~$20-25/month for trial (minimal configuration)
- **Deployment Time:** ~15-20 minutes
- **Region:** Defaults to us-east-1
- **SES:** Starts in sandbox mode (verify emails first)
- **Trial Configuration:**
  - Lambda functions outside VPC (no VPC costs)
  - RDS in public subnet (secured with security groups)
  - Single AZ deployment (cost savings)
  - Minimal backup retention (1 day)
- **Security:** This is a minimal-cost trial setup. For production, move to VPC with private subnets.

## Troubleshooting

- **Lambda can't connect to RDS:** 
  - Verify RDS is publicly accessible
  - Check security group allows connections from 0.0.0.0/0 (trial) or Lambda IP ranges
  - Verify RDS endpoint is correct in Lambda environment variables
- **SES not sending:** Verify email address and check sandbox limits
- **OAuth not working:** Verify redirect URIs match exactly
- **Stripe webhook failing:** Check webhook URL and secret

## Next Steps

1. Implement OAuth email integration
2. Add campaign analytics
3. Set up monitoring and alerting
4. Configure custom domain

For detailed instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

