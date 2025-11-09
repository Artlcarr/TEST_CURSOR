import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function CampaignDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCampaign();
    }
  }, [id]);

  async function fetchCampaign() {
    try {
      const response = await axios.get(`${API_URL}/campaigns/${id}`);
      setCampaign(response.data);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      alert('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (!campaign) {
    return <div className="container">Campaign not found</div>;
  }

  return (
    <div className="container" style={{ maxWidth: '1000px', margin: '40px auto' }}>
      <h1>{campaign.title}</h1>

      <div className="card">
        <h2>Campaign Details</h2>
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
      </div>

      <div className="card">
        <h2>Share Campaign</h2>
        <p>Share this campaign link or QR code:</p>
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            value={campaign.campaign_url || ''}
            readOnly
            style={{ width: '100%', padding: '8px', marginBottom: '12px' }}
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(campaign.campaign_url);
              alert('Link copied to clipboard!');
            }}
            className="btn btn-primary"
          >
            Copy Link
          </button>
        </div>
        {campaign.qr_code_url && (
          <div style={{ textAlign: 'center' }}>
            <QRCodeSVG value={campaign.campaign_url} size={256} />
            <p style={{ marginTop: '12px' }}>
              <a href={campaign.qr_code_url} download="campaign-qr.png">
                Download QR Code
              </a>
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Email Preview</h2>
        <p>
          <strong>Subject:</strong> {campaign.email_subject}
        </p>
        <div
          style={{
            padding: '16px',
            background: '#f5f5f5',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {campaign.email_body}
        </div>
      </div>

      <div className="card">
        <h2>Recipients</h2>
        <p>
          {Array.isArray(campaign.recipient_list)
            ? campaign.recipient_list.length
            : JSON.parse(campaign.recipient_list || '[]').length}{' '}
          recipients
        </p>
      </div>
    </div>
  );
}

