"use strict";
import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const dynamo = new DynamoDBClient({});
const TABLE_NAME = process.env.DYNAMO_TABLE;
const RECORD_TYPE = "BRIEF";

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

    // Check for required project_title field and briefId
    if (!briefData.project_title || !briefData.briefId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "briefData must contain project_title and briefId" }),
      };
    }
    
    // Use the briefId from the briefData
    const briefId = briefData.briefId;
    const timestamp = new Date().getTime();
    
    // Check if the brief already exists
    const existingBriefQuery = await dynamo.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "userId = :userId AND recordType = :recordType",
        ExpressionAttributeValues: {
          ":userId": { S: userId },
          ":recordType": { S: `${RECORD_TYPE}#${briefId}` }
        },
        Limit: 1
      })
    );
    
    const briefExists = existingBriefQuery.Items && existingBriefQuery.Items.length > 0;
    
    // Create the brief record - store the entire briefData object as is
    const briefRecord = {
      userId: userId,
      recordType: `${RECORD_TYPE}#${briefId}`,
      briefId: briefId,
      title: briefData.project_title, // Using project_title as the title
      briefData: briefData, // Store the entire briefData JSON
      updatedAt: timestamp
    };
    
    // If this is a new brief, add createdAt timestamp
    if (!briefExists) {
      briefRecord.createdAt = timestamp;
    }

    // Save to DynamoDB
    await dynamo.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall(briefRecord)
      })
    );
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: briefExists ? "Brief updated successfully" : "Brief saved successfully",
        briefId: briefId
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