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

async function retrieveSession(sessionId, options = null) {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId, options || undefined);
}

async function refundCheckoutSession(sessionId, amount) {
  const stripe = getStripe();
  let paymentIntentId = sessionId;
  if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });
    if (!session || !session.payment_intent) {
      throw new Error('Missing Stripe payment intent');
    }
    paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent.id;
  }
  if (!paymentIntentId) {
    throw new Error('Missing Stripe payment intent');
  }

  const refundParams = { payment_intent: paymentIntentId };
  const numericAmount = Number(amount);
  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    refundParams.amount = Math.round(numericAmount * 100);
  }

  return stripe.refunds.create(refundParams);
}

module.exports = {
  createCheckoutSession,
  retrieveSession,
  refundCheckoutSession
};
