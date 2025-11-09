const { CognitoIdentityProviderClient, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
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
    const { action, user_id, email, name } = JSON.parse(body || '{}');

    if (action === 'get_user') {
      // Get user from Cognito
      try {
        const command = new AdminGetUserCommand({
          UserPoolId: process.env.USER_POOL_ID,
          Username: user_id,
        });
        const cognitoUser = await cognitoClient.send(command);

        // Get or create advocate record
        const db = await getDbConnection();
        let result = await db.query(
          'SELECT * FROM advocates WHERE user_id = $1',
          [user_id]
        );

        if (result.rows.length === 0) {
          // Create new advocate
          const insertResult = await db.query(
            `INSERT INTO advocates (user_id, email, name)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [
              user_id,
              email || cognitoUser.UserAttributes.find((attr) => attr.Name === 'email')?.Value,
              name || cognitoUser.UserAttributes.find((attr) => attr.Name === 'name')?.Value,
            ]
          );
          result = insertResult;
        }

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            user: cognitoUser,
            advocate: result.rows[0],
          }),
        };
      } catch (error) {
        if (error.name === 'UserNotFoundException') {
          return {
            statusCode: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'User not found' }),
          };
        }
        throw error;
      }
    }

    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Invalid action' }),
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

