import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function JoinCampaign() {
  const router = useRouter();
  const [campaignId, setCampaignId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate campaign exists
      await axios.get(`${API_URL}/campaigns/${campaignId}`);
      router.push(`/campaigns/join/${campaignId}`);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Campaign not found');
      } else {
        setError('Failed to load campaign');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', margin: '80px auto' }}>
      <h1>Join Campaign</h1>
      <form onSubmit={handleSubmit} className="card">
        {error && (
          <div style={{ color: '#d32f2f', marginBottom: '16px' }}>{error}</div>
        )}
        <div className="form-group">
          <label htmlFor="campaignId">Campaign ID</label>
          <input
            type="text"
            id="campaignId"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            required
            placeholder="Enter campaign ID or URL"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Loading...' : 'Join Campaign'}
        </button>
      </form>
    </div>
  );
}

