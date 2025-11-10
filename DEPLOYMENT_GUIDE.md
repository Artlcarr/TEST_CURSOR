# TogetherUnite Deployment Guide

This guide will walk you through deploying and testing the TogetherUnite platform step by step.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js 18+** installed
   ```bash
   node --version  # Should be 18 or higher
   ```

2. **AWS CLI** installed and configured
   ```bash
   aws --version
   aws configure  # Configure your AWS credentials
   ```

3. **AWS CDK CLI** installed
   ```bash
   npm install -g aws-cdk
   cdk --version
   ```

4. **AWS Account** with appropriate permissions:
   - IAM (for roles and policies)
   - VPC (for networking)
   - RDS (for database)
   - Lambda (for functions)
   - API Gateway (for API)
   - Cognito (for authentication)
   - S3 (for frontend hosting)
   - CloudFront (for CDN)
   - SES (for email sending)
   - SNS (for notifications)
   - Secrets Manager (for secrets)

5. **Stripe Account** (for payments)
   - Create a Stripe account at https://stripe.com
   - Get your API keys from the Stripe Dashboard

6. **Google OAuth Credentials** (optional, for Google sign-in)
   - Go to Google Cloud Console
   - Create OAuth 2.0 credentials
   - Get Client ID and Client Secret

## Step 1: Initial Setup

### 1.1 Install Dependencies

Run the setup script to install all dependencies:

```bash
# On Linux/Mac
chmod +x scripts/setup.sh
./scripts/setup.sh

# On Windows (PowerShell)
# Run the commands manually from setup.sh
npm install
cd frontend && npm install && cd ..
cd backend/campaigns && npm install && cd ../..
cd backend/auth && npm install && cd ../..
cd backend/payments && npm install && cd ../..
cd backend/email && npm install && cd ../..
cd backend/email/bounce-handler && npm install && cd ../../..
cd infra && npm install && cd ..
```

### 1.2 Configure Environment Variables

#### Frontend Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_USER_POOL_ID=your-user-pool-id
NEXT_PUBLIC_USER_POOL_CLIENT_ID=your-user-pool-client-id
NEXT_PUBLIC_COGNITO_DOMAIN=your-cognito-domain
NEXT_PUBLIC_REDIRECT_SIGN_IN=http://localhost:3000
NEXT_PUBLIC_REDIRECT_SIGN_OUT=http://localhost:3000
NEXT_PUBLIC_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

**Note:** These values will be populated after deployment. For local development, you can use placeholder values initially.

#### Infrastructure Environment Variables

Set these environment variables before deployment:

```bash
# Google OAuth (optional)
export GOOGLE_CLIENT_ID=your-google-client-id
export GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe
export STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
export STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# AWS Region (optional, defaults to us-east-1)
export CDK_DEFAULT_REGION=us-east-1
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
```

**On Windows (PowerShell):**
```powershell
$env:GOOGLE_CLIENT_ID="your-google-client-id"
$env:GOOGLE_CLIENT_SECRET="your-google-client-secret"
$env:STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
$env:STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
$env:CDK_DEFAULT_REGION="us-east-1"
$env:CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
```

## Step 2: Bootstrap CDK (First Time Only)

Bootstrap CDK in your AWS account and region:

```bash
cd infra
cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/us-east-1
cd ..
```

**On Windows (PowerShell):**
```powershell
cd infra
$account = aws sts get-caller-identity --query Account --output text
cdk bootstrap "aws://$account/us-east-1"
cd ..
```

This creates the necessary S3 buckets and IAM roles for CDK deployments.

## Step 3: Build and Deploy Infrastructure

### 3.1 Build Frontend

```bash
cd frontend
npm run build
cd ..
```

This creates a static export in `frontend/out/` directory.

### 3.2 Build Infrastructure

```bash
cd infra
npm run build
cd ..
```

### 3.3 Deploy Infrastructure

```bash
cd infra
cdk deploy --all
cd ..
```

**Important:** This deployment will:
- Create a VPC with NAT Gateway (~$32/month)
- Create an RDS PostgreSQL instance (~$15/month)
- Create Lambda functions
- Create API Gateway
- Create Cognito User Pool
- Create S3 bucket and CloudFront distribution
- Create SES configuration
- Create SNS topic for bounce tracking

**Deployment takes approximately 15-20 minutes.**

