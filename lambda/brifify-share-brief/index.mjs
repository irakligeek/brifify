import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" });

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// Helper: turn snake_case to Title Case
const formatKey = (key) => {
  return key.replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
};

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const body = event.body;
    const brief = body.briefData || body.brief;

    if (!brief || !brief.project_title || !brief.briefId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required brief fields including briefId" }),
      };
    }

    const { briefId } = brief;
    const createdAt = brief.createdAt || new Date().toISOString();
    const filename = `${briefId}.html`;

    // Check if brief exists
    try {
      const getCommand = new GetObjectCommand({
        Bucket: process.env.BRIEF_BUCKET_NAME,
        Key: filename
      });
      await s3.send(getCommand);

      const longUrl = `https://${process.env.BRIEF_BUCKET_NAME}.s3.us-east-1.amazonaws.com/${filename}`;
      const shortUrl = await shortenUrl(longUrl);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ url: shortUrl }),
      };
    } catch (error) {
      if (error.name !== 'NoSuchKey' && !error.message?.includes('Not Found')) {
        throw error;
      }
    }

    const formattedDate = formatDate(createdAt);

    // Build dynamic HTML
    const excludedFields = new Set(['briefId', 'createdAt']);
    const sections = Object.entries(brief)
      .filter(([key, value]) => !excludedFields.has(key) && value)
      .map(([key, value]) => {
        const title = formatKey(key);
        if (Array.isArray(value)) {
          return `<h2>${title}</h2><ul>${value.map(item => `<li>${item}</li>`).join("")}</ul>`;
        } else {
          return `<h2>${title}</h2><p>${value}</p>`;
        }
      })
      .join("\n");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${brief.project_title}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; max-width: 800px; margin: auto; }
          h1 { color: #2c2c2c; }
          h2 { margin-top: 30px; color: #2c2c2c; }
          ul { padding-left: 20px; }
          footer { margin-top: 50px; text-align: center; font-size: 0.8em; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <h1>${brief.project_title}</h1>
        ${sections}
        <footer>
          Generated on ${formattedDate} by <a href="https://brifify.ai">brifify.ai</a>
        </footer>
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

    const longUrl = `https://${process.env.BRIEF_BUCKET_NAME}.s3.us-east-1.amazonaws.com/${filename}`;
    const shortUrl = await shortenUrl(longUrl);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: shortUrl }),
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

// Native fetch to TinyURL service
async function shortenUrl(longUrl) {
  const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
  if (!response.ok) {
    throw new Error('Failed to shorten URL');
  }
  return await response.text();
}
