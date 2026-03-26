import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async tourId => {
  try {
    if (!window.Stripe) {
      throw new Error('Stripe.js is not loaded');
    }

    const stripe = window.Stripe(process.env.STRIPE_PUBLIC_KEY);

    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    console.log('session', session.data);

    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    console.error(err);
    showAlert('error', err.message || 'Something went wrong');
  }
};
