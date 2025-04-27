import Stripe from 'stripe';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const lambda = new LambdaClient({});
const UPDATE_TOKENS_FUNCTION = process.env.UPDATE_TOKENS_FUNCTION || 'brifify-update-user-tokens';

// Lambda handler for Stripe webhooks with proxy integration
export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };
  
  try {
    // Log the event structure for debugging
    console.log('Event structure:', JSON.stringify({
      headersPresent: !!event.headers,
      bodyType: typeof event.body,
      bodyLength: event.body ? event.body.length : 0,
      isBase64Encoded: !!event.isBase64Encoded
    }));
    
    // Get the raw body
    let rawBody = event.body;
    
    // Handle base64 encoding
    if (event.isBase64Encoded) {
      rawBody = Buffer.from(rawBody, 'base64').toString('utf8');
    }
    
    // Get Stripe signature from headers
    const stripeSignature = event.headers['stripe-signature'] || 
                           event.headers['Stripe-Signature'];
    
    if (!stripeSignature) {
      console.error('No Stripe signature found in headers');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Stripe signature not found' })
      };
    }
    
    // Verify the webhook
    const stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      stripeSignature,
      endpointSecret
    );
  
    
    // Handle the event
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      let userId = session.metadata?.userId;
      const tokens = parseInt(session.metadata?.tokens || '0', 10);
      const customerEmail = session.customer_details?.email;
      const sessionId = session.id;
      
      if (!userId || !customerEmail || tokens <= 0) {
        console.error(`Missing required payment data: userId=${userId}, email=${customerEmail}, tokens=${tokens}`);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Missing required payment data', 
            details: 'userId, customerEmail, and tokens must be provided and valid' 
          })
        };
      }
      
      // Call the update tokens lambda function
      const params = {
        FunctionName: UPDATE_TOKENS_FUNCTION,
        InvocationType: 'RequestResponse', // Synchronous invocation
        Payload: JSON.stringify({
          body: {
            userId,
            email: customerEmail,
            tokens,
            sessionId // Include sessionId for logging or further processing
          }
        })
      };
      
      try {
        const response = await lambda.send(new InvokeCommand(params));
        const payload = Buffer.from(response.Payload).toString('utf-8');
        const result = JSON.parse(payload);
        
        if (result.statusCode !== 200) {
          console.error('Error updating tokens:', result);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to update user tokens' })
          };
        }
        
        console.log(`Successfully processed payment. Updated tokens for user ${userId}, email: ${customerEmail}, tokens: ${tokens}`);
      } catch (lambdaError) {
        console.error('Error invoking update-tokens lambda:', lambdaError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Error processing payment' })
        };
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true })
    };
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};