import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
      const userId = session.metadata?.userId;
      const tokens = parseInt(session.metadata?.tokens || '0', 10);
      const customerEmail = session.customer_details?.email;
      
      // console.log(`Processing payment for user ${userId}, email: ${customerEmail}, tokens: ${tokens}`);
      
      // TODO: Update user tokens in database
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