import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signIn, getCurrentUser } from 'aws-amplify/auth';
import Link from 'next/link';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if already signed in
    getCurrentUser()
      .then(() => {
        const redirect = router.query.redirect as string;
        router.push(redirect || '/');
      })
      .catch(() => {
        // Not signed in, continue
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn({ username: email, password });
      const redirect = router.query.redirect as string;
      router.push(redirect || '/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', margin: '80px auto' }}>
      <h1>Sign In</h1>
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
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <p style={{ textAlign: 'center', marginTop: '16px' }}>
          Don't have an account? <Link href="/auth/signup">Sign up</Link>
        </p>
      </form>
    </div>
  );
}

