"use strict";
import OpenAI from "openai";
import {
  DynamoDBClient,
  GetItemCommand,
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
  let attempts = 0;
  const maxAttempts = 30; // Add maximum retry attempts
  
  do {
    if (attempts >= maxAttempts) {
      throw new Error("Run completion timeout exceeded");
    }
    
    await new Promise((res) => setTimeout(res, 1000));
    run = await openai.beta.threads.runs.retrieve(threadId, runId);
    attempts++;
  } while (["in_progress", "queued"].includes(run.status));
  
  if (run.status === "failed") {
    throw new Error(`Run failed: ${run.last_error?.message || "Unknown error"}`);
  }
  
  return run;
}

async function getLastAssistantMessage(threadId) {
  try {
    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessages = messages.data
      .filter((msg) => msg.role === "assistant")
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (assistantMessages.length === 0) {
      return "Could you tell me more about your project?";
    }
    
    const messageContent = assistantMessages[0]?.content[0]?.text?.value;
    
    if (!messageContent) {
      return "Could you provide more details about your requirements?";
    }
    
    return messageContent;
  } catch (error) {
    console.error("Error fetching messages:", error);
    return "Could you tell me more about your project? I had trouble processing your last response.";
  }
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
    // Safely parse the body
    let body;
    if (typeof event.body === 'string') {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: "Invalid JSON in request body",
            message: "Invalid request format"
          })
        };
      }
    } else {
      body = event.body;
    }
    
    const { userId, messages, userThreadId } = body;

    if (!Array.isArray(messages) || messages.length === 0 || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: "Missing required parameters",
          message: "Please provide all required parameters"
        }),
      };
    }

    // Get user profile - expected to already exist
    const user = await getUserProfile(userId);
    
    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: "User not found.",
          message: "User profile could not be found"
        }),
      };
    }
    
    // Use token count to determine remaining briefs
    const availableTokens = user.tokens || 0;

    // Only block if tokens are strictly equal to 0
    if (availableTokens <= 0) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ 
          error: "No tokens available",
          message: "You've reached the free brief limit. Get more tokens to continue!",
          remainingBriefs: 0,
          availableTokens: 0
        }),
      };
    }

    try {
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

      // Check for 'done' more flexibly, ignoring case
      const isDone = reply.toLowerCase().trim().includes("done");

      if (isDone) {
        // IMPORTANT CHANGE: Don't update token count here anymore
        // Just return the 'done' message and let generate-brief handle token deduction
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            message: "done", 
            threadId,
            remainingBriefs: availableTokens, // Just pass the current token count without changing it
            availableTokens: availableTokens
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
          availableTokens
        }),
      };
    } catch (aiError) {
      console.error("OpenAI API Error:", aiError);
      
      // Even if OpenAI fails, return a structured error response
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: "AI Service Error",
          message: "Could you tell me more about your project? I had trouble processing your last response.",
          threadId: userThreadId || "error-recovery",
          remainingBriefs: availableTokens,
          availableTokens
        }),
      };
    }
  } catch (error) {
    console.error("Error:", error);
    // Always return a valid JSON response even in error cases
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Internal Server Error", 
        message: "I encountered an error. Please try again.",
        details: error.message
      }),
    };
  }
};
