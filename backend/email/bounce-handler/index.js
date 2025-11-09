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
  try {
    // Parse SNS notification
    const snsMessage = JSON.parse(event.Records[0].Sns.Message);
    const notificationType = snsMessage.notificationType;
    const mail = snsMessage.mail || {};

    const db = await getDbConnection();

    if (notificationType === 'Bounce') {
      const bounce = snsMessage.bounce;
      const bouncedRecipients = bounce.bouncedRecipients || [];

      for (const recipient of bouncedRecipients) {
        const emailAddress = recipient.emailAddress;
        const bounceType = recipient.bounceType; // 'Permanent' or 'Transient'

        // Find campaign actions with this recipient email
        const actions = await db.query(
          `SELECT ca.*, c.organizer_id 
           FROM campaign_actions ca
           JOIN campaigns c ON ca.campaign_id = c.id
           WHERE ca.recipient_email = $1
           ORDER BY ca.sent_at DESC
           LIMIT 1`,
          [emailAddress]
        );

        if (actions.rows.length > 0) {
          const action = actions.rows[0];

          if (bounceType === 'Permanent') {
            // Permanently remove from recipient list
            // Update campaign recipient list to remove this email
            const campaignResult = await db.query(
              'SELECT recipient_list FROM campaigns WHERE id = $1',
              [action.campaign_id]
            );

            if (campaignResult.rows.length > 0) {
              const recipientList = campaignResult.rows[0].recipient_list || [];
              const updatedList = recipientList.filter(
                (recipient) => recipient.email !== emailAddress
              );

              await db.query(
                'UPDATE campaigns SET recipient_list = $1 WHERE id = $2',
                [JSON.stringify(updatedList), action.campaign_id]
              );

              // Notify organizer
              // TODO: Send notification to organizer about bounced email
              console.log(
                `Permanent bounce for ${emailAddress} in campaign ${action.campaign_id}. Notifying organizer ${action.organizer_id}`
              );
            }
          } else {
            // Transient bounce - temporarily remove, can retry later
            console.log(
              `Transient bounce for ${emailAddress} in campaign ${action.campaign_id}`
            );
          }

          // Mark action as bounced
          await db.query(
            `UPDATE campaign_actions 
             SET email_sent = false 
             WHERE id = $1`,
            [action.id]
          );
        }
      }
    } else if (notificationType === 'Complaint') {
      // Handle spam complaints
      const complaint = snsMessage.complaint;
      const complainedRecipients = complaint.complainedRecipients || [];

      for (const recipient of complainedRecipients) {
        const emailAddress = recipient.emailAddress;

        // Find and handle complaint
        const actions = await db.query(
          `SELECT ca.*, c.organizer_id 
           FROM campaign_actions ca
           JOIN campaigns c ON ca.campaign_id = c.id
           WHERE ca.recipient_email = $1
           ORDER BY ca.sent_at DESC
           LIMIT 1`,
          [emailAddress]
        );

        if (actions.rows.length > 0) {
          const action = actions.rows[0];

          // Remove from recipient list permanently
          const campaignResult = await db.query(
            'SELECT recipient_list FROM campaigns WHERE id = $1',
            [action.campaign_id]
          );

          if (campaignResult.rows.length > 0) {
            const recipientList = campaignResult.rows[0].recipient_list || [];
            const updatedList = recipientList.filter(
              (recipient) => recipient.email !== emailAddress
            );

            await db.query(
              'UPDATE campaigns SET recipient_list = $1 WHERE id = $2',
              [JSON.stringify(updatedList), action.campaign_id]
            );

            // Notify organizer
            console.log(
              `Complaint for ${emailAddress} in campaign ${action.campaign_id}. Notifying organizer ${action.organizer_id}`
            );
          }
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Bounce handled successfully' }),
    };
  } catch (error) {
    console.error('Error handling bounce:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};

