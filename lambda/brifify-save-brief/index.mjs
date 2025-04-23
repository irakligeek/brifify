"use strict";
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const dynamo = new DynamoDBClient({});
const TABLE_NAME = process.env.DYNAMO_TABLE;
const RECORD_TYPE = "BRIEF";
const USER_RECORD_TYPE = "USER_PROFILE";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { userId, briefData } = body;

    if (!userId || !briefData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing userId or briefData" }),
      };
    }

    // Check for required project_title field
    if (!briefData.project_title) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "briefData must contain project_title" }),
      };
    }
    
    // Check if user has available tokens
    const userData = await dynamo.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          userId: { S: userId },
          recordType: { S: USER_RECORD_TYPE }
        },
      })
    );
    
    if (!userData.Item) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "User not found" }),
      };
    }
    
    const user = unmarshall(userData.Item);
    const availableTokens = user.tokens || 0;
    
    if (availableTokens < 1) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "No tokens available" }),
      };
    }

    // Generate a unique briefId using timestamp and a random string
    const timestamp = new Date().getTime();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const briefId = `${timestamp}-${randomStr}`;

    // Create the brief record - store the entire briefData object as is
    const briefRecord = {
      userId: userId,
      recordType: `${RECORD_TYPE}#${briefId}`,
      briefId: briefId,
      title: briefData.project_title, // Using project_title as the title
      briefData: briefData, // Store the entire briefData JSON
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Save to DynamoDB
    await dynamo.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall(briefRecord)
      })
    );
    
    // Deduct a token from the user
    await dynamo.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: {
          userId: { S: userId },
          recordType: { S: USER_RECORD_TYPE }
        },
        UpdateExpression: "SET tokens = :newTokens, generationCount = generationCount + :one, lastUpdated = :timestamp",
        ExpressionAttributeValues: {
          ":newTokens": { N: (availableTokens - 1).toString() },
          ":one": { N: "1" },
          ":timestamp": { S: new Date().toISOString() }
        },
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Brief saved successfully",
        briefId: briefId,
        remainingTokens: availableTokens - 1
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Server Error", details: error.message }),
    };
  }
};