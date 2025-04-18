"use strict";
import OpenAI from 'openai';

export const handler = async (event) => {
  const qLimit = 3;
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const body = event.body;
    const { messages, userThreadId } = body;
    
    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid or missing message history" }),
      };
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create or retrieve assistant
    const assistant = await openai.beta.assistants.create({
      name: "Technical Specification Assistant",
      instructions: `You are a technical specification assistant for non-technical people. 
      Based on the user's project description, 
      ask relevant follow-up questions that a developer would need to fully understand the project requirements. 
      Your goal is to gather enough information without unnecessary details. 
      Ask one question at a time and focus on critical aspects that will impact the development. 
      Do not include question numbers in your responses, only the questions themselves.
      Limit the total number of questions to ${qLimit}, stopping once you have gathered the most essential details for the project. 
      When no more questions are needed, respond with the string 'done'.`,
      // model: "gpt-4-0125-preview",
      model:  "gpt-3.5-turbo-0125",
    });

    let thread;
    let threadId = userThreadId;

    // Create new thread if it's the first message, otherwise use existing thread
    if (!threadId) {
      thread = await openai.beta.threads.create();
      threadId = thread.id;
    }

    // Add the new message to the thread
    const lastMessage = messages[messages.length - 1];
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: lastMessage.content
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistant.id,
    });

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    // Get the assistant's response
    const messages_list = await openai.beta.threads.messages.list(threadId);
    const lastAssistantMessage = messages_list.data
      .filter(msg => msg.role === 'assistant')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    const response = {
      message: lastAssistantMessage.content[0].text.value,
      threadId: threadId
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