After deployment, CDK will output:
- `UserPoolId` - Cognito User Pool ID
- `UserPoolClientId` - Cognito User Pool Client ID
- `ApiEndpoint` - API Gateway endpoint URL
- `FrontendUrl` - CloudFront distribution URL
- `DbEndpoint` - RDS PostgreSQL endpoint
- `DbSecretArn` - RDS Secret ARN

**Save these values!** You'll need them for the next steps.

## Step 4: Post-Deployment Configuration

### 4.1 Update Frontend Environment Variables

Update `frontend/.env.local` with the actual values from CDK outputs:

```env
NEXT_PUBLIC_USER_POOL_ID=<UserPoolId from CDK output>
NEXT_PUBLIC_USER_POOL_CLIENT_ID=<UserPoolClientId from CDK output>
NEXT_PUBLIC_COGNITO_DOMAIN=<your-cognito-domain>
NEXT_PUBLIC_REDIRECT_SIGN_IN=https://<FrontendUrl from CDK output>
NEXT_PUBLIC_REDIRECT_SIGN_OUT=https://<FrontendUrl from CDK output>
NEXT_PUBLIC_API_URL=<ApiEndpoint from CDK output>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### 4.2 Configure Cognito Domain

1. Go to AWS Cognito Console
2. Select your User Pool
3. Go to "App integration" tab
4. Under "Domain", click "Create Cognito domain"
5. Enter a domain name (e.g., `togetherunite`)
6. Save the domain name and update `NEXT_PUBLIC_COGNITO_DOMAIN` in frontend/.env.local

### 4.3 Configure Google OAuth (Optional)

1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI:
   ```
   https://<your-cognito-domain>.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```
4. Update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables
5. Redeploy infrastructure:
   ```bash
   cd infra
   cdk deploy
   cd ..
   ```

### 4.4 Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter endpoint URL:
   ```
   https://<ApiEndpoint from CDK output>/payments/webhook
   ```
4. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret
6. Update `STRIPE_WEBHOOK_SECRET` environment variable
7. Update Lambda environment variable:
   ```bash
   aws lambda update-function-configuration \
     --function-name TogetherUniteStack-PaymentsLambda-<id> \
     --environment Variables="{...,STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret}"
   ```

### 4.5 Configure SES Email Sending

1. Go to AWS SES Console
2. Verify your email address or domain:
   - For testing: Verify your email address
   - For production: Verify your domain
3. Request production access (if needed):
   - Go to "Account dashboard"
   - Click "Request production access"
   - Fill out the form

**Note:** In sandbox mode, you can only send emails to verified addresses.

### 4.6 Deploy Frontend to S3

The frontend should be automatically deployed via CDK. If not, manually deploy:

```bash
# Get the S3 bucket name from CDK output or AWS Console
aws s3 sync frontend/out s3://togetherunite-frontend-<account-id>-<region> --delete
```

Then invalidate CloudFront cache:

```bash
# Get distribution ID from AWS Console
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```

## Step 5: Testing

### 5.1 Test Local Development

Start the local development server:

```bash
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

### 5.2 Test API Endpoints

#### Test Campaigns API

```bash
# Get all campaigns
curl -X GET https://<ApiEndpoint>/campaigns

# Create a campaign
curl -X POST https://<ApiEndpoint>/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "organizer_id": "test-user-id",
    "title": "Test Campaign",
    "email_subject": "Test Subject",
    "email_body": "Test body",
    "recipient_list": [
      {"name": "Test Recipient", "email": "test@example.com"}
    ],
    "campaign_type": "pay-per-send"
  }'
```

#### Test Auth API

```bash
# Get user info
curl -X POST https://<ApiEndpoint>/auth \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_user",
    "user_id": "test-user-id"
  }'
