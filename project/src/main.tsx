import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import App from './App.tsx';
import './index.css';

const stripePromise = loadStripe('pk_test_...'); // Use your Stripe publishable key

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/plots">
      <Elements stripe={stripePromise}>
        <App />
      </Elements>
    </BrowserRouter>
  </StrictMode>
);
