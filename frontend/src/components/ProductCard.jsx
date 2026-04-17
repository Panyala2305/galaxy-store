// frontend/src/components/ProductCard.jsx
//
// Displays a single product in the grid.
// Handles: add to cart, already-in-cart state, out of stock.

import { useDispatch, useSelector } from 'react-redux';
import { addToCart, selectIsInCart } from '../features/cartSlice';
import { selectIsLoggedIn } from '../features/authSlice';
import { useNavigate } from 'react-router-dom';

export default function ProductCard({ product }) {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const isLoggedIn  = useSelector(selectIsLoggedIn);
  const alreadyIn   = useSelector(selectIsInCart(product.id));

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      navigate('/login');  // redirect to login if not authenticated
      return;
    }
    dispatch(addToCart({ productId: product.id, quantity: 1 }));
  };

  const isOutOfStock = product.stock === 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md
                    transition-all duration-200 overflow-hidden group flex flex-col">

      {/* Product image */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <img
          src={product.image || 'https://placehold.co/400x400?text=No+Image'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.target.src = 'https://placehold.co/400x400?text=No+Image'; }}
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-800 text-xs font-semibold px-3 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">
          {product.name}
        </h3>
        <p className="text-gray-500 text-xs line-clamp-2 mb-3 flex-1">
          {product.description}
        </p>

        <div className="flex items-center justify-between gap-2">
          {/* Price */}
          <span className="text-lg font-bold text-gray-900">
            ₹{Number(product.price).toLocaleString('en-IN')}
          </span>

          {/* Add to cart button */}
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || alreadyIn}
            className={`
              px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150
              ${isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : alreadyIn
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
              }
            `}
          >
            {isOutOfStock ? 'Unavailable' : alreadyIn ? '✓ Added' : '+ Cart'}
          </button>
        </div>

        {/* Low stock warning */}
        {product.stock > 0 && product.stock <= 5 && (
          <p className="text-orange-500 text-xs mt-2 font-medium">
            Only {product.stock} left!
          </p>
        )}
      </div>
    </div>
  );
}
