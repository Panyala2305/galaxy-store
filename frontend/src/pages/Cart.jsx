// frontend/src/pages/Cart.jsx
//
// Shows all cart items with quantity controls.
// Has a checkout button that places an order via the orders API,
// then clears the cart and redirects to orders page.

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchCart,
  clearCartOnServer,
  selectCartItems,
  selectCartTotal,
  selectCartLoading,
} from '../features/cartSlice';
import { selectIsLoggedIn } from '../features/authSlice';
import CartItem from '../components/CartItem';
import API from '../api/axios';

export default function Cart() {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const isLoggedIn  = useSelector(selectIsLoggedIn);
  const items       = useSelector(selectCartItems);
  const total       = useSelector(selectCartTotal);
  const isLoading   = useSelector(selectCartLoading);

  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError,   setOrderError]   = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    dispatch(fetchCart());
  }, [isLoggedIn, dispatch, navigate]);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setOrderLoading(true);
    setOrderError('');
    try {
      // Place the order — backend creates order + order_items rows
      await API.post('/orders', {
        items: items.map(i => ({
          productId: i.product_id,
          quantity:  i.quantity,
          price:     i.price,
        })),
        totalPrice: total,
      });
      // Clear cart after successful order
      await dispatch(clearCartOnServer());
      navigate('/orders');
    } catch (err) {
      setOrderError(err.response?.data?.error || 'Order failed. Please try again.');
    } finally {
      setOrderLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-gray-500 mt-3 text-sm">Loading cart...</p>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🛒 Your Cart</h1>

      {items.length === 0 ? (
        /* Empty cart state */
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-gray-600 font-medium text-lg">Your cart is empty</p>
          <p className="text-gray-400 text-sm mt-1">Add some products to get started</p>
          <Link
            to="/"
            className="inline-block mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl
                       font-semibold text-sm hover:bg-indigo-700 transition"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Cart items list */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-4">
              {items.length} item{items.length !== 1 ? 's' : ''} in your cart
            </p>
            {items.map(item => (
              <CartItem key={item.cart_id} item={item} />
            ))}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-20">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Order Summary</h2>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal ({items.length} items)</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between font-bold text-gray-900 text-base">
                  <span>Total</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {orderError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs">
                  {orderError}
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={orderLoading}
                className="w-full mt-5 py-3 bg-indigo-600 text-white font-semibold rounded-xl text-sm
                           hover:bg-indigo-700 transition active:scale-95
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {orderLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Placing order...
                  </span>
                ) : '✦ Place Order'}
              </button>

              <Link
                to="/"
                className="block text-center text-sm text-indigo-600 hover:underline mt-3"
              >
                ← Continue shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
