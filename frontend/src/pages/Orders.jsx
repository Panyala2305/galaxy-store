// frontend/src/pages/Orders.jsx  (UPDATED)
//
// CHANGE: Reads a success message from navigation state
// (passed by Checkout.jsx after payment succeeds)
// and shows a green banner at the top.

import { useEffect, useState } from 'react';
import { useSelector }         from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { selectIsLoggedIn }    from '../features/authSlice';
import API from '../api/axios';

const STATUS_STYLES = {
  pending:    'bg-yellow-100 text-yellow-800',
  paid:       'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped:    'bg-purple-100 text-purple-800',
  delivered:  'bg-teal-100 text-teal-800',
  cancelled:  'bg-red-100 text-red-800',
};

const STATUS_ICONS = {
  pending: '⏳', paid: '✅', processing: '⚙️',
  shipped: '🚚', delivered: '📦', cancelled: '❌',
};

export default function Orders() {
  const navigate   = useNavigate();
  const location   = useLocation(); // read state passed via navigate()
  const isLoggedIn = useSelector(selectIsLoggedIn);

  const [orders,    setOrders]    = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState('');
  const [expanded,  setExpanded]  = useState(null);

  // Success message passed from Checkout page after payment
  // location.state = { successMessage: '...', paymentId: '...' }
  const successMessage = location.state?.successMessage;
  const paymentId      = location.state?.paymentId;

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    loadOrders();
  }, [isLoggedIn, navigate]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await API.get('/orders');
      setOrders(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-gray-500 mt-3 text-sm">Loading orders...</p>
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">

      {/* Success banner — shown right after payment */}
      {successMessage && (
        <div className="bg-green-50 border border-green-300 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-semibold text-green-800">{successMessage}</p>
            {paymentId && (
              <p className="text-green-600 text-xs mt-1">
                Payment ID: <span className="font-mono">{paymentId}</span>
              </p>
            )}
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-6">📦 Your Orders</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-6">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📦</p>
          <p className="text-gray-600 font-medium text-lg">No orders yet</p>
          <p className="text-gray-400 text-sm mt-1">Your order history will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              <button
                onClick={() => setExpanded(prev => prev === order.id ? null : order.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Order #{order.id}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{formatDate(order.created_at)}</p>
                    {order.payment_id && (
                      <p className="text-gray-300 text-xs font-mono mt-0.5">
                        {order.payment_id}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize
                    ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {STATUS_ICONS[order.status]} {order.status}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900 text-sm">
                    ₹{Number(order.total_price).toLocaleString('en-IN')}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {expanded === order.id ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {expanded === order.id && (
                <div className="border-t border-gray-100 px-5 pb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide my-3">Items</p>
                  <div className="space-y-3">
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image || 'https://placehold.co/40x40'}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-gray-400 text-xs">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-semibold text-gray-700">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
