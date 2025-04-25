"use strict";
import {
  DynamoDBClient,
  DeleteItemCommand,
  GetItemCommand
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const dynamo = new DynamoDBClient({});
const TABLE_NAME = process.env.DYNAMO_TABLE;
const RECORD_TYPE = "BRIEF";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,DELETE,POST",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const handler = async (event) => {
  try {
    const body = event.body;
    const { userId, briefId } = body;

    // Validate required parameters
    if (!userId || !briefId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required parameters: userId and briefId must be provided" }),
      };
    }

    // Check if the brief exists and belongs to the user
    const briefRecordType = `${RECORD_TYPE}#${briefId}`;
    const getItemResponse = await dynamo.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          userId: { S: userId },
          recordType: { S: briefRecordType }
        }
      })
    );

    // If brief not found or doesn't belong to user
    if (!getItemResponse.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Brief not found or does not belong to the specified user" }),
      };
    }

    // Brief exists and belongs to user, proceed with deletion
    await dynamo.send(
      new DeleteItemCommand({
        TableName: TABLE_NAME,
        Key: {
          userId: { S: userId },
          recordType: { S: briefRecordType }
        }
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Brief deleted successfully",
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
