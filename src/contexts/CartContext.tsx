// Minimal cart context — localStorage-backed so "Add to cart" in the assistant
// behaves like the real storefront without needing the full catalog backend.
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export interface CartItem {
  productId: string;
  productName: string;
  uniqueProductSlug?: string;
  productPrice: number;
  productQuantity: number;
  productImageUrl?: string;
  vendorId?: string;
}

interface CartContextValue {
  items: CartItem[];
  addToCart: (item: CartItem) => Promise<boolean>;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const readCart = (): CartItem[] => {
  try {
    return JSON.parse(localStorage.getItem("benna-cart") || "[]");
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(readCart);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = useCallback(async (item: CartItem) => {
    setItems((prev) => {
      const next = prev.some((i) => i.productId === item.productId)
        ? prev.map((i) =>
            i.productId === item.productId
              ? { ...i, productQuantity: i.productQuantity + item.productQuantity }
              : i,
          )
        : [...prev, item];
      try {
        localStorage.setItem("benna-cart", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    return true;
  }, []);

  return (
    <CartContext.Provider value={{ items, addToCart, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};
