import Stripe from 'stripe';

// Initialize Stripe with your secret key (use environment variables in production)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Define product options with their Stripe Price IDs and token quantities
const PRODUCTS = {
  '20_tokens': {
    priceId: process.env.STRIPE_PRICE_ID_20_TOKENS, // Price ID for 20 tokens package ($4.99)
    tokens: 20
  },
  '100_tokens': {
    priceId: process.env.STRIPE_PRICE_ID_100_TOKENS, // Price ID for 100 tokens package ($14.99)
    tokens: 100
  }
};

export const handler = async (event) => {
  try {
    // Parse the request body (if it's a string)
    const requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    
    // Extract params from the request
    const { productId, userId, email } = requestBody || {};
    
    // Ensure a valid product is selected
    if (!productId || !PRODUCTS[productId]) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          error: 'Invalid product selection',
        }),
      };
    }
    
    // Get the selected product details
    const product = PRODUCTS[productId];

    // Set up the session parameters using the price ID
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          // Use the price ID of the product from Stripe
          price: product.priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Modified URLs to use parameters instead of routes
      success_url: `${process.env.FRONTEND_URL}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}?checkout=cancel`,
      metadata: {
        userId: userId || 'anonymous',
        productId: productId,
        tokens: product.tokens.toString(),
      },
    };
    
    // Only add customer_email if it's a valid email
    if (email) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Return the session ID to the client
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Restrict this in production
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*', // Restrict this in production
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};