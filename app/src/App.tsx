import React, { useState } from 'react';
import { User, Product, CartItem, ShippingDetails, Order } from './types';
import { ShoppingCart, LogOut, CheckCircle2, ShieldCheck, ArrowRight, X, Package } from 'lucide-react';

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'NeuralPulse Wireless Headphones',
    description: 'Active noise cancellation with adaptive acoustic tuning and 40-hour battery life.',
    price: 199.99,
    category: 'Audio',
    image: '🎧',
    stock: 15,
    rating: 4.8,
  },
  {
    id: 'prod-002',
    name: 'QuantumKey Mechanical Keyboard',
    description: 'Custom hot-swappable switches, anodized aluminum chassis, and RGB per-key backlighting.',
    price: 149.50,
    category: 'Peripherals',
    image: '⌨️',
    stock: 8,
    rating: 4.9,
  },
  {
    id: 'prod-003',
    name: 'AeroGlide Ergonomic Mouse',
    description: 'Ultralight honeycomb design, 26,000 DPI optical sensor, and low-latency wireless.',
    price: 79.99,
    category: 'Peripherals',
    image: '🖱️',
    stock: 22,
    rating: 4.7,
  },
  {
    id: 'prod-004',
    name: 'TitanView 4K Ultra-Wide Monitor',
    description: '34-inch curved nano-IPS display with 144Hz refresh rate and HDR600 calibration.',
    price: 649.00,
    category: 'Displays',
    image: '🖥️',
    stock: 5,
    rating: 4.9,
  },
];