```

### 5.3 Test Frontend

1. **Sign Up:**
   - Go to the frontend URL
   - Click "Sign Up"
   - Create a new account

2. **Sign In:**
   - Sign in with your credentials
   - Test Google OAuth (if configured)

3. **Create Campaign:**
   - Go to "Create Campaign"
   - Fill in campaign details
   - Add recipients
   - Create campaign

4. **Join Campaign:**
   - Use the campaign URL or QR code
   - Join as an advocate
   - Send test email

### 5.4 Test Payments

1. **Validation Fee:**
   - Sign up as a new user
   - Complete validation fee payment
   - Verify payment in Stripe Dashboard

2. **Campaign Payment:**
   - Join a pay-per-send campaign
   - Complete payment for email send
   - Verify payment in Stripe Dashboard

### 5.5 Test Email Sending

1. **Verify Email Address:**
   - Go to AWS SES Console
   - Verify a test email address

2. **Send Test Email:**
   - Join a campaign
   - Select a recipient
   - Send email
   - Verify email is received

3. **Test Bounce Handling:**
   - Send email to an invalid address
   - Verify bounce is handled
   - Check CloudWatch logs

## Step 6: Monitoring and Troubleshooting

### 6.1 View Lambda Logs

```bash
# View campaigns Lambda logs
aws logs tail /aws/lambda/TogetherUniteStack-CampaignsLambda-<id> --follow

# View auth Lambda logs
aws logs tail /aws/lambda/TogetherUniteStack-AuthLambda-<id> --follow

# View email Lambda logs
aws logs tail /aws/lambda/TogetherUniteStack-EmailLambda-<id> --follow
```

### 6.2 View API Gateway Logs

```bash
# View API Gateway logs
aws logs tail /aws/apigateway/TogetherUniteApi --follow
```

### 6.3 Common Issues

#### Issue: Lambda cannot connect to RDS

**Solution:**
- Verify Lambda is in the VPC
- Check security group rules
- Verify RDS is accessible from Lambda subnet
- Check CloudWatch logs for connection errors

#### Issue: SES email not sending

**Solution:**
- Verify email address/domain is verified
- Check SES sandbox limits
- Verify SES permissions in Lambda role
- Check CloudWatch logs for errors

#### Issue: Cognito OAuth not working

**Solution:**
- Verify redirect URIs match exactly
- Check Cognito domain is configured
- Verify OAuth credentials are correct
- Check browser console for errors

#### Issue: Stripe webhook not working

**Solution:**
- Verify webhook URL is correct
- Check webhook secret is correct
- Verify webhook events are selected
- Check Lambda logs for errors

## Step 7: Production Checklist

Before going to production:

- [ ] Update all environment variables with production values
- [ ] Enable RDS backup retention (7+ days)
- [ ] Set up CloudWatch alarms
- [ ] Configure custom domain for CloudFront
- [ ] Set up SSL certificate
- [ ] Enable AWS WAF for API Gateway
- [ ] Configure SES production access
- [ ] Set up monitoring and alerting
- [ ] Review security groups and IAM roles
- [ ] Enable database encryption at rest
- [ ] Set up CI/CD pipeline
- [ ] Configure custom error pages
- [ ] Set up billing alerts
- [ ] Enable CloudTrail for audit logging
- [ ] Review and update removal policies
- [ ] Test disaster recovery procedures

## Cost Estimation

Approximate monthly costs (us-east-1) - **TRIAL CONFIGURATION (Minimal Cost)**:

- **VPC:** ~$0/month (minimal VPC costs, single AZ)
- **RDS t3.micro:** ~$15/month (public subnet, 1 day backup retention)
- **Lambda:** ~$0-5/month (depending on usage, outside VPC)
- **API Gateway:** ~$3.50 per million requests
- **S3:** ~$0.023 per GB storage
- **CloudFront:** ~$0.085 per GB data transfer
- **SES:** ~$0.10 per 1,000 emails
- **SNS:** ~$0.50 per million requests

**Total:** ~$20-25/month for minimal usage (trial)

**Security Notes for Trial:**
- Lambda functions are outside VPC (no VPC endpoint costs)
- RDS is in public subnet with security group allowing connections from any IP
- **For production, you should:**
  - Move Lambda functions into VPC
  - Move RDS to private subnet
  - Use VPC endpoints or NAT Gateway
  - Restrict RDS security group to specific IP ranges
  - Enable RDS encryption at rest
  - Increase backup retention

**Production Cost Estimate:** ~$90-100/month (with VPC endpoints or NAT Gateway)

## Next Steps

After successful deployment:

1. Implement OAuth email integration
2. Add campaign analytics dashboard
3. Implement email list export
4. Add donation features
5. Set up monitoring and alerting
6. Configure custom domain
7. Enable production SES access

## Support

For issues or questions:
- Check CloudWatch logs
- Review AWS Console for errors
- Check this deployment guide
- Review PROJECT_SUMMARY.md for feature status

