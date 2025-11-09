const Stripe = require('stripe');
const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
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
  const { httpMethod, path, body, headers } = event;

  try {
    // Stripe webhook handler
    if (path.includes('/webhook')) {
      const sig = headers['stripe-signature'] || headers['Stripe-Signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let stripeEvent;
      try {
        stripeEvent = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Webhook Error: ${err.message}` }),
        };
      }

      const db = await getDbConnection();

      // Handle different event types
      switch (stripeEvent.type) {
        case 'checkout.session.completed':
          const session = stripeEvent.data.object;
          const metadata = session.metadata || {};

          if (metadata.payment_type === 'validation_fee') {
            // Update advocate validation
            await db.query(
              `UPDATE advocates 
               SET validation_fee_paid = true, 
                   validation_expires_at = CURRENT_TIMESTAMP + INTERVAL '1 year'
               WHERE user_id = $1`,
              [metadata.user_id]
            );
          } else if (metadata.payment_type === 'campaign_subscription') {
            // Update campaign subscription
            await db.query(
              `UPDATE campaigns 
               SET status = 'active'
               WHERE id = $1`,
              [metadata.campaign_id]
            );
          } else if (metadata.payment_type === 'email_send') {
            // Record email send payment
            await db.query(
              `INSERT INTO campaign_actions (campaign_id, advocate_id, email_sent, sent_at)
               VALUES ($1, $2, true, CURRENT_TIMESTAMP)`,
              [metadata.campaign_id, metadata.advocate_id]
            );
          }
          break;

        case 'invoice.payment_succeeded':
          const invoice = stripeEvent.data.object;
          const invoiceMetadata = invoice.metadata || {};

          if (invoiceMetadata.subscription_type === 'campaign_unlimited') {
            // Renew campaign subscription
            await db.query(
              `UPDATE campaigns 
               SET status = 'active', updated_at = CURRENT_TIMESTAMP
               WHERE id = $1`,
              [invoiceMetadata.campaign_id]
            );
          }
          break;

        case 'invoice.payment_failed':
          const failedInvoice = stripeEvent.data.object;
          const failedMetadata = failedInvoice.metadata || {};

          if (failedMetadata.subscription_type === 'campaign_unlimited') {
            // Mark campaign as inactive
            await db.query(
              `UPDATE campaigns 
               SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
               WHERE id = $1`,
              [failedMetadata.campaign_id]
            );
          }
          break;
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ received: true }),
      };
    }

    // Regular payment creation
    const { payment_type, amount, currency = 'usd', user_id, campaign_id, advocate_id, metadata = {} } = JSON.parse(body || '{}');

    if (!payment_type || !amount) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    let checkoutSession;

    switch (payment_type) {
      case 'validation_fee':
        // $2.99 validation fee
        checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: currency,
                product_data: {
                  name: 'TogetherUnite Validation Fee',
                  description: 'Annual validation fee for Advocate/Organizer',
                },
                unit_amount: 299, // $2.99
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
          metadata: {
            payment_type: 'validation_fee',
            user_id: user_id,
          },
        });
        break;

      case 'campaign_unlimited':
        // $29.99/month campaign subscription
        checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: currency,
                product_data: {
                  name: 'Campaign Unlimited Subscription',
                  description: 'Monthly subscription for unlimited campaign',
                },
                unit_amount: 2999, // $29.99
                recurring: {
                  interval: 'month',
                },
              },
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
          metadata: {
            payment_type: 'campaign_subscription',
            subscription_type: 'campaign_unlimited',
            campaign_id: campaign_id,
            user_id: user_id,
          },
        });
        break;

      case 'email_send':
        // $2.99 per email send
        checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: currency,
                product_data: {
                  name: 'Campaign Email Send',
                  description: 'Pay-per-send email outreach',
                },
                unit_amount: 299, // $2.99
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
          metadata: {
            payment_type: 'email_send',
            campaign_id: campaign_id,
            advocate_id: advocate_id,
          },
        });
        break;

      case 'campaign_reactivation':
        // $29.99 campaign reactivation
        checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: currency,
                product_data: {
                  name: 'Campaign Reactivation',
                  description: 'Reactivation fee for archived campaign',
                },
                unit_amount: 2999, // $29.99
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
          metadata: {
            payment_type: 'campaign_reactivation',
            campaign_id: campaign_id,
            user_id: user_id,
          },
        });
        break;

      case 'donation':
        // Donation with 4.5% + $0.50 fee
        const donationAmount = Math.round(amount * 100); // Convert to cents
        checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: currency,
                product_data: {
                  name: 'Campaign Donation',
                  description: metadata.description || 'Donation to campaign organizer',
                },
                unit_amount: donationAmount,
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          payment_intent_data: {
            application_fee_amount: Math.round(donationAmount * 0.045 + 50), // 4.5% + $0.50
          },
          success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
          metadata: {
            payment_type: 'donation',
            campaign_id: campaign_id,
            advocate_id: advocate_id,
            ...metadata,
          },
        });
        break;

      default:
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Invalid payment type' }),
        };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
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

