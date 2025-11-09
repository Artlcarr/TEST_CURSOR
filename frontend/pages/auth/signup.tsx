import { useState } from 'react';
import { useRouter } from 'next/router';
import { signUp, confirmSignUp } from 'aws-amplify/auth';
import Link from 'next/link';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      });
      setShowConfirmation(true);
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
      router.push('/auth/signin');
    } catch (err: any) {
      setError(err.message || 'Failed to confirm sign up');
    } finally {
      setLoading(false);
    }
  };

  if (showConfirmation) {
    return (
      <div className="container" style={{ maxWidth: '400px', margin: '80px auto' }}>
        <h1>Confirm Sign Up</h1>
        <form onSubmit={handleConfirm} className="card">
          {error && (
            <div style={{ color: '#d32f2f', marginBottom: '16px' }}>{error}</div>
          )}
          <p>Please check your email for a confirmation code.</p>
          <div className="form-group">
            <label htmlFor="code">Confirmation Code</label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Confirming...' : 'Confirm'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '400px', margin: '80px auto' }}>
      <h1>Sign Up</h1>
      <form onSubmit={handleSubmit} className="card">
        {error && (
          <div style={{ color: '#d32f2f', marginBottom: '16px' }}>{error}</div>
        )}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <small style={{ color: '#666' }}>
            Must be at least 8 characters with uppercase, lowercase, number, and symbol
          </small>
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Signing up...' : 'Sign Up'}
        </button>
        <p style={{ textAlign: 'center', marginTop: '16px' }}>
          Already have an account? <Link href="/auth/signin">Sign in</Link>
        </p>
      </form>
    </div>
  );
}

