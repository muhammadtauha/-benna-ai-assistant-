// src/components/assistant/AssistantProductCard.tsx
import { Link } from "react-router-dom";
import { useState } from "react";
import { ShoppingCart, MessageSquare, Check } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import RiyalSymbol from "@/components/ui/RiyalSymbol";
import { getProductImage } from "@/utils/imageUtils";
import type { AssistantProduct } from "@/lib/api-assistant";

const fmt = (n: number) =>
  n >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(n);

interface Props {
  product: AssistantProduct;
  onChat?: (product: AssistantProduct) => void;
}

const AssistantProductCard = ({ product, onChat }: Props) => {
  const { addToCart } = useCart();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);

  const name = isAr && product.nameArabic ? product.nameArabic : product.name;
  const price = product.effectivePrice || product.price;
  const href = product.slug ? `/product/${product.slug}` : "#";

  const handleAdd = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await addToCart({
      productId: String(product.productId),
      productName: product.name,
      uniqueProductSlug: product.slug,
      productPrice: price,
      productQuantity: 1,
      productImageUrl: product.image || "/placeholder.svg",
      vendorId: String(product.vendorId || ""),
    } as never);
    setBusy(false);
    if (ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  return (
    <div className="flex gap-3 rounded-[6px] border border-border bg-card p-3 transition-shadow hover:shadow-sm">
      <Link to={href} className="shrink-0">
        <img
          src={getProductImage(product.image, "/placeholder.svg")}
          alt={name}
          loading="lazy"
          className="h-16 w-16 rounded-[6px] border border-border/60 bg-background object-contain"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          to={href}
          className="line-clamp-2 text-[13px] font-normal leading-snug text-foreground hover:text-primary"
        >
          {name}
        </Link>
        {product.brand ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{product.brand}</p>
        ) : null}

        <div className="mt-1 flex items-center gap-2">
          {product.isRFQ ? (
            <span className="text-[12px] text-muted-foreground">
              {isAr ? "السعر عند الطلب" : "Price on request"}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[13px] font-medium text-foreground">
              <RiyalSymbol className="text-[12px]" />
              {fmt(price)}
              {product.unit ? (
                <span className="text-[11px] font-normal text-muted-foreground">
                  /{product.unit}
                </span>
              ) : null}
            </span>
          )}
          {!product.inStock ? (
            <span className="rounded-[4px] bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {isAr ? "غير متوفر" : "Out of stock"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-stretch justify-center gap-1.5">
        {product.isRFQ ? (
          <button
            type="button"
            onClick={() => onChat?.(product)}
            className="flex items-center justify-center gap-1.5 rounded-[4px] bg-primary px-2.5 py-1.5 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {isAr ? "تحدث مع البائع" : "Chat with seller"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleAdd}
              disabled={busy || !product.inStock}
              className="flex items-center justify-center gap-1.5 rounded-[4px] bg-primary px-2.5 py-1.5 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {added ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <ShoppingCart className="h-3.5 w-3.5" />
              )}
              {added ? (isAr ? "تم" : "Added") : isAr ? "أضف" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => onChat?.(product)}
              className="flex items-center justify-center gap-1.5 rounded-[4px] border border-border px-2.5 py-1.5 text-[11px] text-foreground hover:bg-muted"
            >
              <MessageSquare className="h-3 w-3" />
              {isAr ? "تحدث مع البائع" : "Chat with seller"}
            </button>
          </>
        )}
      </div>

    </div>
  );
};

export default AssistantProductCard;
