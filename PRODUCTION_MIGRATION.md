# Production Migration Guide

This guide explains how to migrate from the trial (minimal-cost) configuration to a production-ready, secure configuration.

## Current Trial Configuration

- **Lambda Functions:** Outside VPC (no VPC costs)
- **RDS:** Public subnet, publicly accessible
- **Security:** RDS security group allows connections from any IP (0.0.0.0/0)
- **Backup:** 1 day retention
- **Cost:** ~$20-25/month

## Production Configuration

- **Lambda Functions:** Inside VPC with private subnets
- **RDS:** Private subnet, not publicly accessible
- **Security:** RDS security group allows connections only from Lambda security group
- **Network:** VPC endpoints or NAT Gateway for AWS service access
- **Backup:** 7+ days retention
- **Encryption:** RDS encryption at rest enabled
- **Cost:** ~$90-100/month (with VPC endpoints) or ~$50-60/month (with NAT Gateway)

## Migration Steps

### Step 1: Update VPC Configuration

1. **Add Private Subnets:**
   ```typescript
   const vpc = new ec2.Vpc(this, 'TogetherUniteVpc', {
     maxAzs: 2, // Multi-AZ for production
     natGateways: 1, // Or use VPC endpoints
     subnetConfiguration: [
       {
         cidrMask: 24,
         name: 'Public',
         subnetType: ec2.SubnetType.PUBLIC,
       },
       {
         cidrMask: 24,
         name: 'Private',
         subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Or PRIVATE_ISOLATED with VPC endpoints
       },
     ],
   });
   ```

### Step 2: Move RDS to Private Subnet

1. **Update RDS Configuration:**
   ```typescript
   const dbInstance = new rds.DatabaseInstance(this, 'TogetherUniteDB', {
     // ... other config
     vpcSubnets: {
       subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Or PRIVATE_ISOLATED
     },
     publiclyAccessible: false, // Not publicly accessible
     backupRetention: cdk.Duration.days(7), // Increase backup retention
     storageEncrypted: true, // Enable encryption at rest
   });
   ```

### Step 3: Move Lambda Functions to VPC

1. **Create Lambda Security Group:**
   ```typescript
   const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
     vpc,
     description: 'Security group for Lambda functions',
     allowAllOutbound: true,
   });
   ```

2. **Update Lambda Role:**
   ```typescript
   const apiLambdaRole = new iam.Role(this, 'ApiLambdaRole', {
     // ... other config
     managedPolicies: [
       iam.ManagedPolicy.fromAwsManagedPolicyName(
         'service-role/AWSLambdaBasicExecutionRole'
       ),
       iam.ManagedPolicy.fromAwsManagedPolicyName(
         'service-role/AWSLambdaVPCAccessExecutionRole' // Add VPC access
       ),
     ],
   });
   ```

3. **Update Lambda Functions:**
   ```typescript
   const lambdaVpcConfig = {
     vpc,
     vpcSubnets: {
       subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Or PRIVATE_ISOLATED
     },
     securityGroups: [lambdaSecurityGroup],
   };

   const campaignsLambda = new lambda.Function(this, 'CampaignsLambda', {
     // ... other config
     ...lambdaVpcConfig, // Add VPC configuration
   });
   ```

### Step 4: Configure RDS Security Group

1. **Restrict RDS Access:**
   ```typescript
   // Remove public access
   // dbInstance.connections.allowFromAnyIpv4(...) // Remove this

   // Allow only from Lambda security group
   dbInstance.connections.allowFrom(
     lambdaSecurityGroup,
     ec2.Port.tcp(5432),
     'Allow Lambda to access RDS'
   );
   ```

### Step 5: Configure AWS Service Access

Choose one of the following options:

#### Option A: NAT Gateway (Lower Cost)

1. **Add NAT Gateway:**
   ```typescript
   const vpc = new ec2.Vpc(this, 'TogetherUniteVpc', {
     maxAzs: 2,
     natGateways: 1, // NAT Gateway for AWS service access
     // ... other config
   });
   ```

