import type { AppProps } from 'next/app';
import { Amplify } from 'aws-amplify';
import '../styles/globals.css';

// Configure Amplify
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '',
      loginWith: {
        email: true,
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [
            process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN || 'http://localhost:3000',
          ],
          redirectSignOut: [
            process.env.NEXT_PUBLIC_REDIRECT_SIGN_OUT || 'http://localhost:3000',
          ],
          responseType: 'code',
          providers: ['Google', 'Microsoft'],
        },
      },
    },
  },
};

Amplify.configure(amplifyConfig);

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

