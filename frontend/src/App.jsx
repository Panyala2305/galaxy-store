import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import Navbar   from './components/Navbar';
import Home     from './pages/Home';
import Login    from './pages/Login';
import Register from './pages/Register';
import Cart     from './pages/Cart';
import Orders   from './pages/Orders';
import Profile  from './pages/Profile';



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
          <Route path="/orders"   element={<Orders />}   />
          <Route path="/profile"  element={<Profile />}  />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}