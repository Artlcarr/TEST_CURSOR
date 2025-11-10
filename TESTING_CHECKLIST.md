# TogetherUnite Testing Checklist

Use this checklist to verify all functionality after deployment.

## Pre-Deployment Checks

- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] AWS CLI configured
- [ ] CDK CLI installed
- [ ] Stripe account created
- [ ] Google OAuth credentials created (optional)

## Deployment Checks

- [ ] CDK bootstrap completed
- [ ] Infrastructure deployed successfully
- [ ] All CDK outputs saved
- [ ] Frontend built successfully
- [ ] Frontend deployed to S3

## Post-Deployment Configuration

- [ ] Cognito domain configured
- [ ] Google OAuth configured (if using)
- [ ] Stripe webhook configured
- [ ] SES email verified
- [ ] Frontend environment variables updated

## Authentication Tests

### User Registration
- [ ] User can sign up with email/password
- [ ] Verification email is sent
- [ ] User can verify email
- [ ] User can sign in after verification

### User Login
- [ ] User can sign in with email/password
- [ ] User can sign in with Google OAuth (if configured)
- [ ] User session persists
- [ ] User can sign out

### User Management
- [ ] User profile is created in database
- [ ] Advocate record is created
- [ ] User can view their profile

## Campaign Tests

### Campaign Creation
- [ ] Organizer can create a campaign
- [ ] Campaign title is saved
- [ ] Email subject is saved
- [ ] Email body is saved
- [ ] Recipient list is saved (max 200)
- [ ] Campaign type is saved (pay-per-send or unlimited)
- [ ] Campaign URL is generated
- [ ] QR code is generated
- [ ] Campaign appears in campaigns list

### Campaign Management
- [ ] Organizer can view their campaigns
- [ ] Organizer can view campaign details
- [ ] Organizer can edit campaign
- [ ] Organizer can delete campaign
- [ ] Campaign status is correct

### Campaign Joining
- [ ] Advocate can join campaign via URL
- [ ] Advocate can join campaign via QR code
- [ ] Campaign details are displayed
- [ ] Recipient list is displayed
- [ ] Advocate can select recipients

## Email Tests

### Email Sending
- [ ] Advocate can send email
- [ ] Email is personalized with advocate name
- [ ] Email is sent to recipient
- [ ] Email subject is correct
- [ ] Email body is correct
- [ ] Daily limit is enforced (1 email per day per campaign)
- [ ] Email send is recorded in database

### Email Limits
- [ ] Advocate cannot send more than 1 email per day per campaign
- [ ] Error message is displayed when limit exceeded
- [ ] Campaign status is checked before sending

### Bounce Handling
- [ ] Permanent bounces are handled
- [ ] Recipient is removed from list on permanent bounce
- [ ] Transient bounces are logged
- [ ] Organizer is notified of bounces (if implemented)

## Payment Tests

### Validation Fee
- [ ] New user is prompted for validation fee
- [ ] Stripe checkout session is created
- [ ] Payment is processed
- [ ] Payment is recorded in database
- [ ] User validation status is updated

### Campaign Payments
- [ ] Pay-per-send campaign requires payment
- [ ] Stripe checkout session is created
- [ ] Payment is processed
- [ ] Email can be sent after payment
- [ ] Payment is recorded in database

### Payment Webhooks
- [ ] Stripe webhook is received
- [ ] Payment status is updated
- [ ] Database is updated correctly
- [ ] User is notified of payment status

## Database Tests

### Database Connection
- [ ] Lambda can connect to RDS
- [ ] Database tables are created
- [ ] Database queries work correctly
- [ ] Database transactions work correctly

### Data Integrity
- [ ] Campaigns are stored correctly
- [ ] Advocates are stored correctly
- [ ] Campaign actions are stored correctly
- [ ] Data relationships are maintained

## API Tests

### Campaigns API
- [ ] GET /campaigns returns campaigns
- [ ] GET /campaigns/{id} returns campaign
- [ ] POST /campaigns creates campaign
- [ ] PUT /campaigns/{id} updates campaign
- [ ] DELETE /campaigns/{id} deletes campaign

### Auth API
- [ ] POST /auth with get_user returns user
- [ ] POST /auth creates advocate record

### Payments API
- [ ] POST /payments creates checkout session
- [ ] POST /payments/webhook processes webhook

### Email API
- [ ] POST /email sends email
- [ ] POST /email validates daily limit
- [ ] POST /email validates campaign status

## Frontend Tests

### Navigation
- [ ] Home page loads
- [ ] Sign in page loads
- [ ] Sign up page loads
- [ ] Campaigns page loads
- [ ] Create campaign page loads
- [ ] Campaign details page loads
- [ ] Join campaign page loads

### UI Components
- [ ] Government contact picker works
- [ ] QR code displays correctly
- [ ] Forms validate input
- [ ] Error messages display correctly
- [ ] Success messages display correctly

### Responsive Design
- [ ] Website works on desktop
- [ ] Website works on tablet
- [ ] Website works on mobile

## Security Tests

### Authentication
- [ ] Unauthenticated users cannot access protected routes
- [ ] Authenticated users can access protected routes
- [ ] JWT tokens are validated
- [ ] Session expires correctly

### Authorization
- [ ] Organizers can only edit their own campaigns
- [ ] Advocates can only send emails for active campaigns
- [ ] Users cannot access other users' data

### Data Validation
- [ ] Input is validated on frontend
- [ ] Input is validated on backend
- [ ] SQL injection is prevented
- [ ] XSS attacks are prevented

## Performance Tests

### Load Testing
- [ ] API handles multiple concurrent requests
- [ ] Database handles multiple concurrent connections
- [ ] Lambda functions scale correctly
- [ ] Frontend loads quickly

### Caching
- [ ] CloudFront caches static assets
- [ ] API responses are cached (if implemented)
- [ ] Database queries are optimized

## Monitoring Tests

### CloudWatch Logs
- [ ] Lambda logs are captured
- [ ] API Gateway logs are captured
- [ ] Error logs are captured
- [ ] Logs are searchable

### Metrics
- [ ] Lambda invocations are tracked
- [ ] API Gateway requests are tracked
- [ ] Database connections are tracked
- [ ] Error rates are tracked

## Integration Tests

### End-to-End Tests
- [ ] User can sign up, create campaign, and send email
- [ ] User can join campaign and send email
- [ ] Payment flow works end-to-end
- [ ] Email sending works end-to-end

### Third-Party Integrations
- [ ] Stripe integration works
- [ ] SES integration works
- [ ] Cognito integration works
- [ ] Google OAuth works (if configured)

## Production Readiness

- [ ] All tests pass
- [ ] Monitoring is configured
- [ ] Alerts are configured
- [ ] Backup strategy is in place
- [ ] Disaster recovery plan is in place
- [ ] Security review is completed
- [ ] Performance review is completed
- [ ] Documentation is updated

## Notes

- Test with both pay-per-send and unlimited campaigns
- Test with multiple users and campaigns
- Test error scenarios (invalid data, network errors, etc.)
- Test with different browsers and devices
- Test with different email providers

## Troubleshooting

If tests fail:
1. Check CloudWatch logs
2. Check API Gateway logs
3. Check database logs
4. Check browser console
5. Check network requests
6. Review error messages
7. Check environment variables
8. Verify AWS permissions

