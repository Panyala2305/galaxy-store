// frontend/src/features/cartSlice.js
//
// This slice manages the shopping cart:
// - items in the cart (with product details + quantity)
// - total price calculation
// - loading/error states
//
// All cart data lives in the DATABASE (not localStorage), tied to the logged-in user.
// So every action makes an API call and syncs state with the server response.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../api/axios';

// ─────────────────────────────────────────────
// ASYNC THUNKS  (API calls)
// ─────────────────────────────────────────────

// FETCH CART
// Load all cart items for the currently logged-in user.
// Backend joins cart + products tables to return full product details.
// Response: [{ cart_id, product_id, name, price, image, quantity }, ...]
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get('/cart');
      return res.data; // array of cart items with product info
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch cart');
    }
  }
);

// ADD TO CART
// Add a product to the cart, or increase quantity if it's already there.
// Backend uses INSERT ... ON DUPLICATE KEY UPDATE to handle both cases.
export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async ({ productId, quantity = 1 }, { rejectWithValue }) => {
    try {
      const res = await API.post('/cart/add', { productId, quantity });
      return res.data; // { message: 'Added to cart', item: { cart_id, product_id, ... } }
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to add to cart');
    }
  }
);

// UPDATE QUANTITY
// Change the quantity of a specific item in the cart.
// If quantity becomes 0, remove the item entirely (handled in the backend).
export const updateCartQuantity = createAsyncThunk(
  'cart/updateCartQuantity',
  async ({ cartId, quantity }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/cart/update/${cartId}`, { quantity });
      return res.data; // { cartId, quantity }
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to update quantity');
    }
  }
);

// REMOVE FROM CART
// Delete a single item from the cart by its cart row ID.
export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
  async (cartId, { rejectWithValue }) => {
    try {
      await API.delete(`/cart/remove/${cartId}`);
      return cartId; // return the id so we can filter it out of state
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to remove item');
    }
  }
);

// CLEAR CART
// Remove all items from the cart (called after a successful order is placed).
export const clearCartOnServer = createAsyncThunk(
  'cart/clearCartOnServer',
  async (_, { rejectWithValue }) => {
    try {
      await API.delete('/cart/clear');
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to clear cart');
    }
  }
);

// ─────────────────────────────────────────────
// HELPER — calculate total price from items array
// ─────────────────────────────────────────────
const calcTotal = (items) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

// ─────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────

const initialState = {
  items: [],          // [{ cart_id, product_id, name, price, image, quantity }]
  totalPrice: 0,      // number — recalculated whenever items change
  totalItems: 0,      // total count of items (shown in navbar badge)
  isLoading: false,
  error: null,
};

// ─────────────────────────────────────────────
// SLICE
// ─────────────────────────────────────────────

const cartSlice = createSlice({
  name: 'cart',
  initialState,

  reducers: {
    // Clear the cart from Redux state only (no API call).
    // Use this when the user logs out, so the next user doesn't see their cart.
    clearCartLocally: (state) => {
      state.items = [];
      state.totalPrice = 0;
      state.totalItems = 0;
      state.error = null;
    },

    clearCartError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {

    // ── FETCH CART ────────────────────────────
    builder
      .addCase(fetchCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.totalPrice = calcTotal(action.payload);
        state.totalItems = action.payload.reduce((sum, i) => sum + i.quantity, 0);
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

    // ── ADD TO CART ───────────────────────────
    // After adding, re-fetch the cart so state is always in sync with the DB.
    // Alternatively you can optimistically update state here if you prefer speed.
      .addCase(addToCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.isLoading = false;
        const newItem = action.payload.item;

        // Check if item already exists in local state
        const existing = state.items.find(i => i.cart_id === newItem.cart_id);
        if (existing) {
          existing.quantity = newItem.quantity; // update quantity
        } else {
          state.items.push(newItem);            // add new item
        }

        // Recalculate totals
        state.totalPrice = calcTotal(state.items);
        state.totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

    // ── UPDATE QUANTITY ───────────────────────
      .addCase(updateCartQuantity.pending, (state) => {
        state.error = null;
        // No isLoading = true here — UI stays responsive for quantity +/- buttons
      })
      .addCase(updateCartQuantity.fulfilled, (state, action) => {
        const { cartId, quantity } = action.payload;

        if (quantity <= 0) {
          // Remove item if quantity hits 0
          state.items = state.items.filter(i => i.cart_id !== cartId);
        } else {
          const item = state.items.find(i => i.cart_id === cartId);
          if (item) item.quantity = quantity;
        }

        state.totalPrice = calcTotal(state.items);
        state.totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
      })
      .addCase(updateCartQuantity.rejected, (state, action) => {
        state.error = action.payload;
      })

    // ── REMOVE FROM CART ──────────────────────
      .addCase(removeFromCart.pending, (state) => {
        state.error = null;
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        // action.payload is the cartId we returned from the thunk
        state.items = state.items.filter(i => i.cart_id !== action.payload);
        state.totalPrice = calcTotal(state.items);
        state.totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.error = action.payload;
      })

    // ── CLEAR ENTIRE CART ─────────────────────
      .addCase(clearCartOnServer.fulfilled, (state) => {
        state.items = [];
        state.totalPrice = 0;
        state.totalItems = 0;
      })
      .addCase(clearCartOnServer.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearCartLocally, clearCartError } = cartSlice.actions;

// ─────────────────────────────────────────────
// SELECTORS
// ─────────────────────────────────────────────
export const selectCartItems      = (state) => state.cart.items;
export const selectCartTotal      = (state) => state.cart.totalPrice;
export const selectCartItemCount  = (state) => state.cart.totalItems;
export const selectCartLoading    = (state) => state.cart.isLoading;
export const selectCartError      = (state) => state.cart.error;

// Returns true if a specific product is already in the cart
// Usage: const alreadyInCart = useSelector(selectIsInCart(productId));
export const selectIsInCart = (productId) => (state) =>
  state.cart.items.some(i => i.product_id === productId);

export default cartSlice.reducer;


// ─────────────────────────────────────────────
// HOW TO USE IN COMPONENTS
// ─────────────────────────────────────────────
//
// PRODUCT CARD — add to cart button:
//   import { addToCart, selectIsInCart } from '../features/cartSlice';
//
//   const dispatch    = useDispatch();
//   const alreadyIn   = useSelector(selectIsInCart(product.id));
//
//   <button onClick={() => dispatch(addToCart({ productId: product.id }))}>
//     {alreadyIn ? 'Added ✓' : 'Add to Cart'}
//   </button>
//
//
// CART PAGE — show items and checkout:
//   const items      = useSelector(selectCartItems);
//   const total      = useSelector(selectCartTotal);
//
//   items.map(item => (
//     <div key={item.cart_id}>
//       <span>{item.name}</span>
//       <button onClick={() => dispatch(updateCartQuantity({ cartId: item.cart_id, quantity: item.quantity - 1 }))}>-</button>
//       <span>{item.quantity}</span>
//       <button onClick={() => dispatch(updateCartQuantity({ cartId: item.cart_id, quantity: item.quantity + 1 }))}>+</button>
//       <button onClick={() => dispatch(removeFromCart(item.cart_id))}>Remove</button>
//     </div>
//   ))
//
//   <p>Total: ₹{total.toFixed(2)}</p>
//
//
// NAVBAR — cart badge:
//   const count = useSelector(selectCartItemCount);
//   <span>{count > 0 && <Badge>{count}</Badge>}</span>
//
//
// ON LOGOUT — clear cart from state:
//   dispatch(logoutUser()).then(() => dispatch(clearCartLocally()));
//
//
// AFTER ORDER PLACED — clear cart:
//   dispatch(clearCartOnServer());