// frontend/src/components/CartItem.jsx
//
// Renders a single row in the cart page.
// Handles quantity increment/decrement and remove.

import { useDispatch } from 'react-redux';
import { updateCartQuantity, removeFromCart } from '../features/cartSlice';

export default function CartItem({ item }) {
  const dispatch = useDispatch();

  const handleQuantityChange = (newQty) => {
    if (newQty < 1) {
      // Confirm before removing
      if (window.confirm('Remove this item from cart?')) {
        dispatch(removeFromCart(item.cart_id));
      }
      return;
    }
    dispatch(updateCartQuantity({ cartId: item.cart_id, quantity: newQty }));
  };

  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">

      {/* Product image */}
      <img
        src={item.image || 'https://placehold.co/80x80?text=?'}
        alt={item.name}
        className="w-20 h-20 object-cover rounded-xl border border-gray-100 shrink-0"
        onError={(e) => { e.target.src = 'https://placehold.co/80x80?text=?'; }}
      />

      {/* Product details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 text-sm truncate">{item.name}</h4>
        <p className="text-indigo-600 font-bold text-sm mt-0.5">
          ₹{Number(item.price).toLocaleString('en-IN')}
        </p>
        <p className="text-gray-400 text-xs mt-0.5">
          Subtotal: ₹{(item.price * item.quantity).toLocaleString('en-IN')}
        </p>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => handleQuantityChange(item.quantity - 1)}
          className="w-8 h-8 rounded-full border border-gray-300 text-gray-600
                     hover:bg-gray-100 flex items-center justify-center font-bold text-lg transition"
        >
          −
        </button>
        <span className="w-6 text-center font-semibold text-gray-900 text-sm">
          {item.quantity}
        </span>
        <button
          onClick={() => handleQuantityChange(item.quantity + 1)}
          className="w-8 h-8 rounded-full border border-gray-300 text-gray-600
                     hover:bg-gray-100 flex items-center justify-center font-bold text-lg transition"
        >
          +
        </button>
      </div>

      {/* Remove button */}
      <button
        onClick={() => dispatch(removeFromCart(item.cart_id))}
        className="text-red-400 hover:text-red-600 transition text-lg shrink-0 ml-1"
        title="Remove item"
      >
        🗑
      </button>
    </div>
  );
}
