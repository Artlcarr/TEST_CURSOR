import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser } from 'aws-amplify/auth';
import axios from 'axios';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function Campaigns() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
    fetchCampaigns();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      router.push('/auth/signin');
    }
  }

  async function fetchCampaigns() {
    try {
      const currentUser = await getCurrentUser();
      const response = await axios.get(
        `${API_URL}/campaigns?organizer_id=${currentUser.userId}`
      );
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '40px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>My Campaigns</h1>
        <Link href="/campaigns/create" className="btn btn-primary">
          Create Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="card">
          <p>You haven't created any campaigns yet.</p>
          <Link href="/campaigns/create" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Create Your First Campaign
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <h2>{campaign.title}</h2>
              <p>
                <strong>Type:</strong> {campaign.campaign_type === 'pay-per-send' ? 'Pay-Per-Send' : 'Unlimited'}
              </p>
              <p>
                <strong>Status:</strong> {campaign.status}
              </p>
              {campaign.expires_at && (
                <p>
                  <strong>Expires:</strong> {new Date(campaign.expires_at).toLocaleDateString()}
                </p>
              )}
              <p>
                <strong>Created:</strong> {new Date(campaign.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

