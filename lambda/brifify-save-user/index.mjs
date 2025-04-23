"use strict";
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
const FREE_INITIAL_TOKENS = 3;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { userId } = body;
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing userId" }),
      };
    }

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
      // User exists, update last login time and return existing user
      const existingUser = unmarshall(userData.Item);
      
      // Update user data if needed
      await dynamo.send(
        new UpdateItemCommand({
          TableName: TABLE_NAME,
          Key: {
            userId: { S: userId },
            recordType: { S: RECORD_TYPE }
          },
          UpdateExpression: "SET lastUpdated = :updated",
          ExpressionAttributeValues: {
            ":updated": { S: timestamp }
          },
        })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "User updated successfully",
          user: {
            ...existingUser,
            isNew: false,
            remainingBriefs: existingUser.tokens || 0
          }
        }),
      };
    } else {
      // Create new user
      // Determine if anonymous based on sub field presence
      const isAnonymous = !body.sub;
      const email = body.email || null;
      
      const newUser = {
        userId,
        recordType: RECORD_TYPE,
        isAnonymous,
        email,
        tokens: FREE_INITIAL_TOKENS,
        createdAt: timestamp,
        lastUpdated: timestamp
      };

      // Add external identity info if available
      if (body.sub) {
        newUser.identityProvider = body.identities?.[0]?.providerName || "Cognito";
        newUser.externalId = body.identities?.[0]?.userId || body.sub;
      }

      await dynamo.send(
        new PutItemCommand({
          TableName: TABLE_NAME,
          Item: marshall(newUser)
        })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "User created successfully",
          user: {
            ...newUser,
            isNew: true,
            remainingBriefs: FREE_INITIAL_TOKENS
          }
        }),
      };
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Server Error", details: error.message }),
    };
  }
};