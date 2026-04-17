// frontend/src/features/productSlice.js
//
// Manages all product-related state:
// - list of all products (home page grid)
// - search results
// - single product detail
// - loading/error states

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../api/axios';

// ─────────────────────────────────────────────
// ASYNC THUNKS
// ─────────────────────────────────────────────

// Fetch all products (home page)
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get('/products');
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch products');
    }
  }
);

// Search products by keyword
export const searchProducts = createAsyncThunk(
  'products/searchProducts',
  async (query, { rejectWithValue }) => {
    try {
      const res = await API.get(`/products/search?q=${query}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Search failed');
    }
  }
);

// Fetch single product by ID (product detail page)
export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await API.get(`/products/${id}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Product not found');
    }
  }
);

// ─────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────

const initialState = {
  items: [],           // all products
  searchResults: [],   // results from search query
  selectedProduct: null,
  searchQuery: '',     // current search string (controlled input)
  isLoading: false,
  isSearching: false,  // separate loading state for search
  error: null,
};

// ─────────────────────────────────────────────
// SLICE
// ─────────────────────────────────────────────

const productSlice = createSlice({
  name: 'products',
  initialState,

  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      if (!action.payload) state.searchResults = []; // clear results when input cleared
    },
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    },
    clearProductError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    // FETCH ALL
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

    // SEARCH
      .addCase(searchProducts.pending, (state) => {
        state.isSearching = true;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.isSearching = false;
        state.searchResults = action.payload;
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.isSearching = false;
        state.error = action.payload;
      })

    // SINGLE PRODUCT
      .addCase(fetchProductById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { setSearchQuery, clearSelectedProduct, clearProductError } = productSlice.actions;

// SELECTORS
export const selectProducts       = (state) => state.products.items;
export const selectSearchResults  = (state) => state.products.searchResults;
export const selectSearchQuery    = (state) => state.products.searchQuery;
export const selectSelectedProduct = (state) => state.products.selectedProduct;
export const selectProductsLoading = (state) => state.products.isLoading;
export const selectIsSearching    = (state) => state.products.isSearching;
export const selectProductError   = (state) => state.products.error;

export default productSlice.reducer;