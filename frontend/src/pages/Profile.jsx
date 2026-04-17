// frontend/src/pages/Profile.jsx
//
// Shows user info and lets them update their name.
// Also shows account stats (total orders, total spent).

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectUser, selectIsLoggedIn, setUser } from '../features/authSlice';
import API from '../api/axios';

export default function Profile() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const user       = useSelector(selectUser);
  const isLoggedIn = useSelector(selectIsLoggedIn);

  const [form,       setForm]       = useState({ name: '', email: '' });
  const [stats,      setStats]      = useState({ totalOrders: 0, totalSpent: 0 });
  const [isEditing,  setIsEditing]  = useState(false);
  const [isSaving,   setIsSaving]   = useState(false);
  const [message,    setMessage]    = useState('');
  const [error,      setError]      = useState('');

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setForm({ name: user.name || '', email: user.email || '' });
    loadStats();
  }, [isLoggedIn, navigate]);

  const loadStats = async () => {
    try {
      const res = await API.get('/orders');
      const orders = res.data;
      setStats({
        totalOrders: orders.length,
        totalSpent:  orders.reduce((sum, o) => sum + Number(o.total_price), 0),
      });
    } catch {}
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name cannot be empty.'); return; }
    setIsSaving(true);
    setError('');
    try {
      const res = await API.put('/users/profile', { name: form.name });
      dispatch(setUser(res.data.user)); // update Redux state
      setMessage('Profile updated!');
      setIsEditing(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ name: user.name, email: user.email });
    setIsEditing(false);
    setError('');
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">👤 Your Profile</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-indigo-50 rounded-2xl p-5 text-center">
          <p className="text-3xl font-bold text-indigo-700">{stats.totalOrders}</p>
          <p className="text-sm text-indigo-500 mt-1 font-medium">Total Orders</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-5 text-center">
          <p className="text-3xl font-bold text-green-700">
            ₹{stats.totalSpent.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-green-500 mt-1 font-medium">Total Spent</p>
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center
                          text-indigo-700 font-bold text-2xl uppercase">
            {user?.name?.[0]}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{user?.name}</p>
            <p className="text-gray-400 text-sm">{user?.email}</p>
          </div>
        </div>

        {/* Success message */}
        {message && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-green-700 text-sm text-center">
            ✓ {message}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              disabled={!isEditing}
              className={`w-full px-4 py-3 rounded-xl border text-sm transition
                ${isEditing
                  ? 'border-indigo-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400'
                  : 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            {/* Email is read-only — changing email needs extra verification */}
            <input
              type="email"
              value={form.email}
              disabled
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50
                         text-gray-400 text-sm cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-6">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold
                         hover:bg-indigo-700 transition"
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold
                           hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold
                           hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
