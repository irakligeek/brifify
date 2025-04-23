"use strict";
import {
  DynamoDBClient,
  QueryCommand
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

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
    const { userId } = body;

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing userId parameter" }),
      };
    }

    // Query for user briefs
    const briefsData = await dynamo.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "userId = :userId AND begins_with(recordType, :recordType)",
        ExpressionAttributeValues: {
          ":userId": { S: userId },
          ":recordType": { S: RECORD_TYPE }
        }
      })
    );

    // If no briefs found, return false
    if (!briefsData.Items || briefsData.Items.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          briefs: false
        }),
      };
    }

    // Transform the briefs data
    const briefs = briefsData.Items.map(item => unmarshall(item));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        briefs
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};