2. **Use PRIVATE_WITH_EGRESS subnets:**
   ```typescript
   subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
   ```

**Cost:** ~$32/month for NAT Gateway

#### Option B: VPC Endpoints (Better Security, Higher Cost)

1. **Add VPC Interface Endpoints:**
   ```typescript
   // Secrets Manager endpoint
   vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
     service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
     subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
   });

   // SES endpoint
   vpc.addInterfaceEndpoint('SESEndpoint', {
     service: ec2.InterfaceVpcEndpointAwsService.SES,
     subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
   });

   // Cognito endpoint
   vpc.addInterfaceEndpoint('CognitoEndpoint', {
     service: ec2.InterfaceVpcEndpointAwsService.COGNITO_IDP,
     subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
   });

   // SNS endpoint
   vpc.addInterfaceEndpoint('SNSEndpoint', {
     service: ec2.InterfaceVpcEndpointAwsService.SNS,
     subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
   });

   // CloudWatch Logs endpoint
   vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
     service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
     subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
   });
   ```

2. **Use PRIVATE_ISOLATED subnets:**
   ```typescript
   subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
   ```

**Cost:** ~$70/month for VPC endpoints (5 endpoints × 2 AZs)

### Step 6: Enable Additional Security Features

1. **Enable RDS Encryption:**
   ```typescript
   storageEncrypted: true,
   ```

2. **Enable RDS Deletion Protection:**
   ```typescript
   deletionProtection: true,
   ```

3. **Increase Backup Retention:**
   ```typescript
   backupRetention: cdk.Duration.days(7), // Or more
   ```

4. **Enable Multi-AZ (Optional):**
   ```typescript
   multiAz: true, // For high availability
   ```

### Step 7: Update Monitoring and Alerting

1. **Set up CloudWatch Alarms:**
   - RDS CPU utilization
   - RDS storage space
   - Lambda errors
   - API Gateway errors

2. **Enable CloudTrail:**
   - Audit logging for all API calls

3. **Set up Billing Alerts:**
   - Monitor AWS costs

### Step 8: Deploy and Test

1. **Deploy Infrastructure:**
   ```bash
   cd infra
   npm run build
   cdk deploy --all
   ```

2. **Test Connectivity:**
   - Verify Lambda can connect to RDS
   - Verify Lambda can access AWS services
   - Test all API endpoints
   - Verify email sending works

3. **Update Frontend:**
   - No changes needed (API endpoint remains the same)

## Rollback Plan

If issues occur during migration:

1. **Keep Trial Configuration:**
   - Don't delete the trial stack immediately
   - Test production configuration thoroughly

2. **Gradual Migration:**
   - Migrate one service at a time
   - Test after each migration step

3. **Database Migration:**
   - Export data from trial database
   - Import to production database
   - Verify data integrity

## Cost Comparison

| Configuration | Monthly Cost | Security | Performance |
|--------------|--------------|----------|-------------|
| Trial (Current) | ~$20-25 | Low | Good |
| Production (NAT Gateway) | ~$50-60 | Medium | Good |
| Production (VPC Endpoints) | ~$90-100 | High | Excellent |

## Security Checklist

- [ ] RDS in private subnet
- [ ] RDS not publicly accessible
- [ ] RDS security group restricted to Lambda only
- [ ] RDS encryption at rest enabled
- [ ] Lambda functions in VPC
- [ ] VPC endpoints or NAT Gateway configured
- [ ] Backup retention increased to 7+ days
- [ ] Deletion protection enabled
- [ ] CloudWatch alarms configured
- [ ] CloudTrail enabled
- [ ] Billing alerts configured

## Next Steps

After migration to production configuration:

1. Monitor costs and performance
2. Set up automated backups
3. Configure disaster recovery
4. Implement additional security measures
5. Set up CI/CD pipeline
6. Configure custom domain
7. Enable production SES access

