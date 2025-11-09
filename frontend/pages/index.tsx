import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>TogetherUnite</h1>
        <p>Transform one voice into thousands</p>
        {user ? (
          <div className={styles.userActions}>
            <span>Welcome, {user.username}</span>
            <button onClick={handleSignOut} className="btn btn-secondary">
              Sign Out
            </button>
          </div>
        ) : (
          <div className={styles.authActions}>
            <Link href="/auth/signin" className="btn btn-primary">
              Sign In
            </Link>
            <Link href="/auth/signup" className="btn btn-secondary">
              Sign Up
            </Link>
          </div>
        )}
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h2>Citizen-Powered Advocacy</h2>
          <p>
            Launch shareable email campaigns that supporters can personalize and
            send directly to government representatives.
          </p>
        </section>

        {user && (
          <section className={styles.actions}>
            <Link href="/campaigns/create" className="card">
              <h3>Create Campaign</h3>
              <p>Start a new advocacy campaign</p>
            </Link>
            <Link href="/campaigns" className="card">
              <h3>My Campaigns</h3>
              <p>View and manage your campaigns</p>
            </Link>
            <Link href="/campaigns/join" className="card">
              <h3>Join Campaign</h3>
              <p>Support an existing campaign</p>
            </Link>
          </section>
        )}

        <section className={styles.features}>
          <h2>How It Works</h2>
          <div className={styles.featureGrid}>
            <div className="card">
              <h3>1. Create Campaign</h3>
              <p>
                Organizers compose an email message and build a recipient list
                of government officials.
              </p>
            </div>
            <div className="card">
              <h3>2. Share & Invite</h3>
              <p>
                Get a campaign webpage and QR code to share on social media,
                websites, or print materials.
              </p>
            </div>
            <div className="card">
              <h3>3. Advocates Join</h3>
              <p>
                Supporters visit the campaign link, review, personalize, and
                approve the message.
              </p>
            </div>
            <div className="card">
              <h3>4. Email Delivery</h3>
              <p>
                Emails are sent directly from advocates' accounts or via our
                secure SMTP server.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

