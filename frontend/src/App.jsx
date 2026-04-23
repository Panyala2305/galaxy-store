// frontend/src/App.jsx  (UPDATED — add /checkout route)

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider }  from 'react-redux';
import { store }     from './app/store';
import Navbar    from './components/Navbar';
import Home      from './pages/Home';
import Login     from './pages/Login';
import Register  from './pages/Register';
import Cart      from './pages/Cart';
import Checkout  from './pages/Checkout';   // ← NEW
import Orders    from './pages/Orders';
import Profile   from './pages/Profile';

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/"         element={<Home />}     />
          <Route path="/login"    element={<Login />}    />
          <Route path="/register" element={<Register />} />
          <Route path="/cart"     element={<Cart />}     />
          <Route path="/checkout" element={<Checkout />} />  {/* ← NEW */}
          <Route path="/orders"   element={<Orders />}   />
          <Route path="/profile"  element={<Profile />}  />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}


// ════════════════════════════════════════════════════════
// backend/server.js  (UPDATED — add payment route)
// ════════════════════════════════════════════════════════
/*
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart',     require('./routes/cart'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/payment',  require('./routes/payment'));   // ← NEW

app.get('/api/health', (req, res) => res.json({ status: 'OK ✓' }));
app.use((req, res)    => res.status(404).json({ error: 'Route not found.' }));

app.listen(process.env.PORT || 5000, () =>
  console.log('Galaxy Store server running on port 5000')
);
*/
