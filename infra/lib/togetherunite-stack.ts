import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class TogetherUniteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Step 1: VPC for RDS only (minimal cost for trial)
    // Lambda functions will be outside VPC to avoid VPC endpoint costs
    // RDS will be in public subnet with security group restrictions
    const vpc = new ec2.Vpc(this, 'TogetherUniteVpc', {
      maxAzs: 1, // Single AZ for cost savings
      natGateways: 0, // No NAT Gateway needed
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // Step 2: RDS PostgreSQL Database
    const dbSecret = new secretsmanager.Secret(this, 'DBSecret', {
      description: 'RDS PostgreSQL master user credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
        passwordLength: 32,
      },
    });

    const dbInstance = new rds.DatabaseInstance(this, 'TogetherUniteDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC, // Public subnet for minimal cost (trial)
      },
      credentials: rds.Credentials.fromSecret(dbSecret),
      databaseName: 'togetherunite',
      deletionProtection: false,
      backupRetention: cdk.Duration.days(1), // Reduced for cost savings (trial)
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      publiclyAccessible: true, // Public access for trial (secure with security groups)
    });

    // Step 3: Cognito User Pool with Google OAuth
    const userPool = new cognito.UserPool(this, 'TogetherUniteUserPool', {
      userPoolName: 'TogetherUniteUsers',
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Google OAuth Identity Provider
    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(
      this,
      'GoogleProvider',
      {
        userPool,
        clientId: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
        scopes: ['profile', 'email', 'openid'],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          fullname: cognito.ProviderAttribute.GOOGLE_NAME,
        },
      }
    );

    // Microsoft OAuth Identity Provider (optional - uncomment if needed)
    // const microsoftProvider = new cognito.UserPoolIdentityProviderOidc(
    //   this,
    //   'MicrosoftProvider',
    //   {
    //     userPool,
    //     clientId: process.env.MICROSOFT_CLIENT_ID || 'YOUR_MICROSOFT_CLIENT_ID',
    //     clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'YOUR_MICROSOFT_CLIENT_SECRET',
    //     issuerUrl: 'https://login.microsoftonline.com/common/v2.0',
    //     scopes: ['openid', 'profile', 'email'],
    //     attributeMapping: {
    //       email: cognito.ProviderAttribute.other('email'),
    //       fullname: cognito.ProviderAttribute.other('name'),
    //     },
    //   }
    // );

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: 'TogetherUniteWebClient',
      generateSecret: false,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:3000',
          'https://yourdomain.com',
        ],
        logoutUrls: [
          'http://localhost:3000',
          'https://yourdomain.com',
        ],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.GOOGLE,
        cognito.UserPoolClientIdentityProvider.COGNITO,
        // cognito.UserPoolClientIdentityProvider.custom('Microsoft'), // Uncomment if using Microsoft
      ],
    });

    userPoolClient.node.addDependency(googleProvider);

    // Step 4: S3 + CloudFront for Frontend
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `togetherunite-frontend-${this.account}-${this.region}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'OAI',
      {
        comment: 'OAI for TogetherUnite frontend',
      }
    );

    frontendBucket.grantRead(originAccessIdentity);

    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: new cloudfrontOrigins.S3Origin(frontendBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // Step 5: Lambda Functions for API
    // Lambda functions outside VPC for minimal cost (trial)
    // They can access AWS services directly and RDS via public endpoint
    
    // RDS Security Group - allow connections from Lambda (for trial, can restrict later)
    // Note: For production, restrict this to specific IP ranges or use VPC
    // Lambda functions outside VPC can access RDS via public endpoint
    dbInstance.connections.allowFrom(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from Lambda (trial - restrict for production)'
    );

    // Create Lambda role (no VPC permissions needed)
    const apiLambdaRole = new iam.Role(this, 'ApiLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
        // No VPC access role needed - Lambda is outside VPC
      ],
    });

    // Grant RDS access
    dbSecret.grantRead(apiLambdaRole);

    // Grant SES permissions
    apiLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ses:SendEmail',
          'ses:SendRawEmail',
          'ses:GetSendStatistics',
        ],
        resources: ['*'],
      })
    );

    // Grant Cognito permissions for Auth Lambda
    apiLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cognito-idp:AdminGetUser',
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminUpdateUserAttributes',
        ],
        resources: [userPool.userPoolArn],
      })
    );

    // Common Lambda environment variables
    const lambdaEnvironment = {
      AWS_REGION: this.region,
      DB_SECRET_ARN: dbSecret.secretArn,
      DB_ENDPOINT: dbInstance.instanceEndpoint.hostname,
      DB_NAME: 'togetherunite',
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      FRONTEND_URL: `https://${distribution.distributionDomainName}`,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
    };

    // Lambda functions are OUTSIDE VPC for minimal cost
    // They can access AWS services (SES, Cognito, Secrets Manager, SNS) directly
    // They can access RDS via public endpoint (secured with security groups)
    // No VPC endpoints or NAT Gateway needed = $0 VPC costs

    // Campaigns Lambda (outside VPC for minimal cost)
    const campaignsLambda = new lambda.Function(this, 'CampaignsLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/campaigns'),
      role: apiLambdaRole,
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      // No VPC configuration - Lambda outside VPC
    });

    // Auth Lambda (outside VPC for minimal cost)
    const authLambda = new lambda.Function(this, 'AuthLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/auth'),
      role: apiLambdaRole,
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      // No VPC configuration - Lambda outside VPC
    });

    // Payments Lambda (Stripe) - outside VPC for minimal cost
    const paymentsLambda = new lambda.Function(this, 'PaymentsLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/payments'),
      role: apiLambdaRole,
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      // No VPC configuration - Lambda outside VPC
    });

    // Email Lambda (SES) - outside VPC for minimal cost
    const emailLambda = new lambda.Function(this, 'EmailLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/email'),
      role: apiLambdaRole,
      environment: {
        ...lambdaEnvironment,
        SES_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(60),
      // No VPC configuration - Lambda outside VPC
    });

    // Bounce Handler Lambda - outside VPC for minimal cost
    const bounceHandlerLambda = new lambda.Function(this, 'BounceHandlerLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/email/bounce-handler'),
      role: apiLambdaRole,
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      // No VPC configuration - Lambda outside VPC
    });

    // Step 6: API Gateway
    const api = new apigateway.RestApi(this, 'TogetherUniteApi', {
      restApiName: 'TogetherUnite API',
      description: 'API for TogetherUnite platform',
      defaultCorsPreflightOptions: {
        allowOrigins: [
          `https://${distribution.distributionDomainName}`,
          'http://localhost:3000',
        ],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true,
      },
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
    });

    // API Resources
    const campaigns = api.root.addResource('campaigns');
    campaigns.addMethod('GET', new apigateway.LambdaIntegration(campaignsLambda));
    campaigns.addMethod('POST', new apigateway.LambdaIntegration(campaignsLambda));
    
    const campaign = campaigns.addResource('{id}');
    campaign.addMethod('GET', new apigateway.LambdaIntegration(campaignsLambda));
    campaign.addMethod('PUT', new apigateway.LambdaIntegration(campaignsLambda));
    campaign.addMethod('DELETE', new apigateway.LambdaIntegration(campaignsLambda));

    const auth = api.root.addResource('auth');
    auth.addMethod('POST', new apigateway.LambdaIntegration(authLambda));

    const payments = api.root.addResource('payments');
    payments.addMethod('POST', new apigateway.LambdaIntegration(paymentsLambda));
    
    const webhook = payments.addResource('webhook');
    webhook.addMethod('POST', new apigateway.LambdaIntegration(paymentsLambda));

    const email = api.root.addResource('email');
    email.addMethod('POST', new apigateway.LambdaIntegration(emailLambda));

    // Step 7: SES Bounce Tracking
    const bounceTopic = new sns.Topic(this, 'BounceTopic', {
      displayName: 'SES Bounce Notifications',
    });

    bounceTopic.addSubscription(
      new sns.subscriptions.LambdaSubscription(bounceHandlerLambda)
    );

    // SES Configuration Set (for bounce tracking)
    const configurationSet = new ses.ConfigurationSet(this, 'SESConfigurationSet', {
      configurationSetName: 'togetherunite-bounces',
    });

    // Add event destination for bounce notifications
    configurationSet.addEventDestination('BounceDestination', {
      destination: ses.EventDestination.snsTopic(bounceTopic),
      events: [
        ses.EmailSendingEvent.BOUNCE,
        ses.EmailSendingEvent.COMPLAINT,
        ses.EmailSendingEvent.REJECT,
      ],
    });

    // Step 8: Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Frontend CloudFront URL',
    });

    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: dbInstance.instanceEndpoint.hostname,
      description: 'RDS PostgreSQL endpoint',
    });

    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: dbSecret.secretArn,
      description: 'RDS Secret ARN',
    });
  }
}

