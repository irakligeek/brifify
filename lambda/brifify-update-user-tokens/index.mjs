/**
 * Lambda function to update user tokens in DynamoDB
 * This function first ensures the user exists in Cognito, then updates their tokens in DynamoDB.
 */
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const dynamo = new DynamoDBClient({});
const lambda = new LambdaClient({});
const TABLE_NAME = process.env.DYNAMO_TABLE;
const RECORD_TYPE = "USER_PROFILE";
const CREATE_COGNITO_USER_FUNCTION = process.env.CREATE_COGNITO_USER_FUNCTION || 'brifify-create-cognito-user';
const FREE_INITIAL_TOKENS = 2; // Default initial tokens for new users

/**
 * Creates or finds a user in Cognito by email
 * 
 * @param {string} email - The user's email address
 * @returns {Promise<Object>} - Object containing legitimate Cognito userId and email
 */
async function ensureCognitoUser(email) {
  if (!email) {
    throw new Error("Email is required to ensure Cognito user");
  }

  try {
    // Invoke the brifify-create-cognito-user Lambda
    const params = {
      FunctionName: CREATE_COGNITO_USER_FUNCTION,
      InvocationType: 'RequestResponse', // Synchronous invocation
      Payload: JSON.stringify({ email })
    };
    
    // Call the Lambda function
    const response = await lambda.send(new InvokeCommand(params));
    const payload = Buffer.from(response.Payload).toString('utf-8');
    const result = JSON.parse(payload);
    
    if (result.statusCode !== 200 && result.statusCode !== 201) {
      console.error('Error ensuring Cognito user:', result);
      throw new Error(`Failed to ensure Cognito user: ${result.body?.error || 'Unknown error'}`);
    }
    
    // Parse response body
    const responseBody = JSON.parse(result.body);
    
    if (!responseBody.user || !responseBody.user.userId) {
      throw new Error('Invalid response from Cognito user creation');
    }
    
    return {
      userId: responseBody.user.userId, // This is the legitimate Cognito sub value
      email: responseBody.user.email,
      isNewUser: result.statusCode === 201 // Status 201 means a new user was created
    };
  } catch (error) {
    console.error("Error ensuring Cognito user:", error);
    throw error;
  }
}

/**
 * Fetches a user from DynamoDB by their Cognito userId
 * 
 * @param {string} userId - Cognito user ID (sub)
 * @returns {Promise<Object|null>} - User object or null if not found
 */
async function getUserFromDynamoDB(userId) {
  if (!userId) {
    return null;
  }

  try {
    const userData = await dynamo.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          userId: { S: userId },
          recordType: { S: RECORD_TYPE }
        },
      })
    );
    
    return userData.Item ? unmarshall(userData.Item) : null;
  } catch (error) {
    console.error("Error fetching user from DynamoDB:", error);
    return null;
  }
}

/**
 * Creates a new user in DynamoDB with specified email, userId and tokens
 * 
 * @param {string} userId - Cognito user ID (sub)
 * @param {string} email - User's email
 * @param {number} tokens - Number of tokens to assign
 * @returns {Promise<Object>} - The newly created user object
 */
async function createUserInDynamoDB(userId, email, tokens) {
  const timestamp = new Date().toISOString();
  const totalTokens = FREE_INITIAL_TOKENS + tokens;
  
  const newUser = {
    userId,
    recordType: RECORD_TYPE,
    email,
    isAnonymous: false,
    tokens: totalTokens,
    createdAt: timestamp,
    lastUpdated: timestamp
  };
  
  await dynamo.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(newUser)
    })
  );
  
  return newUser;
}

/**
 * Updates existing user's tokens in DynamoDB
 * 
 * @param {Object} user - Existing user object
 * @param {number} tokensToAdd - Number of tokens to add
 * @returns {Promise<Object>} - Updated user object
 */
async function updateUserTokensInDynamoDB(user, tokensToAdd) {
  const timestamp = new Date().toISOString();
  const currentTokens = user.tokens || 0;
  const newTokens = currentTokens + tokensToAdd;
  
  await dynamo.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        userId: { S: user.userId },
        recordType: { S: RECORD_TYPE }
      },
      UpdateExpression: "SET tokens = :tokens, lastUpdated = :updated",
      ExpressionAttributeValues: {
        ":tokens": { N: newTokens.toString() },
        ":updated": { S: timestamp }
      },
    })
  );
  
  return { ...user, tokens: newTokens, lastUpdated: timestamp };
}

