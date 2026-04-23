// frontend/src/pages/Checkout.jsx
//
// This page:
//  1. Shows an order summary (items + total)
//  2. Has a "Pay Now" button
//  3. When clicked:
//     a. Calls backend → gets a Razorpay order ID
//     b. Loads the Razorpay popup (SDK injected from their CDN)
//     c. User pays with card/UPI/wallet
//     d. On success → calls backend to verify + save order
//     e. Redirects to /orders with success message
//  4. Handles all error states

import { useEffect, useState } from 'react';
import { useSelector }         from 'react-redux';
import { useNavigate, Link }   from 'react-router-dom';
import { selectCartItems, selectCartTotal } from '../features/cartSlice';
import { selectUser, selectIsLoggedIn }     from '../features/authSlice';
import API from '../api/axios';

// ─────────────────────────────────────────────
// HELPER: Load Razorpay SDK script dynamically
// Razorpay provides a JS file from their CDN.
// We load it only when the user is on the checkout page (not on every page load).
// Returns a Promise that resolves when the script is ready.
// ─────────────────────────────────────────────
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    // Check if already loaded (avoid loading twice)
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false); // failed to load (no internet?)
    document.body.appendChild(script);
  });
};

export default function Checkout() {
  const navigate   = useNavigate();
  const user       = useSelector(selectUser);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const items      = useSelector(selectCartItems);
  const total      = useSelector(selectCartTotal);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error,        setError]        = useState('');
  const [sdkReady,     setSdkReady]     = useState(false);

  // Redirect if not logged in or cart is empty
  useEffect(() => {
    if (!isLoggedIn)     { navigate('/login');  return; }
    if (items.length === 0) { navigate('/cart'); return; }
  }, [isLoggedIn, items, navigate]);

  // Pre-load Razorpay SDK as soon as this page opens (faster UX)
  useEffect(() => {
    loadRazorpayScript().then(loaded => {
      if (!loaded) setError('Failed to load payment gateway. Check your internet connection.');
      setSdkReady(loaded);
    });
  }, []);

  // ─────────────────────────────────────────────
  // MAIN PAYMENT HANDLER
  // Called when user clicks "Pay Now"
  // ─────────────────────────────────────────────
  const handlePayment = async () => {
    setIsProcessing(true);
    setError('');

    try {
      // ── STEP 1: Get Razorpay order from our backend ──
      // Our backend validates the cart and creates a Razorpay order session
      const { data } = await API.post('/payment/create-order', {
        amount:    total,
        cartItems: items,
      });

      // data = { razorpayOrderId, amount, amountInPaise, currency, keyId }

      // ── STEP 2: Configure Razorpay popup ─────────────
      const options = {
        key:      data.keyId,          // your Razorpay Key ID (starts with "rzp_test_")
        amount:   data.amountInPaise,  // in paise
        currency: data.currency,
        name:     'Galaxy Store',
        description: 'Order Payment',
        image:    '/logo.png',         // your store logo (optional)
        order_id: data.razorpayOrderId,

        // Pre-fill user's details so they don't have to type them
        prefill: {
          name:  user.name,
          email: user.email,
        },

        theme: { color: '#4f46e5' }, // indigo to match your UI

        // ── STEP 3: On payment SUCCESS ──────────────────
        // Razorpay calls this handler with payment proof
        // razorpay_signature is cryptographic proof that Razorpay processed this payment
        handler: async (response) => {
          // response = {
          //   razorpay_order_id,   ← same as what we created
          //   razorpay_payment_id, ← unique payment ID like "pay_Pxxxxx"
          //   razorpay_signature   ← HMAC signature to verify on backend
          // }
          try {
            const verifyRes = await API.post('/payment/verify', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              cartItems:           items,
              totalPrice:          total,
            });

            // Payment verified + order saved! Go to orders page
            navigate('/orders', {
              state: {
                successMessage: `Payment successful! Order #${verifyRes.data.orderId} placed.`,
                paymentId:      verifyRes.data.paymentId,
              }
            });

          } catch (verifyErr) {
            // Payment went through on Razorpay but our backend had an issue
            // Show the payment ID so user can contact support
            setError(
              verifyErr.response?.data?.error ||
              `Payment received but order saving failed. Payment ID: ${response.razorpay_payment_id}. Please contact support.`
            );
            setIsProcessing(false);
          }
        },

        // ── On payment FAILURE (wrong card, insufficient funds etc.) ──
        // Razorpay calls this if the user's payment fails
        // Note: the popup stays open and lets users retry — this fires only on permanent failure
        modal: {
          ondismiss: () => {
            // User closed the popup without paying
            setIsProcessing(false);
            setError('Payment was cancelled. You can try again.');
          },
        },
      };

      // ── STEP 4: Open Razorpay popup ──────────────────
      const rzp = new window.Razorpay(options);

      // Handle payment failure inside the popup
      rzp.on('payment.failed', (response) => {
        setError(`Payment failed: ${response.error.description}`);
        setIsProcessing(false);
      });

      rzp.open(); // 🎉 This opens the Razorpay payment modal

    } catch (err) {
      setError(err.response?.data?.error || 'Could not initiate payment. Please try again.');
      setIsProcessing(false);
    }
  };

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/cart" className="text-indigo-600 text-sm hover:underline">← Back to Cart</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Order items list ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>

          <div className="divide-y divide-gray-100">
            {items.map(item => (
              <div key={item.cart_id} className="flex items-center gap-4 py-3">
                <img
                  src={item.image || 'https://placehold.co/56x56'}
                  alt={item.name}
                  className="w-14 h-14 object-cover rounded-xl border border-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold text-gray-900 text-sm shrink-0">
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>

          {/* Delivery info */}
          <div className="mt-4 p-3 bg-green-50 rounded-xl flex items-center gap-2">
            <span>🚚</span>
            <p className="text-green-700 text-xs font-medium">
              Free delivery on this order! Estimated 3-5 business days.
            </p>
          </div>
        </div>

        {/* ── Payment panel ── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-20">
            <h2 className="font-semibold text-gray-900 mb-4">Payment Details</h2>

            {/* Price breakdown */}
            <div className="space-y-2 text-sm text-gray-600 pb-4 border-b border-gray-100">
              <div className="flex justify-between">
                <span>Subtotal ({items.length} items)</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (GST incl.)</span>
                <span>₹0</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-4 font-bold text-gray-900">
              <span>Total</span>
              <span className="text-xl">₹{total.toLocaleString('en-IN')}</span>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-700 text-xs leading-relaxed">
                {error}
              </div>
            )}

            {/* SDK not loaded warning */}
            {!sdkReady && !error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-yellow-700 text-xs">
                Loading payment gateway...
              </div>
            )}

            {/* Pay button */}
            <button
              onClick={handlePayment}
              disabled={isProcessing || !sdkReady}
              className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl text-sm
                         hover:bg-indigo-700 transition active:scale-95
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  🔒 Pay ₹{total.toLocaleString('en-IN')}
                </span>
              )}
            </button>

            {/* Accepted payment methods */}
            <div className="mt-4 text-center">
              <p className="text-gray-400 text-xs mb-2">Secured by Razorpay</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {['💳 Cards', '🏦 UPI', '📱 Wallets', '🏛️ Netbanking'].map(m => (
                  <span key={m} className="text-xs bg-gray-50 border border-gray-200
                                           px-2 py-1 rounded-lg text-gray-600">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
