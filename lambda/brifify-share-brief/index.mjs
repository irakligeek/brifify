import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';


const s3 = new S3Client({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const { brief } = JSON.parse(event.body || "{}");

    if (!brief || !brief.project_title || !brief.description || !brief.features) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required brief fields" }),
      };
    }

    const {
      project_title,
      description,
      features,
      technical_requirements,
      platform,
      technology_stack,
      notes,
    } = brief;

    const timestamp = Date.now();
    const uniqueId = uuidv4();
    const filename = `${uniqueId}-${timestamp}.html`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${project_title}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; max-width: 800px; margin: auto; }
          h1 { color: #2c2c2c; }
          h2 { margin-top: 30px; color: #2c2c2c; }
          ul { padding-left: 20px; }
        </style>
      </head>
      <body>
        <h1>${project_title}</h1>
        <p>${description}</p>

        <h2>Features</h2>
        <ul>${features.map(f => `<li>${f}</li>`).join("")}</ul>

        ${technical_requirements ? `<h2>Technical Requirements</h2><ul>${technical_requirements.map(req => `<li>${req}</li>`).join("")}</ul>` : ""}
        ${technology_stack ? `<h2>Technology Stack</h2><ul>${technology_stack.map(stack => `<li>${stack}</li>`).join("")}</ul>` : ""}
        ${platform ? `<h2>Platform</h2><p>${platform}</p>` : ""}
        ${notes ? `<h2>Notes</h2><p>${notes}</p>` : ""}
      </body>
      </html>
    `;

    const command = new PutObjectCommand({
      Bucket: process.env.BRIEF_BUCKET_NAME,
      Key: filename,
      Body: html,
      ContentType: "text/html",
    });

    await s3.send(command);

    const url = `https://${process.env.BRIEF_BUCKET_NAME}.s3.us-east-1.amazonaws.com/${filename}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url }),
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
