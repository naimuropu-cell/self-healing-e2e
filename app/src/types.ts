export interface User {
  username: string;
  name: string;
  email: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  rating: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ShippingDetails {
  fullName: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  cardNumber: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  shipping: ShippingDetails;
  total: number;
  promoCode?: string;
  discount?: number;
  placedAt: string;
  status: 'confirmed' | 'processing' | 'shipped';
}
