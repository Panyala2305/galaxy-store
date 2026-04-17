// frontend/src/pages/Orders.jsx
//
// Shows the user's order history.
// Each order shows: order ID, date, status, total, and list of items.

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectIsLoggedIn } from '../features/authSlice';
import API from '../api/axios';

// Status badge colors
const STATUS_STYLES = {
  pending:    'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped:    'bg-purple-100 text-purple-800',
  delivered:  'bg-green-100 text-green-800',
  cancelled:  'bg-red-100 text-red-800',
};

export default function Orders() {
  const navigate   = useNavigate();
  const isLoggedIn = useSelector(selectIsLoggedIn);

  const [orders,    setOrders]    = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState('');
  const [expanded,  setExpanded]  = useState(null); // which order is expanded

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

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
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
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Order header — always visible */}
              <button
                onClick={() => toggleExpand(order.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition text-left"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Order #{order.id}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{formatDate(order.created_at)}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize
                    ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status}
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

              {/* Expanded order items */}
              {expanded === order.id && (
                <div className="border-t border-gray-100 px-5 pb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide my-3">
                    Items
                  </p>
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