/**
 * Creates an onboarding token record in DynamoDB for session tracking
 * 
 * @param {string} sessionId - Client session ID
 * @param {string} cognitoUserId - Legitimate Cognito user ID
 * @param {string} email - User's email
 * @returns {Promise<void>}
 */
async function createOnboardingTokenRecord(sessionId, cognitoUserId, email) {
  if (!sessionId) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const currentTime = new Date();
  const expirationTime = new Date(currentTime.getTime() + 15 * 60 * 1000); // 15 minutes in milliseconds
  const expirationTimestamp = Math.floor(expirationTime.getTime() / 1000); // Unix timestamp in seconds
  
  const onboardingRecord = {
    userId: `ONBOARDING#${sessionId}`,
    recordType: 'ONBOARDING_TOKEN',
    cognitoUserId,
    email,
    createdAt: timestamp,
    expiresAt: expirationTimestamp,
    ttl: expirationTimestamp // DynamoDB TTL attribute for automatic deletion
  };
  
  await dynamo.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(onboardingRecord)
    })
  );
}

/**
 * Main function to update user tokens
 * This function first ensures a legitimate Cognito user, then updates their tokens in DynamoDB
 * 
 * @param {string} clientUserId - User ID from client (may be temporary)
 * @param {string} email - User's email
 * @param {number} tokens - Tokens to add
 * @param {string} sessionId - Client session ID for anonymous users
 * @returns {Promise<Object|null>} - Updated user object or null on failure
 */
async function updateUserTokens(clientUserId, email, tokens, sessionId = null) {
  if (!email || tokens <= 0) {
    console.error(`Missing required parameters: email=${email}, tokens=${tokens}`);
    return null;
  }

  try {
    // Step 1: Ensure the user exists in Cognito and get legitimate userId
    const cognitoUser = await ensureCognitoUser(email);
    const legitimateUserId = cognitoUser.userId;
    const isNewCognitoUser = cognitoUser.isNewUser;
    
    console.log(`Using legitimate Cognito userId: ${legitimateUserId} for email: ${email}, isNew: ${isNewCognitoUser}`);
    
    // Step 2: Check if user already exists in DynamoDB
    let dbUser = await getUserFromDynamoDB(legitimateUserId);
    
    // Step 3: Either update existing user or create a new one
    if (dbUser) {
      // User exists in DynamoDB, update tokens
      console.log(`Updating tokens for existing user: ${legitimateUserId}`);
      dbUser = await updateUserTokensInDynamoDB(dbUser, tokens);
    } else {
      // User doesn't exist in DynamoDB, create new record
      console.log(`Creating new user in DynamoDB with ID: ${legitimateUserId}`);
      dbUser = await createUserInDynamoDB(legitimateUserId, email, tokens);
    }
    
    // Step 4: Create onboarding token record ONLY if this is a new Cognito user
    if (sessionId && isNewCognitoUser) {
      console.log(`Creating onboarding record for new user with sessionId: ${sessionId}`);
      await createOnboardingTokenRecord(sessionId, legitimateUserId, email);
    } else if (sessionId) {
      console.log(`Skipping onboarding record creation for existing user, sessionId: ${sessionId}`);
    }
    
    return dbUser;
    
  } catch (error) {
    console.error("Error in updateUserTokens:", error);
    return null;
  }
}

export const handler = async (event) => {
  try {
    // Parse the request body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    
    // Extract parameters from the request
    const { userId, email, tokens, sessionId } = body;
    
    // Email and tokens are required
    if (!email || !tokens) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required parameters', 
          details: 'email and tokens must be provided' 
        })
      };
    }
    
    // Parse tokens to ensure it's a number
    const tokenAmount = parseInt(tokens, 10);
    
    if (isNaN(tokenAmount) || tokenAmount <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid token amount', 
          details: 'tokens must be a positive number' 
        })
      };
    }
    
    // NOTE: We're ignoring the client-provided userId and using the one from Cognito instead
    // Update user tokens in database
    const result = await updateUserTokens(userId, email, tokenAmount, sessionId);
    
    if (!result) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to update user tokens',
          details: 'Internal server error occurred while updating tokens'
        })
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'User tokens updated successfully',
        user: result
      })
    };
    
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      })
    };
  }
}