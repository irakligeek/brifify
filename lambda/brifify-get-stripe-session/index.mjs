/**
 * Lambda function to retrieve Stripe session data by session ID
 * This function allows validation of user purchases by retrieving details from
 * a Stripe checkout session, including customer email and purchased products.
 */
import Stripe from 'stripe';

// Initialize Stripe with your secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Retrieves detailed information about a Stripe checkout session
 * @param {string} sessionId - The Stripe checkout session ID
 * @returns {Promise<Object>} - The session data with expanded objects
 */
async function getStripeSessionData(sessionId) {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }

  try {
    // Retrieve the session with expanded line items and customer details
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {
        expand: [
          'line_items',
          'line_items.data.price.product',
          'customer',
          'payment_intent'
        ]
      }
    );

    return session;
  } catch (error) {
    console.error('Error retrieving Stripe session:', error);
    throw error;
  }
}

/**
 * Extracts relevant purchase information from a Stripe session
 * @param {Object} session - The Stripe session data
 * @returns {Object} - Simplified purchase information
 */
function extractPurchaseInfo(session) {
  if (!session) return null;

  // Extract basic session information
  const purchaseInfo = {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    paymentIntent: session.payment_intent?.id || null,
    createdAt: new Date(session.created * 1000).toISOString(),
    amountTotal: session.amount_total / 100, // Convert from cents to dollars
    currency: session.currency,
    customerEmail: session.customer_details?.email || session.customer_email || null,
    customer: session.customer || null,
    paymentMethod: session.payment_method_types?.[0] || null,
  };

  // Extract metadata (including userId and tokens)
  if (session.metadata) {
    purchaseInfo.metadata = {
      userId: session.metadata.userId || null,
      tokens: parseInt(session.metadata.tokens || '0', 10),
      productId: session.metadata.productId || null
    };
  }

  // Extract purchased items
  if (session.line_items?.data) {
    purchaseInfo.items = session.line_items.data.map(item => ({
      productId: item.price?.product?.id || null,
      productName: item.price?.product?.name || null,
      quantity: item.quantity,
      unitAmount: (item.price?.unit_amount || 0) / 100, // Convert from cents to dollars
      totalAmount: (item.amount_total || 0) / 100 // Convert from cents to dollars
    }));
  }

  return purchaseInfo;
}

/**
 * Lambda handler for retrieving Stripe session data
 */
export const handler = async (event) => {
  // Set CORS headers for browser clients
  const headers = {
    'Access-Control-Allow-Origin': '*', // Restrict this in production
    'Access-Control-Allow-Credentials': true,
    'Content-Type': 'application/json'
  };

  try {
    // Parse the request body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    
    // Extract the session ID from the request
    const { sessionId } = body || {};
    
    // Validate the session ID
    if (!sessionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing session ID', 
          details: 'sessionId is required in the request body' 
        })
      };
    }
    
    // Retrieve the session data from Stripe
    const sessionData = await getStripeSessionData(sessionId);
    
    // Extract relevant purchase information
    const purchaseInfo = extractPurchaseInfo(sessionData);
    
    // Return the processed session data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        session: purchaseInfo
      })
    };
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Handle Stripe API errors
    if (error.type && error.type.startsWith('Stripe')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Stripe API error',
          type: error.type,
          details: error.message
        })
      };
    }
    
    // Handle other errors
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};