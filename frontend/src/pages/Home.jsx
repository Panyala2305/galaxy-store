// frontend/src/pages/Home.jsx
//
// Main landing page — shows product grid.
// Displays search results when a query is active, all products otherwise.

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProducts,
  selectProducts,
  selectSearchResults,
  selectSearchQuery,
  selectProductsLoading,
  selectIsSearching,
  selectProductError,
} from '../features/productSlice';
import { fetchCart } from '../features/cartSlice';
import { selectIsLoggedIn } from '../features/authSlice';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const dispatch    = useDispatch();
  const isLoggedIn  = useSelector(selectIsLoggedIn);
  const products    = useSelector(selectProducts);
  const results     = useSelector(selectSearchResults);
  const query       = useSelector(selectSearchQuery);
  const isLoading   = useSelector(selectProductsLoading);
  const isSearching = useSelector(selectIsSearching);
  const error       = useSelector(selectProductError);

  // Load products on mount
  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  // Load cart too if user is logged in
  useEffect(() => {
    if (isLoggedIn) dispatch(fetchCart());
  }, [isLoggedIn, dispatch]);

  // Decide what to show: search results or all products
  const displayProducts = query.trim() ? results : products;
  const isActive        = isLoading || isSearching;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">

      {/* Page header */}
      <div className="mb-8">
        {query.trim() ? (
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Search results for "{query}"
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {results.length} product{results.length !== 1 ? 's' : ''} found
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔥 Trending Products</h1>
            <p className="text-gray-500 text-sm mt-1">Discover our most popular items</p>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isActive && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-t-2xl" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-8 bg-gray-200 rounded-xl mt-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isActive && displayProducts.length === 0 && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🔭</p>
          <p className="text-gray-600 font-medium text-lg">
            {query.trim() ? 'No products match your search.' : 'No products available yet.'}
          </p>
          {query.trim() && (
            <p className="text-gray-400 text-sm mt-1">Try a different keyword.</p>
          )}
        </div>
      )}

      {/* Product grid */}
      {!isActive && displayProducts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
