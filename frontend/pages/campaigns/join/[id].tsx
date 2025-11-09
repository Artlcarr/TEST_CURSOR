import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser } from 'aws-amplify/auth';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

export default function JoinCampaign() {
  const router = useRouter();
  const { id } = router.query;
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [personalizedMessage, setPersonalizedMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchCampaign();
      checkUser();
    }
  }, [id]);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      router.push('/auth/signin?redirect=/campaigns/join/' + id);
    }
  }

  async function fetchCampaign() {
    try {
      const response = await axios.get(`${API_URL}/campaigns/${id}`);
      setCampaign(response.data);
      setPersonalizedMessage(response.data.email_body);
      
      const recipients = Array.isArray(response.data.recipient_list)
        ? response.data.recipient_list
        : JSON.parse(response.data.recipient_list || '[]');
      setSelectedRecipients(recipients);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      alert('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendEmail() {
    if (!user || selectedRecipients.length === 0) {
      alert('Please select at least one recipient');
      return;
    }

    setSending(true);

    try {
      // Check if pay-per-send and payment required
      if (campaign.campaign_type === 'pay-per-send') {
        // Create Stripe checkout session
        const paymentResponse = await axios.post(`${API_URL}/payments`, {
          payment_type: 'email_send',
          amount: 2.99,
          campaign_id: id,
          advocate_id: user.userId,
        });

        const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
        if (stripe) {
          await stripe.redirectToCheckout({
            sessionId: paymentResponse.data.sessionId,
          });
          return;
        }
      }

      // Send email for each selected recipient
      for (const recipient of selectedRecipients) {
        await axios.post(`${API_URL}/email`, {
          campaign_id: id,
          advocate_id: user.userId,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          personalized_message: personalizedMessage,
          advocate_name: user.username,
          advocate_email: user.attributes?.email,
          email_subject: campaign.email_subject,
          email_body: campaign.email_body,
          send_method: 'smtp', // TODO: Add OAuth option
        });
      }

      alert('Emails sent successfully!');
      router.push('/campaigns/' + id);
    } catch (error: any) {
      console.error('Error sending email:', error);
      alert(error.response?.data?.error || 'Failed to send email');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (!campaign) {
    return <div className="container">Campaign not found</div>;
  }

  const recipients = Array.isArray(campaign.recipient_list)
    ? campaign.recipient_list
    : JSON.parse(campaign.recipient_list || '[]');

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '40px auto' }}>
      <h1>{campaign.title}</h1>

      <div className="card">
        <h2>Review & Personalize</h2>
        <div className="form-group">
          <label>Email Subject</label>
          <input type="text" value={campaign.email_subject} readOnly />
        </div>
        <div className="form-group">
          <label>Email Body (You can personalize this)</label>
          <textarea
            value={personalizedMessage}
            onChange={(e) => setPersonalizedMessage(e.target.value)}
            style={{ minHeight: '200px' }}
          />
        </div>
      </div>

      <div className="card">
        <h2>Select Recipients</h2>
        <p>Select which recipients to send the email to:</p>
        {recipients.map((recipient: any, index: number) => (
          <div
            key={index}
            style={{
              padding: '12px',
              background: selectedRecipients.some((r) => r.email === recipient.email)
                ? '#e3f2fd'
                : '#f5f5f5',
              margin: '8px 0',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            onClick={() => {
              if (selectedRecipients.some((r) => r.email === recipient.email)) {
                setSelectedRecipients(
                  selectedRecipients.filter((r) => r.email !== recipient.email)
                );
              } else {
                setSelectedRecipients([...selectedRecipients, recipient]);
              }
            }}
          >
            <input
              type="checkbox"
              checked={selectedRecipients.some((r) => r.email === recipient.email)}
              onChange={() => {}}
              style={{ marginRight: '8px' }}
            />
            <strong>{recipient.name}</strong> - {recipient.email}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Send Email</h2>
        {campaign.campaign_type === 'pay-per-send' && (
          <p style={{ color: '#d32f2f', marginBottom: '16px' }}>
            Cost: $2.99 per email send
          </p>
        )}
        <button
          onClick={handleSendEmail}
          className="btn btn-primary"
          disabled={sending || selectedRecipients.length === 0}
          style={{ width: '100%' }}
        >
          {sending ? 'Sending...' : 'Send Email'}
        </button>
      </div>
    </div>
  );
}

