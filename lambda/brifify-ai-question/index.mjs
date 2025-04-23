"use strict";
import OpenAI from "openai";
import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const dynamo = new DynamoDBClient({});
const TABLE_NAME = process.env.DYNAMO_TABLE;
const RECORD_TYPE = "USER_PROFILE"; // Define record type for user profiles

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const QUESTION_LIMIT = 10;
const ASSISTANT_NAME = "Technical Specification Assistant";

const INSTRUCTIONS = `
You are a technical specification assistant for non-technical people. 
Based on the user's project description, ask relevant follow-up questions 
that a developer would need to fully understand the project requirements. 
Ask one question at a time and focus on critical aspects. 
Do not include numbers in your questions.
Stop asking when you've collected enough information to start building the project. 
Respond with 'done' when you have no more questions.
`;

async function createAssistant() {
  const assistant = await openai.beta.assistants.create({
    name: ASSISTANT_NAME,
    instructions: `${INSTRUCTIONS}\nLimit to ${QUESTION_LIMIT} essential questions.`,
    model: "gpt-3.5-turbo-0125",
  });
  return assistant.id;
}

async function waitForRunCompletion(threadId, runId) {
  let run;
  do {
    await new Promise((res) => setTimeout(res, 1000));
    run = await openai.beta.threads.runs.retrieve(threadId, runId);
  } while (["in_progress", "queued"].includes(run.status));
  return run;
}

async function getLastAssistantMessage(threadId) {
  const messages = await openai.beta.threads.messages.list(threadId);
  return (
    messages.data
      .filter((msg) => msg.role === "assistant")
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      ?.content[0]?.text?.value || ""
  );
}

async function getUserProfile(userId) {
  // Get user profile from DynamoDB
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
    return null; // User not found - should be created separately
  }

  return unmarshall(userData.Item);
}

export const handler = async (event) => {
  try {
    const body = event.body;
    const { userId, messages, userThreadId } = body;

    if (!Array.isArray(messages) || messages.length === 0 || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required parameters" }),
      };
    }

    // Get user profile - expected to already exist
    const user = await getUserProfile(userId);
    
    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "User not found." }),
      };
    }
    
    // Use token count to determine remaining briefs
    const availableTokens = user.tokens || 0;

    // Check if user has tokens available
    if (availableTokens <= 0) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ 
          error: "No tokens available",
          remainingBriefs: 0,
          availableTokens: 0
        }),
      };
    }

    const assistantId = process.env.ASSISTANT_ID || (await createAssistant());

    let threadId = userThreadId;
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
    }

    const lastMessage = messages[messages.length - 1];
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: lastMessage.content,
    });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });
    await waitForRunCompletion(threadId, run.id);
    const reply = await getLastAssistantMessage(threadId);

    if (reply.toLowerCase().includes("done")) {
      // Update token count only when brief is complete
      // Deduct one token, but no longer track generationCount
      const newTokens = availableTokens - 1;
      
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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: reply, 
          threadId,
          remainingBriefs: newTokens,
          availableTokens: newTokens
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: reply, 
        threadId,
        remainingBriefs: availableTokens,
        availableTokens: availableTokens
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
