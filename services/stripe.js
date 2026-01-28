const Stripe = require('stripe');

let stripeClient = null;

function getStripe() {
  if (stripeClient) return stripeClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

function buildLineItems(cart) {
  return (cart || []).map(item => ({
    price_data: {
      currency: 'sgd',
      product_data: {
        name: item.name || 'Item'
      },
      unit_amount: Math.round(Number(item.price) * 100)
    },
    quantity: Math.max(1, Number(item.quantity) || 1)
  }));
}

async function createCheckoutSession(cart, baseUrl) {
  const stripe = getStripe();
  const lineItems = buildLineItems(cart);
  if (!lineItems.length) {
    throw new Error('Cart is empty');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    success_url: `${baseUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/stripe/cancel`
  });

  return session;
}

async function retrieveSession(sessionId) {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId);
}

module.exports = {
  createCheckoutSession,
  retrieveSession
};
