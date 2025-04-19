"use strict";
import {
  DynamoDBClient,
  GetItemCommand
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const dynamo = new DynamoDBClient({});
const TABLE_NAME = process.env.DYNAMO_TABLE;
const FREE_BRIEF_LIMIT = 3;
const RECORD_TYPE = "USER_PROFILE";

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

    // Try to get existing user
    const userData = await dynamo.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          userId: { S: userId },
          recordType: { S: RECORD_TYPE }
        },
      })
    );

    // If no user found, they have all free briefs available
    if (!userData.Item) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          remainingBriefs: FREE_BRIEF_LIMIT,
          totalBriefs: FREE_BRIEF_LIMIT,
          usedBriefs: 0
        }),
      };
    }

    const user = unmarshall(userData.Item);
    const usedBriefs = user.generationCount || 0;
    const remainingBriefs = Math.max(0, FREE_BRIEF_LIMIT - usedBriefs);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        remainingBriefs,
        totalBriefs: FREE_BRIEF_LIMIT,
        usedBriefs
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