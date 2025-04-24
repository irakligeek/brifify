"use strict";
import OpenAI from "openai";
import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const dynamo = new DynamoDBClient({});
const TABLE_NAME = process.env.DYNAMO_TABLE;
const FREE_BRIEF_LIMIT = 3;
const RECORD_TYPE = "USER_PROFILE";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Generate a unique ID using timestamp and random string
function generateUniqueId() {
  const timestamp = new Date().getTime();
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
}

async function getUserData(userId) {
  const userData = await dynamo.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        userId: { S: userId },
        recordType: { S: RECORD_TYPE }
      },
    })
  );

  if (!userData.Item) {
    // No longer creating a new user, just return null
    return null;
  }

  return unmarshall(userData.Item);
}

export const handler = async (event) => {
  try {
    // Safely parse the body
    let body;
    if (typeof event.body === 'string') {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid JSON in request body" }),
        };
      }
    } else {
      body = event.body;
    }
    
    const { questionnaire, userId } = body;

    if (!Array.isArray(questionnaire) || questionnaire.length === 0 || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid or missing parameters" }),
      };
    }

    // Get user data and check limits
    const userData = await getUserData(userId);
    
    // Return error if user not found
    if (!userData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "User not found. Valid userId is required." }),
      };
    }
    
    const { tokens } = userData;
    const availableTokens = Math.max(0, tokens);

    if (availableTokens <= 0) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ 
          error: "Brief generation limit reached",
          remainingBriefs: 0
        }),
      };
    }

    const formattedQA = questionnaire
      .map(item => `Q: ${item.question}\nA: ${item.answer}`)
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      tool_choice: "auto",
      tools: [
        {
          type: "function",
          function: {
            name: "generateTechnicalBrief",
            description: "Generate a structured technical brief for a developer",
            parameters: {
              type: "object",
              properties: {
                project_title: {
                  type: "string",
                  description: "A concise title describing the project",
                },
                description: {
                  type: "string",
                  description: "A clear summary of what the project does",
                },
                features: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of key features required for the project",
                },
                technical_requirements: {
                  type: "array",
                  items: { type: "string" },
                  description: "Technical specs or limitations to follow",
                },
                platform: {
                  type: "string",
                  description: "The intended platform (e.g., Web, iOS, WordPress, etc.)",
                },
                technology_stack: {
                  type: "array",
                  items: { type: "string" },
                  description: "Recommended or required technologies",
                },
                notes: {
                  type: "string",
                  description: "Any additional notes or clarifications",
                },
              },
              required: ["project_title", "description", "features"],
            },
          },
        },
      ],
      messages: [
        {
          role: "system",
          content:
            "You are a senior technical writer. Based on the user's answers, generate a clean, structured technical brief using the defined function format only.",
        },
        {
          role: "user",
          content: formattedQA,
        },
      ],
    });

    const functionCall = response.choices[0].message.tool_calls?.[0];

    if (!functionCall || functionCall.function.name !== "generateTechnicalBrief") {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to generate structured brief." }),
      };
    }

    const briefData = JSON.parse(functionCall.function.arguments);
    
    // Generate a unique ID for the brief
    const briefId = generateUniqueId();
    
    // Create the final brief object with the ID included
    const brief = {
      ...briefData,
      briefId: briefId,
      createdAt: new Date().toISOString()
    };

    // Calculate the new token count after deduction
    const newTokens = availableTokens - 1;
    
    // Update the user's token count in DynamoDB
    try {
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
            ":updated": { S: new Date().toISOString() }
          },
        })
      );
      
      console.log(`Successfully updated token count for user ${userId}: ${availableTokens} -> ${newTokens}`);
    } catch (updateError) {
      console.error("Error updating token count:", updateError);
      // Continue even if token update fails, to avoid blocking the brief generation
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        brief,
        remainingBriefs: newTokens
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
