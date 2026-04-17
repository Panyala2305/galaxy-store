// frontend/src/pages/Register.jsx
//
// Registration form — name, email, password, confirm password.
// Client-side validation before hitting the API.

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  registerUser,
  clearError,
  selectAuthLoading,
  selectAuthError,
  selectIsLoggedIn,
} from '../features/authSlice';

export default function Register() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const isLoading  = useSelector(selectAuthLoading);
  const error      = useSelector(selectAuthError);
  const isLoggedIn = useSelector(selectIsLoggedIn);

  const [form, setForm]           = useState({ name: '', email: '', password: '', confirm: '' });
  const [clientError, setClientError] = useState('');

  useEffect(() => {
    if (isLoggedIn) navigate('/');
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    return () => dispatch(clearError());
  }, [dispatch]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setClientError('');
    if (error) dispatch(clearError());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (form.name.trim().length < 2) {
      setClientError('Name must be at least 2 characters.');
      return;
    }
    if (form.password.length < 6) {
      setClientError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setClientError('Passwords do not match.');
      return;
    }

    const { confirm, ...payload } = form; // don't send 'confirm' to backend
    const result = await dispatch(registerUser(payload));
    if (registerUser.fulfilled.match(result)) {
      navigate('/');
    }
  };

  const displayError = clientError || error;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

          <div className="text-center mb-8">
            <span className="text-4xl">🚀</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Create account</h1>
            <p className="text-gray-500 text-sm mt-1">Join Galaxy Store today</p>
          </div>

          {displayError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6 text-red-700 text-sm text-center">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Ravi Kumar"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                           text-sm transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                           text-sm transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                type="password"
                name="confirm"
                value={form.confirm}
                onChange={handleChange}
                required
                placeholder="Repeat your password"
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
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
