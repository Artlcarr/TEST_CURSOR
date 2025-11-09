import { useState } from 'react';

interface Recipient {
  name: string;
  email: string;
}

interface GovernmentContactPickerProps {
  recipients: Recipient[];
  onChange: (recipients: Recipient[]) => void;
}

// Sample government contacts - in production, this would come from a verified directory
const SAMPLE_CONTACTS = {
  'US Congress': [
    { name: 'Senator John Doe', email: 'john.doe@senate.gov' },
    { name: 'Representative Jane Smith', email: 'jane.smith@house.gov' },
  ],
  'State Governors': [
    { name: 'Governor Bob Johnson', email: 'bob.johnson@state.gov' },
  ],
};

export default function GovernmentContactPicker({
  recipients,
  onChange,
}: GovernmentContactPickerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecipient, setNewRecipient] = useState({ name: '', email: '' });

  const handleAddRecipient = () => {
    if (newRecipient.name && newRecipient.email) {
      if (recipients.length >= 200) {
        alert('Maximum 200 recipients allowed');
        return;
      }
      onChange([...recipients, newRecipient]);
      setNewRecipient({ name: '', email: '' });
      setShowAddForm(false);
    }
  };

  const handleRemoveRecipient = (index: number) => {
    const updated = recipients.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleAddFromDirectory = (contact: Recipient) => {
    if (recipients.length >= 200) {
      alert('Maximum 200 recipients allowed');
      return;
    }
    if (recipients.some((r) => r.email === contact.email)) {
      alert('Recipient already added');
      return;
    }
    onChange([...recipients, contact]);
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-secondary"
          style={{ marginRight: '8px' }}
        >
          {showAddForm ? 'Cancel' : 'Add Recipient'}
        </button>
        <button
          type="button"
          onClick={() => {
            // In production, this would open a directory picker
            alert('Government directory picker - to be implemented');
          }}
          className="btn btn-secondary"
        >
          Browse Directory
        </button>
      </div>

      {showAddForm && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={newRecipient.name}
              onChange={(e) =>
                setNewRecipient({ ...newRecipient, name: e.target.value })
              }
              placeholder="e.g., Senator John Doe"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={newRecipient.email}
              onChange={(e) =>
                setNewRecipient({ ...newRecipient, email: e.target.value })
              }
              placeholder="e.g., john.doe@senate.gov"
            />
          </div>
          <button
            type="button"
            onClick={handleAddRecipient}
            className="btn btn-primary"
          >
            Add
          </button>
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <h4>Sample Contacts</h4>
        {Object.entries(SAMPLE_CONTACTS).map(([category, contacts]) => (
          <div key={category} style={{ marginBottom: '12px' }}>
            <strong>{category}</strong>
            {contacts.map((contact, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px',
                  background: '#f5f5f5',
                  margin: '4px 0',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  {contact.name} - {contact.email}
                </span>
                <button
                  type="button"
                  onClick={() => handleAddFromDirectory(contact)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: '14px' }}
                  disabled={recipients.some((r) => r.email === contact.email)}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {recipients.length > 0 && (
        <div>
          <h4>Selected Recipients ({recipients.length})</h4>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {recipients.map((recipient, index) => (
              <div
                key={index}
                style={{
                  padding: '8px',
                  background: '#f0f0f0',
                  margin: '4px 0',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  {recipient.name} - {recipient.email}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveRecipient(index)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: '14px' }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

