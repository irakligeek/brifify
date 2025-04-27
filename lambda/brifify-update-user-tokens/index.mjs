/**
 * Lambda function to update user tokens in DynamoDB
 * This function checks if a user exists, updates their tokens if they do,
 * or creates a placeholder user if they don't.
 */
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { randomBytes } from "crypto";

const dynamo = new DynamoDBClient({});
const lambda = new LambdaClient({});
const TABLE_NAME = process.env.DYNAMO_TABLE;
const RECORD_TYPE = "USER_PROFILE";
const CREATE_COGNITO_USER_FUNCTION = process.env.CREATE_COGNITO_USER_FUNCTION || 'brifify-create-cognito-user';
const FREE_INITIAL_TOKENS = 2; // Default initial tokens for new users

/**
 * Generates a random onboarding token for password reset flow
 * @returns {string} - A random hex string to use as onboarding token
 */
function generateOnboardingToken() {
  // Generate a random 24-byte token and convert to hex
  return randomBytes(24).toString('hex');
}

/**
 * Updates user tokens in DynamoDB
 * @param {string} userId - The user's ID
 * @param {string} email - The user's email
 * @param {number} tokens - The tokens to add
 * @returns {Promise<Object|null>} - The updated user or null if update failed
 */
async function updateUserTokens(userId, email, tokens, sessionId = null) {
  if (!userId || !email || tokens <= 0) {
    console.error(`Missing required parameters: userId=${userId}, email=${email}, tokens=${tokens}`);
    return null;
  }

  try {
    // Check if user exists
    const userData = await dynamo.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          userId: { S: userId },
          recordType: { S: RECORD_TYPE }
        },
      })
    );

    const timestamp = new Date().toISOString();
    
    if (userData.Item) {
      // User exists, update tokens
      const existingUser = unmarshall(userData.Item);
      const currentTokens = existingUser.tokens || 0;
      const newTokens = currentTokens + tokens;
      
      // Update user tokens
      await dynamo.send(
        new UpdateItemCommand({
          TableName: TABLE_NAME,
          Key: {
            userId: { S: userId },
            recordType: { S: RECORD_TYPE }
          },
          UpdateExpression: "SET tokens = :tokens, lastUpdated = :updated",
          ExpressionAttributeValues: {
            ":tokens": { N: newTokens.toString() },
            ":updated": { S: timestamp }
          },
        })
      );
      
      console.log(`Successfully updated token count for user ${userId}: ${currentTokens} -> ${newTokens}`);
      return { ...existingUser, tokens: newTokens };

    } else {
      // User doesn't exist, create user in Cognito and then DynamoDB with Cognito user ID
      try {
        // Invoke the brifify-create-cognito-user Lambda to create user in Cognito
        const params = {
          FunctionName: CREATE_COGNITO_USER_FUNCTION,
          InvocationType: 'RequestResponse', // Synchronous invocation
          // Pass email directly in the event object
          Payload: JSON.stringify({
            email: email
          })
        };
        
        // Call the Lambda function
        const response = await lambda.send(new InvokeCommand(params));
        const payload = Buffer.from(response.Payload).toString('utf-8');
        const result = JSON.parse(payload);
        
        if (result.statusCode !== 200) {
          console.error('Error creating Cognito user:', result);
          throw new Error(`Failed to create Cognito user: ${result.body?.error || 'Unknown error'}`);
        }
        
        // Parse response body
        const cognitoResponse = JSON.parse(result.body);
        const cognitoUser = cognitoResponse.user;
        
        if (!cognitoUser || !cognitoUser.userId) {
          throw new Error('Invalid response from Cognito user creation');
        }
        
        // Generate onboarding token and expiration time (15 minutes from now)
        // const onboardingToken = generateOnboardingToken();
        const currentTime = new Date();
        const expirationTime = new Date(currentTime.getTime() + 15 * 60 * 1000); // 15 minutes in milliseconds
        const expirationTimestamp = Math.floor(expirationTime.getTime() / 1000); // Unix timestamp in seconds
        
        // Now create the user in DynamoDB with the Cognito user ID
        const timestamp = new Date().toISOString();
        const totalTokens = FREE_INITIAL_TOKENS + tokens; // Initial tokens + additional tokens
        
        const newUser = {
          userId: cognitoUser.userId, 
          recordType: RECORD_TYPE,
          email: email,
          isAnonymous: false, // This is now a registered Cognito user
          tokens: totalTokens,
          createdAt: timestamp,
          lastUpdated: timestamp
        };
        
        // Save to DynamoDB
        await dynamo.send(
          new PutItemCommand({
            TableName: TABLE_NAME,
            Item: marshall(newUser)
          })
        );
        
        // Create a separate onboarding token record with TTL for automatic deletion after 15 minutes
        const onboardingRecord = {
          userId: `ONBOARDING#${sessionId}`,
          recordType: 'ONBOARDING_TOKEN',
          cognitoUserId: cognitoUser.userId,
          email: email,
          createdAt: timestamp,
          expiresAt: expirationTimestamp,
          ttl: expirationTimestamp // DynamoDB TTL attribute for automatic deletion
        };
        
        // Save onboarding record to DynamoDB
        await dynamo.send(
          new PutItemCommand({
            TableName: TABLE_NAME,
            Item: marshall(onboardingRecord)
          })
        );
        
        console.log(`Successfully created new user ${cognitoUser.userId} in DynamoDB with ${totalTokens} tokens and onboarding token expiring in 15 minutes`);
        return { ...newUser, tokens: totalTokens };

      } catch (createError) {
        console.error("Error creating user:", createError);
        throw createError; // Rethrow to be handled by the main handler
      }
    }
  } catch (error) {
    console.error("Error updating user tokens:", error);
    return null;
  }
}

export const handler = async (event) => {
  try {
    // Parse the request body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    
    // Extract parameters from the request
    const { userId, email, tokens, sessionId } = body;
    
    // Validate required parameters
    if (!userId || !email || !tokens) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required parameters', 
          details: 'userId, email, and tokens must be provided' 
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
};