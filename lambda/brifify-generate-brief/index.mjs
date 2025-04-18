"use strict";
import OpenAI from "openai";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    // const body = event.body;
    // const { questionnaire } = body;
    const questionnaire = event?.questionnaire;

    if (!Array.isArray(questionnaire) || questionnaire.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid or missing questionnaire array" }),
      };
    }

    const formattedQA = questionnaire
      .map(item => `Q: ${item.question}\nA: ${item.answer}`)
      .join("\n\n");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      tool_choice: "auto", // let OpenAI auto-pick the function
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
      body: JSON.stringify({ brief }),
    };
  } catch (error) {
    console.error("Error generating structured brief:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
