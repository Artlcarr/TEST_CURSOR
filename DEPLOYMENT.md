# TogetherUnite Deployment Guide

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Node.js 18+** installed
3. **AWS CLI** configured with credentials
4. **AWS CDK CLI** installed (`npm install -g aws-cdk`)
5. **Stripe Account** for payments
6. **Google OAuth Credentials** (for Google sign-in)
7. **Domain Name** (optional, for production)

## Initial Setup

### 1. Install Dependencies

```bash
npm install
cd frontend && npm install && cd ..
cd infra && npm install && cd ..
```

### 2. Configure Environment Variables

#### Frontend (.env.local)

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

#### Infrastructure

Set environment variables or update `infra/lib/togetherunite-stack.ts`:

```bash
export GOOGLE_CLIENT_ID=your-google-client-id
export GOOGLE_CLIENT_SECRET=your-google-client-secret
export STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
export STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 3. Bootstrap CDK (First Time Only)

```bash
cd infra
cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/us-east-1
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

After deployment, note the outputs:
- `UserPoolId` - Cognito User Pool ID
- `UserPoolClientId` - Cognito User Pool Client ID
- `ApiEndpoint` - API Gateway endpoint URL
- `FrontendUrl` - CloudFront distribution URL
- `DbEndpoint` - RDS PostgreSQL endpoint
- `DbSecretArn` - RDS Secret ARN

### 5. Update Frontend Environment Variables

Update `frontend/.env.local` with the actual values from CDK outputs.

### 6. Deploy Frontend to S3

The frontend is automatically deployed via CDK, but you can manually sync:

```bash
aws s3 sync frontend/out s3://your-bucket-name --delete
```

## Post-Deployment Configuration

### 1. Configure Stripe Webhook

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/payments/webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret and update `STRIPE_WEBHOOK_SECRET`

### 2. Verify SES Email Domain

1. Go to AWS SES Console
2. Verify your email domain or use SES sandbox
3. Request production access if needed
4. Configure bounce handling (already set up in CDK)

### 3. Configure Cognito Domain

1. Go to AWS Cognito Console
2. Create a Cognito domain (e.g., `togetherunite`)
3. Update `NEXT_PUBLIC_COGNITO_DOMAIN` in frontend

### 4. Set Up Google OAuth

1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://your-cognito-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
4. Update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

## Database Setup

The database tables are automatically created on first Lambda invocation. You can also manually run:

```sql
-- Connect to RDS and run the schema creation
-- This is handled automatically by the campaigns Lambda function
```

## Testing

### Local Development

```bash
# Start frontend dev server
cd frontend
npm run dev
```

### Test API Endpoints

```bash
# Create campaign
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/campaigns \
  -H "Content-Type: application/json" \
  -d '{"organizer_id":"test","title":"Test Campaign","email_subject":"Test","email_body":"Test body","recipient_list":[]}'
```

## Monitoring

- **CloudWatch Logs**: View Lambda function logs
- **CloudWatch Metrics**: Monitor API Gateway and Lambda metrics
- **X-Ray**: Enable for distributed tracing (optional)

## Troubleshooting

### Common Issues

1. **CDK Bootstrap Error**: Run `cdk bootstrap` in the target region
2. **RDS Connection Timeout**: Check security groups and VPC configuration
3. **Cognito OAuth Error**: Verify redirect URIs match exactly
4. **SES Email Not Sending**: Check SES sandbox limits or verify domain
5. **Stripe Webhook Error**: Verify webhook secret and endpoint URL

### Debugging

```bash
# View Lambda logs
aws logs tail /aws/lambda/TogetherUniteStack-CampaignsLambda --follow

# View API Gateway logs
aws logs tail /aws/apigateway/TogetherUniteApi --follow
```

## Production Checklist

- [ ] Update all environment variables with production values
- [ ] Enable RDS backup retention
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

## Cost Optimization

- Use RDS t3.micro for development
- Enable CloudFront caching
- Use Lambda provisioned concurrency only if needed
- Monitor CloudWatch costs
- Set up billing alerts

## Security Best Practices

- Never commit secrets to git
- Use AWS Secrets Manager for sensitive data
- Enable MFA for AWS account
- Use least privilege IAM policies
- Enable CloudTrail for audit logging
- Regular security updates for dependencies

