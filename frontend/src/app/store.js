import { configureStore } from '@reduxjs/toolkit';
import authReducer    from '../features/authSlice';
import productReducer from '../features/productSlice';
import cartReducer    from '../features/cartSlice';

export const store = configureStore({
  reducer: {
    auth:    authReducer,
    products: productReducer,
    cart:    cartReducer,
  },
});