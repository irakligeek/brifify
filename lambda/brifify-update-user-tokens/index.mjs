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

const dynamo = new DynamoDBClient({});
const TABLE_NAME = process.env.DYNAMO_TABLE;
const RECORD_TYPE = "USER_PROFILE";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Updates user tokens in DynamoDB
 * @param {string} userId - The user's ID
 * @param {string} email - The user's email
 * @param {number} tokens - The tokens to add
 * @returns {Promise<Object|null>} - The updated user or null if update failed
 */
async function updateUserTokens(userId, email, tokens) {
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
      //... User doesn't exist, create user in Cognito and and then DynamoDB with Cognito user ID
      console.log(`User ${userId} does not exist, a new user will be created in both Cognito and dynamoDB`);

      
      
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
    const { userId, email, tokens } = body;
    
    // Validate required parameters
    if (!userId || !email || !tokens) {
      return {
        statusCode: 400,
        headers,
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
        headers,
        body: JSON.stringify({ 
          error: 'Invalid token amount', 
          details: 'tokens must be a positive number' 
        })
      };
    }
    
    // Update user tokens in database
    const result = await updateUserTokens(userId, email, tokenAmount);
    
    if (!result) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to update user tokens',
          details: 'Internal server error occurred while updating tokens'
        })
      };
    }
    
    return {
      statusCode: 200,
      headers,
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
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};