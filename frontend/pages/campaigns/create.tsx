import { useState } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser } from 'aws-amplify/auth';
import axios from 'axios';
import GovernmentContactPicker from '../../components/GovernmentContactPicker';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function CreateCampaign() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    email_subject: '',
    email_body: '',
    campaign_type: 'pay-per-send',
    recipient_list: [] as Array<{ name: string; email: string }>,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRecipientsChange = (recipients: Array<{ name: string; email: string }>) => {
    if (recipients.length > 200) {
      alert('Maximum 200 recipients allowed');
      return;
    }
    setFormData((prev) => ({ ...prev, recipient_list: recipients }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await getCurrentUser();
      const userId = user.userId;

      const campaignData = {
        ...formData,
        organizer_id: userId,
        expires_at: formData.campaign_type === 'pay-per-send' 
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      };

      const response = await axios.post(`${API_URL}/campaigns`, campaignData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      router.push(`/campaigns/${response.data.id}`);
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      alert(error.response?.data?.error || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '40px auto' }}>
      <h1>Create Campaign</h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="title">Campaign Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            placeholder="e.g., Support Climate Action Bill"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email_subject">Email Subject</label>
          <input
            type="text"
            id="email_subject"
            name="email_subject"
            value={formData.email_subject}
            onChange={handleInputChange}
            required
            placeholder="e.g., Support Climate Action Bill"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email_body">Email Body</label>
          <textarea
            id="email_body"
            name="email_body"
            value={formData.email_body}
            onChange={handleInputChange}
            required
            placeholder="Write your email message here..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="campaign_type">Campaign Type</label>
          <select
            id="campaign_type"
            name="campaign_type"
            value={formData.campaign_type}
            onChange={handleInputChange}
            required
          >
            <option value="pay-per-send">Pay-Per-Send ($2.99 per email)</option>
            <option value="unlimited">Unlimited ($29.99/month)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Recipients (Max 200)</label>
          <GovernmentContactPicker
            recipients={formData.recipient_list}
            onChange={handleRecipientsChange}
          />
          <p style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
            {formData.recipient_list.length} / 200 recipients
          </p>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || formData.recipient_list.length === 0}
          style={{ width: '100%' }}
        >
          {loading ? 'Creating...' : 'Create Campaign'}
        </button>
      </form>
    </div>
  );
}

