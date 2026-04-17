// frontend/src/features/authSlice.js
//
// This slice manages everything related to the logged-in user:
// - who is logged in (user data)
// - loading states (is a request in progress?)
// - error messages (did login fail?)
//
// Redux Toolkit's createAsyncThunk handles async API calls (login, register, logout).
// Each thunk automatically dispatches pending / fulfilled / rejected actions.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../api/axios'; // our configured axios instance

// ─────────────────────────────────────────────
// ASYNC THUNKS  (API calls)
// ─────────────────────────────────────────────

// REGISTER
// Sends { name, email, password } to backend.
// Backend hashes the password, saves user, and sets a JWT cookie.
export const registerUser = createAsyncThunk(
  'auth/registerUser',                        // action type prefix
  async (formData, { rejectWithValue }) => {  // formData = { name, email, password }
    try {
      const res = await API.post('/auth/register', formData);
      return res.data; // { message: 'Registered successfully', user: { id, name, email } }
    } catch (err) {
      // rejectWithValue sends the error message to the rejected action's payload
      return rejectWithValue(err.response?.data?.error || 'Registration failed');
    }
  }
);

// LOGIN
// Sends { email, password } to backend.
// Backend verifies credentials and sets an HttpOnly JWT cookie in the browser.
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (formData, { rejectWithValue }) => { // formData = { email, password }
    try {
      const res = await API.post('/auth/login', formData);
      return res.data; // { message: 'Login successful', user: { id, name, email } }
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Login failed');
    }
  }
);

// LOGOUT
// Asks backend to clear the JWT cookie.
// After this, the browser no longer sends the cookie, so all protected routes fail.
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await API.post('/auth/logout');
      return null;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Logout failed');
    }
  }
);

// FETCH CURRENT USER
// Called on app load to check if the user is already logged in (cookie still valid).
// If the cookie exists and is valid, backend returns the user's info.
// If not, returns 401 and we keep user as null.
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get('/users/me');
      return res.data; // { id, name, email }
    } catch (err) {
      return rejectWithValue(null); // not logged in — that's fine, not an error
    }
  }
);

// ─────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────

const initialState = {
  user: null,          // { id, name, email } when logged in, null when not
  isLoading: false,    // true while any API call is in progress
  error: null,         // string error message, or null
  isInitialized: false // true after fetchCurrentUser completes (prevents flash of login page)
};

// ─────────────────────────────────────────────
// SLICE
// ─────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,

  reducers: {
    // Synchronous action to clear any error message
    // Use this when the user starts typing in the login form again
    clearError: (state) => {
      state.error = null;
    },

    // Manually set user (useful for updating profile info after an edit)
    setUser: (state, action) => {
      state.user = action.payload;
    },
  },

  // extraReducers handles the three states of each async thunk:
  // pending   → request sent, waiting for response
  // fulfilled → response received successfully
  // rejected  → request failed (network error or backend returned an error)
  extraReducers: (builder) => {

    // ── REGISTER ──────────────────────────────
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user; // store user in state
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload; // the rejectWithValue message
      })

    // ── LOGIN ─────────────────────────────────
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

    // ── LOGOUT ────────────────────────────────
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;  // clear user from state
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Even if logout API fails, clear local state
        state.isLoading = false;
        state.user = null;
      })

    // ── FETCH CURRENT USER (on app load) ──────
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isInitialized = true; // app now knows auth status
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;           // not logged in
        state.isInitialized = true;  // still mark as initialized
      });
  },
});

export const { clearError, setUser } = authSlice.actions;

// ─────────────────────────────────────────────
// SELECTORS
// Helper functions to read state in components
// Usage: const user = useSelector(selectUser);
// ─────────────────────────────────────────────
export const selectUser         = (state) => state.auth.user;
export const selectIsLoggedIn   = (state) => !!state.auth.user;
export const selectAuthLoading  = (state) => state.auth.isLoading;
export const selectAuthError    = (state) => state.auth.error;
export const selectIsInitialized = (state) => state.auth.isInitialized;

export default authSlice.reducer;


// ─────────────────────────────────────────────
// HOW TO USE IN COMPONENTS
// ─────────────────────────────────────────────
//
// LOGIN FORM:
//   import { useDispatch, useSelector } from 'react-redux';
//   import { loginUser, selectAuthError, selectAuthLoading } from '../features/authSlice';
//
//   const dispatch = useDispatch();
//   const error    = useSelector(selectAuthError);
//   const loading  = useSelector(selectAuthLoading);
//
//   const handleSubmit = (e) => {
//     e.preventDefault();
//     dispatch(loginUser({ email, password }));
//   };
//
// NAVBAR (check if logged in):
//   const user = useSelector(selectUser);
//   // user is null → show Login button
//   // user is { name: 'Ravi', ... } → show "Hi Ravi" + Logout
//
// APP.JSX (initialize auth on load):
//   useEffect(() => { dispatch(fetchCurrentUser()); }, []);
//   const isInitialized = useSelector(selectIsInitialized);
//   if (!isInitialized) return <LoadingSpinner />;