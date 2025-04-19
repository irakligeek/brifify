"use strict";
import OpenAI from "openai";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand
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
    // If user doesn't exist, create a new anonymous user profile
    const newUser = {
      userId,
      recordType: RECORD_TYPE,
      isAnonymous: true, // All users are anonymous by default until they authenticate
      generationCount: 0,
      tokens: 0,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    await dynamo.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          userId: { S: userId },
          recordType: { S: RECORD_TYPE },
          isAnonymous: { BOOL: true },
          generationCount: { N: "0" },
          tokens: { N: "0" },
          createdAt: { S: newUser.createdAt },
          lastUpdated: { S: newUser.lastUpdated }
        },
      })
    );
    return newUser;
  }

  return unmarshall(userData.Item);
}

export const handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
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
    const { generationCount, tokens } = userData;
    const remainingBriefs = Math.max(0, FREE_BRIEF_LIMIT - generationCount);

    if (generationCount > FREE_BRIEF_LIMIT && tokens <= 0) {
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

    const brief = JSON.parse(functionCall.function.arguments);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        brief,
        remainingBriefs
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
