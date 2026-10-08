import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import AssistantBubble from "@/components/assistant/AssistantBubble";

const AssistantPage = lazy(() => import("@/pages/AssistantPage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const ProductDetailPage = lazy(() => import("@/pages/ProductDetailPage"));

const Fallback = () => (
  <div className="flex min-h-screen items-center justify-center text-muted-foreground">
    Loading…
  </div>
);

const App = () => (
  <LanguageProvider>
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Suspense fallback={<Fallback />}>
            <Routes>
              {/* Nested so /assistant → /assistant/:threadId doesn't remount the
                  page and kill a streaming answer (same as the storefront). */}
              <Route path="/assistant" element={<AssistantPage />}>
                <Route path=":threadId" element={null} />
              </Route>
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
              <Route path="/product/:slug" element={<ProductDetailPage />} />
              <Route path="*" element={<Navigate to="/assistant" replace />} />
            </Routes>
          </Suspense>
          <AssistantBubble />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  </LanguageProvider>
);

export default App;
