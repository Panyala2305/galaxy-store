// frontend/src/components/Navbar.jsx
//
// Top navigation bar with:
// - Logo (left)
// - Search input (center) — triggers live search
// - Cart count badge, Orders, Profile, Logout (right)
// Shows different links depending on whether user is logged in

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser, selectUser } from '../features/authSlice';
import { clearCartLocally, selectCartItemCount } from '../features/cartSlice';
import { searchProducts, setSearchQuery, selectSearchQuery } from '../features/productSlice';

export default function Navbar() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const user      = useSelector(selectUser);
  const cartCount = useSelector(selectCartItemCount);
  const query     = useSelector(selectSearchQuery);

  // Debounce search — wait 400ms after user stops typing before calling API
  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(() => {
      dispatch(searchProducts(query));
    }, 400);
    return () => clearTimeout(timer); // cleanup on next keystroke
  }, [query, dispatch]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    dispatch(clearCartLocally()); // clear cart state on logout
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">

        {/* LEFT — Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🌌</span>
          <span className="font-bold text-xl text-gray-900 tracking-tight">
            Galaxy<span className="text-indigo-600">Store</span>
          </span>
        </Link>

        {/* CENTER — Search */}
        <div className="flex-1 max-w-xl mx-auto relative">
          <input
            type="text"
            placeholder="Search products..."
            value={query}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                dispatch(searchProducts(query));
                navigate('/');
              }
            }}
            className="w-full px-4 py-2 pl-10 rounded-full border border-gray-300 bg-gray-50
                       focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                       text-sm transition"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        </div>

        {/* RIGHT — Nav links */}
        <div className="flex items-center gap-1 shrink-0">
          {user ? (
            <>
              {/* Cart with badge */}
              <Link
                to="/cart"
                className="relative flex items-center gap-1 px-3 py-2 rounded-lg text-sm
                           text-gray-700 hover:bg-gray-100 transition font-medium"
              >
                🛒
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white
                                   text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
                <span className="hidden sm:inline">Cart</span>
              </Link>

              <Link
                to="/orders"
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm
                           text-gray-700 hover:bg-gray-100 transition font-medium"
              >
                📦 <span className="hidden sm:inline">Orders</span>
              </Link>

              <Link
                to="/profile"
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm
                           text-gray-700 hover:bg-gray-100 transition font-medium"
              >
                {/* Show first letter of name as avatar */}
                <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold
                                  flex items-center justify-center text-xs uppercase">
                  {user.name?.[0]}
                </span>
                <span className="hidden sm:inline">{user.name?.split(' ')[0]}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm
                           text-red-600 hover:bg-red-50 transition font-medium"
              >
                ↩ <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition font-medium"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white
                           hover:bg-indigo-700 transition font-medium rounded-full"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