export const App: React.FC = () => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Cart & Catalog State
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Checkout Form State
  const [shipping, setShipping] = useState<ShippingDetails>({
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    address: '123 Innovation Way',
    city: 'San Francisco',
    postalCode: '94105',
    cardNumber: '4242 •••• •••• 4242',
  });

  // Order Placement State
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Authentication Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim() === 'demo_user' && passwordInput === 'password123') {
      setCurrentUser({
        username: usernameInput,
        name: 'Demo QA Engineer',
        email: 'qa@selfhealing.local',
      });
      setAuthError('');
    } else {
      setAuthError('Invalid credentials. Use demo_user / password123');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCart([]);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    setConfirmedOrder(null);
  };

  // Cart Handlers
  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Checkout Submission
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const newOrder: Order = {
      id: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      items: [...cart],
      shipping: { ...shipping },
      total: totalCartPrice,
      placedAt: new Date().toLocaleTimeString(),
      status: 'confirmed',
    };
    setConfirmedOrder(newOrder);
    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
  };

  // 1. Auth View (Not logged in)
  if (!currentUser) {
    return (
      <div className="app-container">
        <header className="navbar glass">
          <div className="logo" data-testid="app-logo">
            <ShieldCheck size={26} color="#6366f1" />
            <span>ApexStore QA</span>
          </div>
        </header>

        <main className="auth-wrapper">
          <div className="auth-card glass">
            <div className="auth-header">
              <h1>Sign In</h1>
              <p>Enter your credentials to access the storefront</p>
            </div>

            {authError && (
              <div className="alert-box alert-danger" data-testid="auth-error">
                {authError}
              </div>
            )}

            <form onSubmit={handleLogin} data-testid="login-form">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  className="input-control"
                  placeholder="Enter username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  data-testid="login-username"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="input-control"
                  placeholder="Enter password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  data-testid="login-password"
                  required
                />
              </div>

              <button type="submit" className="btn-primary" data-testid="login-submit">
                <span>Authenticate</span>
                <ArrowRight size={18} />
              </button>
            </form>

            <div className="demo-credentials">
              Demo access: <span>demo_user</span> / <span>password123</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 2. Order Confirmation View
  if (confirmedOrder) {
    return (
      <div className="app-container">
        <header className="navbar glass">
          <div className="logo" data-testid="app-logo">
            <ShieldCheck size={26} color="#6366f1" />
            <span>ApexStore QA</span>
          </div>
          <div className="nav-actions">
            <span className="user-pill">{currentUser.name}</span>
            <button
              onClick={handleLogout}
              className="btn-secondary"
              data-testid="logout-button"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="main-content">
          <div className="success-card glass" data-testid="order-success-screen">
            <div className="success-icon">
              <CheckCircle2 size={40} />
            </div>
            <h2>Order Confirmed!</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Thank you for your purchase. Your payment was verified and processed.
            </p>

            <div className="order-receipt">
              <div className="receipt-row">
                <span>Order Number:</span>
                <strong data-testid="order-id">{confirmedOrder.id}</strong>
              </div>
              <div className="receipt-row">
                <span>Recipient:</span>
                <span>{confirmedOrder.shipping.fullName}</span>
              </div>
              <div className="receipt-row">
                <span>Total Amount:</span>
                <strong>${confirmedOrder.total.toFixed(2)}</strong>
              </div>
              <div className="receipt-row">
                <span>Status:</span>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                  {confirmedOrder.status.toUpperCase()}
                </span>
              </div>
            </div>

            <button
              onClick={() => setConfirmedOrder(null)}
              className="btn-primary"
              data-testid="continue-shopping"
            >
              Continue Shopping
            </button>
          </div>
        </main>
      </div>
    );
  }

  // 3. Catalog & Storefront View
  return (
    <div className="app-container">
      <header className="navbar glass">
        <div className="logo" data-testid="app-logo">
          <ShieldCheck size={26} color="#6366f1" />
          <span>ApexStore QA</span>
        </div>

        <div className="nav-actions">
          <button
            className="cart-button"
            onClick={() => setIsCartOpen(true)}
            data-testid="cart-button"
          >
            <ShoppingCart size={18} />
            <span>Cart</span>
            <span className="badge" data-testid="cart-badge">
              {totalCartCount}
            </span>
          </button>

          <span className="user-pill">{currentUser.name}</span>

          <button
            onClick={handleLogout}
            className="btn-secondary"
            title="Log out"
            data-testid="logout-button"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="catalog-header">
          <div>
            <h2>Hardware & Gear Catalog</h2>
            <p>Curated high-performance equipment for engineering workstations</p>
          </div>
        </div>

        <div className="product-grid" data-testid="product-grid">
          {products.map((product) => (
            <div
              key={product.id}
              className="product-card glass"
              data-testid={`product-card-${product.id}`}
            >
              <div className="product-image">{product.image}</div>
              <span className="product-category">{product.category}</span>
              <h3 className="product-title">{product.name}</h3>
              <p className="product-description">{product.description}</p>
              <div className="product-footer">
                <span className="product-price">${product.price.toFixed(2)}</span>
                <button
                  className="btn-add-cart"
                  onClick={() => addToCart(product)}
                  data-testid={`add-to-cart-button-${product.id}`}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
        <div className="modal-overlay" data-testid="cart-modal">
          <div className="modal-content glass">
            <div className="modal-header">
              <h3>Shopping Cart ({totalCartCount})</h3>
              <button
                className="btn-close"
                onClick={() => setIsCartOpen(false)}
                data-testid="close-cart"
              >
                <X size={20} />
              </button>
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>Your cart is empty.</p>
              </div>
            ) : (
              <>
                <div className="cart-items" data-testid="cart-items-list">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="cart-item-row"
                      data-testid={`cart-item-${item.product.id}`}
                    >
                      <div className="cart-item-info">
                        <h4>{item.product.name}</h4>
                        <span>${item.product.price.toFixed(2)} each</span>
                      </div>
                      <div className="cart-item-actions">
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          data-testid={`qty-minus-${item.product.id}`}
                        >
                          -
                        </button>
                        <span data-testid={`qty-val-${item.product.id}`}>
                          {item.quantity}
                        </span>
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          data-testid={`qty-plus-${item.product.id}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>${totalCartPrice.toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Standard Shipping</span>
                    <span style={{ color: 'var(--success)' }}>FREE</span>
                  </div>
                  <div className="summary-row summary-total">
                    <span>Total</span>
                    <span data-testid="cart-total-price">
                      ${totalCartPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  data-testid="proceed-to-checkout"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="modal-overlay" data-testid="checkout-modal">
          <div className="modal-content glass">
            <div className="modal-header">
              <h3>Complete Checkout</h3>
              <button
                className="btn-close"
                onClick={() => setIsCheckoutOpen(false)}
                data-testid="close-checkout"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} data-testid="checkout-form">
              <div className="form-group">
                <label htmlFor="fullname">Full Name</label>
                <input
                  id="fullname"
                  className="input-control"
                  value={shipping.fullName}
                  onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
                  data-testid="input-name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input-control"
                  value={shipping.email}
                  onChange={(e) => setShipping({ ...shipping, email: e.target.value })}
                  data-testid="input-email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Shipping Address</label>
                <input
                  id="address"
                  className="input-control"
                  value={shipping.address}
                  onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                  data-testid="input-address"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    className="input-control"
                    value={shipping.city}
                    onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                    data-testid="input-city"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="zip">Postal Code</label>
                  <input
                    id="zip"
                    className="input-control"
                    value={shipping.postalCode}
                    onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
                    data-testid="input-zip"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="card">Card Payment (Simulated)</label>
                <input
                  id="card"
                  className="input-control"
                  value={shipping.cardNumber}
                  onChange={(e) => setShipping({ ...shipping, cardNumber: e.target.value })}
                  data-testid="input-card"
                  required
                />
              </div>

              <div className="summary-row summary-total" style={{ marginBottom: '1.5rem' }}>
                <span>Amount to Pay:</span>
                <span>${totalCartPrice.toFixed(2)}</span>
              </div>

              <button type="submit" className="btn-primary" data-testid="submit-order">
                <span>Place Order (${totalCartPrice.toFixed(2)})</span>
                <CheckCircle2 size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
