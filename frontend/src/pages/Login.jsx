// frontend/src/pages/Login.jsx
//
// Login form — email + password.
// On success, user is stored in Redux and redirected to home.
// Redirects to home automatically if already logged in.

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  loginUser,
  clearError,
  selectAuthLoading,
  selectAuthError,
  selectIsLoggedIn,
} from '../features/authSlice';

export default function Login() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const isLoading  = useSelector(selectAuthLoading);
  const error      = useSelector(selectAuthError);
  const isLoggedIn = useSelector(selectIsLoggedIn);

  const [form, setForm] = useState({ email: '', password: '' });

  // If already logged in, redirect home
  useEffect(() => {
    if (isLoggedIn) navigate('/');
  }, [isLoggedIn, navigate]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => dispatch(clearError());
  }, [dispatch]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) dispatch(clearError()); // clear error on new input
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginUser(form));
    if (loginUser.fulfilled.match(result)) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-4xl">🌌</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your Galaxy Store account</p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6 text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                           text-sm transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                           text-sm transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm
                         hover:bg-indigo-700 transition active:scale-95
                         disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
