const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

let dbClient = null;

async function getDbConnection() {
  if (dbClient && !dbClient._ending) {
    return dbClient;
  }

  const secretResponse = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN })
  );
  const secret = JSON.parse(secretResponse.SecretString);

  dbClient = new Client({
    host: process.env.DB_ENDPOINT,
    port: 5432,
    database: process.env.DB_NAME,
    user: secret.username,
    password: secret.password,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await dbClient.connect();
  return dbClient;
}

exports.handler = async (event) => {
  const { httpMethod, path, pathParameters, body, requestContext } = event;
  const campaignId = pathParameters?.id;

  try {
    const db = await getDbConnection();

    // Initialize tables if they don't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organizer_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        email_subject VARCHAR(255) NOT NULL,
        email_body TEXT NOT NULL,
        recipient_list JSONB NOT NULL,
        campaign_type VARCHAR(50) NOT NULL DEFAULT 'pay-per-send',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        qr_code_url TEXT,
        campaign_url TEXT,
        max_recipients INTEGER DEFAULT 200,
        reactivation_fee_paid BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS advocates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        validation_fee_paid BOOLEAN DEFAULT FALSE,
        validation_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS campaign_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id),
        advocate_id UUID NOT NULL REFERENCES advocates(id),
        email_sent BOOLEAN DEFAULT FALSE,
        sent_at TIMESTAMP,
        recipient_email VARCHAR(255),
        personalized_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_campaigns_organizer ON campaigns(organizer_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_actions_campaign ON campaign_actions(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_actions_advocate ON campaign_actions(advocate_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_actions_date ON campaign_actions(sent_at);
    `);

    let response;

    switch (httpMethod) {
      case 'GET':
        if (campaignId) {
          // Get single campaign
          const result = await db.query(
            'SELECT * FROM campaigns WHERE id = $1',
            [campaignId]
          );
          response = {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(result.rows[0] || null),
          };
        } else {
          // List campaigns
          const organizerId = event.queryStringParameters?.organizer_id;
          let query = 'SELECT * FROM campaigns';
          let params = [];

          if (organizerId) {
            query += ' WHERE organizer_id = $1';
            params.push(organizerId);
          }

          query += ' ORDER BY created_at DESC';

          const result = await db.query(query, params);
          response = {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(result.rows),
          };
        }
        break;

      case 'POST':
        // Create campaign
        const {
          organizer_id,
          title,
          email_subject,
          email_body,
          recipient_list,
          campaign_type = 'pay-per-send',
          expires_at,
        } = JSON.parse(body || '{}');

        if (!organizer_id || !title || !email_subject || !email_body || !recipient_list) {
          response = {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Missing required fields' }),
          };
          break;
        }

        // Validate recipient list (max 200)
        if (recipient_list.length > 200) {
          response = {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Recipient list cannot exceed 200 emails' }),
          };
          break;
        }

        // Generate campaign URL and QR code URL
        const campaignUrl = `${process.env.FRONTEND_URL}/campaign/${campaignId || 'new'}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(campaignUrl)}`;

        const insertResult = await db.query(
          `INSERT INTO campaigns (
            organizer_id, title, email_subject, email_body, recipient_list,
            campaign_type, expires_at, campaign_url, qr_code_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            organizer_id,
            title,
            email_subject,
            email_body,
            JSON.stringify(recipient_list),
            campaign_type,
            expires_at,
            campaignUrl,
            qrCodeUrl,
          ]
        );

        // Update campaign URL with actual ID
        const newCampaign = insertResult.rows[0];
        const actualCampaignUrl = `${process.env.FRONTEND_URL}/campaign/${newCampaign.id}`;
        const actualQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(actualCampaignUrl)}`;

        await db.query(
          'UPDATE campaigns SET campaign_url = $1, qr_code_url = $2 WHERE id = $3',
          [actualCampaignUrl, actualQrCodeUrl, newCampaign.id]
        );

        newCampaign.campaign_url = actualCampaignUrl;
        newCampaign.qr_code_url = actualQrCodeUrl;

        response = {
          statusCode: 201,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(newCampaign),
        };
        break;

      case 'PUT':
        // Update campaign
        if (!campaignId) {
          response = {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Campaign ID required' }),
          };
          break;
        }

        const updateData = JSON.parse(body || '{}');
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        Object.keys(updateData).forEach((key) => {
          if (key !== 'id' && key !== 'created_at') {
            updateFields.push(`${key} = $${paramIndex}`);
            updateValues.push(
              key === 'recipient_list' ? JSON.stringify(updateData[key]) : updateData[key]
            );
            paramIndex++;
          }
        });

        if (updateFields.length === 0) {
          response = {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'No fields to update' }),
          };
          break;
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(campaignId);

        const updateResult = await db.query(
          `UPDATE campaigns SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
          updateValues
        );

        response = {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(updateResult.rows[0]),
        };
        break;

      case 'DELETE':
        // Delete campaign
        if (!campaignId) {
          response = {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Campaign ID required' }),
          };
          break;
        }

        await db.query('DELETE FROM campaigns WHERE id = $1', [campaignId]);

        response = {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ message: 'Campaign deleted successfully' }),
        };
        break;

      default:
        response = {
          statusCode: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    return response;
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};

