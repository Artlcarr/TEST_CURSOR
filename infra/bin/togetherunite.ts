#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TogetherUniteStack } from '../lib/togetherunite-stack';

const app = new cdk.App();

new TogetherUniteStack(app, 'TogetherUniteStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'TogetherUnite - Citizen-powered advocacy platform',
});

