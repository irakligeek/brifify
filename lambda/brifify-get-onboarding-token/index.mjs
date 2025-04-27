/**
 * Lambda function to retrieve onboarding tokens by email
 * This function is called by the frontend after stripe checkout redirect
 * to check if an onboarding token exists for a given email
 */
import { DynamoDBClient, ScanCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const dynamo = new DynamoDBClient({});
const TABLE_NAME = process.env.DYNAMO_TABLE;

/**
 * Gets an onboarding token for a given email if it exists
 * @param {string} email - User's email address
 * @param {string} sessionId - Stripe checkout session ID
 * @returns {Promise<Object|null>} - Returns token object or null if not found
 */
async function getOnboardingToken(email, sessionId) {
  if (!email) {
    throw new Error("Email is required");
  }
  
  try {
    // First, try a direct lookup by userId if sessionId is provided
    if (sessionId) {
      const getParams = {
        TableName: TABLE_NAME,
        Key: {
          userId: { S: `ONBOARDING#${sessionId}` },
          recordType: { S: "ONBOARDING_TOKEN" }
        }
      };
      
      const getResult = await dynamo.send(new GetItemCommand(getParams));
      
      if (getResult.Item) {
        const tokenRecord = unmarshall(getResult.Item);
        
        return {
          token: sessionId, // The session ID is the token
          cognitoUserId: tokenRecord.cognitoUserId,
          expiresAt: tokenRecord.expiresAt
        };
      }
    }
    
    // Fallback to a scan with filters
    const filterExpressions = ["recordType = :recordType", "email = :email"];
    const expressionAttributeValues = {
      ":recordType": { S: "ONBOARDING_TOKEN" },
      ":email": { S: email }
    };
    
    // Add sessionId to filter if provided
    if (sessionId) {
      filterExpressions.push("userId = :userId");
      expressionAttributeValues[":userId"] = { S: `ONBOARDING#${sessionId}` };
    }
    
    const scanParams = {
      TableName: TABLE_NAME,
      FilterExpression: filterExpressions.join(" AND "),
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: 1
    };
    
    const scanResult = await dynamo.send(new ScanCommand(scanParams));
    
    if (scanResult.Items && scanResult.Items.length > 0) {
      const tokenRecord = unmarshall(scanResult.Items[0]);
      // The token is part of the userId (format: ONBOARDING#<sessionId>)
      const parts = tokenRecord.userId.split('#');
      const token = parts.length > 1 ? parts[1] : sessionId; // Extract sessionId from userId
      
      return {
        token,
        cognitoUserId: tokenRecord.cognitoUserId,
        expiresAt: tokenRecord.expiresAt
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error retrieving onboarding token:", error);
    throw error;
  }
}

export const handler = async (event) => {
  try {
    //get from query string
    const { email, session_id: sessionId } = event.queryStringParameters;
    
    // Validate email and sessionId
    if (!email || !sessionId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ 
          success: false,
          message: 'Missing required parameters. Email address and session ID are required'
        })
      };
    }
    
    // Retrieve onboarding token for email and sessionId
    const tokenInfo = await getOnboardingToken(email, sessionId);
    
    if (!tokenInfo) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          success: false,
          message: 'No onboarding token found for this email'
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        success: true,
        message: 'Onboarding token retrieved successfully',
        ...tokenInfo
      })
    };
    
  } catch (error) {
    console.error('Error handling request:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ 
        success: false,
        message: 'Internal server error: ' + error.message
      })
    };
  }
};