import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RiyalSymbol from "@/components/ui/RiyalSymbol";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiClient, unwrap } from "@/lib/api-client";
import { getProductImage } from "@/utils/imageUtils";
import { ShoppingCart, Check, ArrowLeft } from "lucide-react";

interface Product {
  _id: string;
  name: string;
  nameArabic?: string;
  description?: string;
  descriptionArabic?: string;
  brand?: string;
  sku?: string;
  collections?: string;
  price: number;
  discountMode?: string;
  discountValue?: number;
  unitOfMeasurement?: string;
  inventory?: string;
  isRFQ?: boolean;
  productImageUrl?: string;
  uploadedByVendorId?: string;
}

const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart } = useCart();
  const { isRTL } = useLanguage();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    apiClient(`/users/website/products/${slug}`)
      .then((res) => {
        if (live) setProduct(unwrap<Product>(res));
      })
      .catch(() => live && setProduct(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [slug]);

  const effectivePrice = (p: Product) => {
    const price = Number(p.price) || 0;
    const v = Number(p.discountValue) || 0;
    if (!v) return price;
    if (p.discountMode === "FIXED") return Math.max(price - v, 0);
    return Math.max(price - (price * v) / 100, 0);
  };

  const handleAdd = async () => {
    if (!product) return;
    const ok = await addToCart({
      productId: String(product._id),
      productName: product.name,
      uniqueProductSlug: slug,
      productPrice: effectivePrice(product),
      productQuantity: 1,
      productImageUrl: product.productImageUrl || "/placeholder.svg",
      vendorId: String(product.uploadedByVendorId || ""),
    });
    if (ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  const name =
    product && isRTL && product.nameArabic ? product.nameArabic : product?.name;
  const desc =
    product && isRTL && product.descriptionArabic
      ? product.descriptionArabic
      : product?.description;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-8 md:px-8">
        <Link
          to="/assistant"
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {isRTL ? "العودة إلى المساعد" : "Back to assistant"}
        </Link>

        {loading ? (
          <p className="text-[14px] text-muted-foreground">Loading…</p>
        ) : !product ? (
          <div className="rounded-[8px] border border-border bg-card p-10 text-center">
            <p className="text-[15px] text-foreground">
              {isRTL ? "المنتج غير موجود" : "Product not found"}
            </p>
          </div>
        ) : (
          <div className="grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-[280px_1fr]">
            <div className="flex items-center justify-center rounded-[8px] border border-border bg-card p-6">
              <img
                src={getProductImage(product.productImageUrl, "/placeholder.svg")}
                alt={name}
                className="max-h-56 object-contain"
              />
            </div>
            <div>
              {product.collections ? (
                <p className="text-[12px] uppercase tracking-wide text-muted-foreground">
                  {product.collections}
                </p>
              ) : null}
              <h1 className="mt-1 text-[22px] font-medium text-foreground">
                {name}
              </h1>
              {product.brand ? (
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {product.brand}
                </p>
              ) : null}

              <div className="mt-4 flex items-center gap-3">
                {product.isRFQ ? (
                  <span className="text-[16px] text-muted-foreground">
                    {isRTL ? "السعر عند الطلب" : "Price on request"}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[20px] font-semibold text-foreground">
                    <RiyalSymbol />
                    {effectivePrice(product).toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                    {product.unitOfMeasurement ? (
                      <span className="text-[13px] font-normal text-muted-foreground">
                        /{product.unitOfMeasurement}
                      </span>
                    ) : null}
                  </span>
                )}
                <span
                  className={`rounded-[4px] px-2 py-0.5 text-[11px] ${
                    product.inventory === "InStock"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {product.inventory === "InStock"
                    ? isRTL
                      ? "متوفر"
                      : "In stock"
                    : isRTL
                      ? "غير متوفر"
                      : "Out of stock"}
                </span>
              </div>

              {desc ? (
                <p className="mt-4 text-[14px] leading-relaxed text-foreground/80">
                  {desc}
                </p>
              ) : null}

              {product.sku ? (
                <p className="mt-3 text-[12px] text-muted-foreground">
                  SKU: {product.sku}
                </p>
              ) : null}

              {!product.isRFQ ? (
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={product.inventory === "OutOfStock"}
                  className="mt-6 flex items-center gap-2 rounded-[6px] bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {added ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <ShoppingCart className="h-4 w-4" />
                  )}
                  {added
                    ? isRTL
                      ? "تمت الإضافة"
                      : "Added to cart"
                    : isRTL
                      ? "أضف إلى السلة"
                      : "Add to cart"}
                </button>
              ) : null}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetailPage;
