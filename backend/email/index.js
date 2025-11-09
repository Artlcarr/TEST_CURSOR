const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const sesClient = new SESClient({ region: process.env.SES_REGION || process.env.AWS_REGION });
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
  const { body } = event;

  try {
    const {
      campaign_id,
      advocate_id,
      recipient_email,
      recipient_name,
      personalized_message,
      advocate_name,
      advocate_email,
      email_subject,
      email_body,
      send_method = 'smtp', // 'oauth' or 'smtp'
    } = JSON.parse(body || '{}');

    if (!campaign_id || !advocate_id || !recipient_email || !advocate_name || !email_subject || !email_body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const db = await getDbConnection();

    // Check if advocate has already sent email today for this campaign
    const today = new Date().toISOString().split('T')[0];
    const existingAction = await db.query(
      `SELECT * FROM campaign_actions 
       WHERE campaign_id = $1 
       AND advocate_id = $2 
       AND DATE(sent_at) = $3`,
      [campaign_id, advocate_id, today]
    );

    if (existingAction.rows.length > 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Limit of 1 outreach email per advocate per day per campaign',
        }),
      };
    }

    // Get campaign details
    const campaignResult = await db.query(
      'SELECT * FROM campaigns WHERE id = $1',
      [campaign_id]
    );

    if (campaignResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Campaign not found' }),
      };
    }

    const campaign = campaignResult.rows[0];

    // Check campaign status
    if (campaign.status !== 'active') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Campaign is not active' }),
      };
    }

    // Personalize email
    const personalizedBody = personalized_message || email_body;
    const greeting = recipient_name ? `Dear ${recipient_name},` : 'Dear Representative,';
    const finalBody = `${greeting}\n\n${personalizedBody}\n\nSincerely,\n${advocate_name}`;

    let emailSent = false;
    let errorMessage = null;

    if (send_method === 'oauth') {
      // OAuth sending - this would integrate with Gmail/Outlook API
      // For now, we'll use SMTP as fallback
      // TODO: Implement OAuth integration
      console.log('OAuth sending not yet implemented, using SMTP');
    }

    // SMTP sending via SES
    try {
      const command = new SendEmailCommand({
        Source: `"${advocate_name}" <${advocate_email || 'noreply@togetherunite.com'}>`,
        Destination: {
          ToAddresses: [recipient_email],
        },
        Message: {
          Subject: {
            Data: email_subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: finalBody,
              Charset: 'UTF-8',
            },
          },
        },
        ConfigurationSetName: 'togetherunite-bounces',
      });

      await sesClient.send(command);
      emailSent = true;
    } catch (error) {
      console.error('SES send error:', error);
      errorMessage = error.message;
    }

    // Record action in database
    await db.query(
      `INSERT INTO campaign_actions (
        campaign_id, advocate_id, email_sent, sent_at,
        recipient_email, personalized_message
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)`,
      [campaign_id, advocate_id, emailSent, recipient_email, personalizedBody]
    );

    if (!emailSent) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Failed to send email',
          message: errorMessage,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Email sent successfully',
        sent_at: new Date().toISOString(),
      }),
    };
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

