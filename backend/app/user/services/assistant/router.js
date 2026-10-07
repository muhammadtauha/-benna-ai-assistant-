// backend/app/user/services/assistant/router.js
// Deterministic pre-router. Its whole job is to answer (or classify) turns
// WITHOUT spending an AI call, so the assistant stays cheap at scale.
// Only turns that fall through to `needsAi` reach the gateway.

const GREETING =
  /^\s*(hi|hello|hey|salam|salaam|assalam|as-salam|السلام|مرحبا|هلا|اهلا|أهلا|صباح الخير|مساء الخير)\b[\s!.,]*$/i;
const THANKS =
  /^\s*(thanks|thank you|thx|shukran|شكرا|شكراً|مشكور)\b[\s!.,]*$/i;
const BYE = /^\s*(bye|goodbye|see you|مع السلامة|وداعا)\b[\s!.,]*$/i;

const ORDER_STATUS =
  /\b(where is my order|order status|track (my )?order|my orders|حالة (ال)?طلب|تتبع (ال)?طلب|طلباتي)\b/i;
const RETURN_POLICY =
  /\b(return policy|refund policy|how (do|can) i return|سياسة (الإرجاع|الاسترجاع)|كيف (أرجع|ارجع))\b/i;
const SHIPPING =
  /\b(shipping (cost|policy|time)|delivery time|how long.*deliver|مدة التوصيل|تكلفة التوصيل|الشحن)\b/i;
const CONTACT =
  /\b(contact|customer (service|support)|phone number|whatsapp|اتصال|خدمة العملاء|رقم الهاتف|واتساب)\b/i;
const RFQ_INTENT =
  /\b(rfq|rfp|request for quote|bulk quote|tender|عرض سعر|طلب عرض سعر|مناقصة|كميات كبيرة)\b/i;
const BOQ_INTENT =
  /\b(boq|bill of quantit|estimate my (project|villa|building)|material list for|قائمة الكميات|حصر الكميات|جدول الكميات)\b/i;

const AR = /[\u0600-\u06FF]/;

const CANNED = {
  greeting: {
    en: "Hello! I'm Benna's procurement assistant. Tell me what you need — a product, a brand, a budget, or a whole project — and I'll pull matching items from our 182,000+ product catalog.",
    ar: "مرحباً! أنا مساعد المشتريات في بنّاء. أخبرني بما تحتاجه — منتج، ماركة، ميزانية، أو مشروع كامل — وسأجد لك المنتجات المناسبة من كتالوجنا الذي يحتوي أكثر من 182,000 منتج.",
  },
  thanks: {
    en: "Anytime. Need anything else for your project?",
    ar: "في أي وقت. هل تحتاج أي شيء آخر لمشروعك؟",
  },
  bye: {
    en: "Goodbye — come back whenever you need materials.",
    ar: "إلى اللقاء — تفضل بالعودة في أي وقت تحتاج فيه مواد.",
  },
  order_status: {
    en: "You can track every order — including delivery status and invoices — from your Orders page.",
    ar: "يمكنك تتبع جميع طلباتك — بما في ذلك حالة التوصيل والفواتير — من صفحة الطلبات.",
  },
  returns: {
    en: "Returns are handled from your order details page: open the order, pick the items, and submit a return request. Eligible items can be returned within the window shown on the order.",
    ar: "تتم عملية الإرجاع من صفحة تفاصيل الطلب: افتح الطلب، اختر المنتجات، وأرسل طلب إرجاع. يمكن إرجاع المنتجات المؤهلة خلال المدة الموضحة في الطلب.",
  },
  shipping: {
    en: "Delivery time and shipping cost depend on the vendor and your city — both are shown on each product page and again at checkout before you pay.",
    ar: "تعتمد مدة التوصيل وتكلفة الشحن على البائع ومدينتك — ويظهر كلاهما في صفحة المنتج ومرة أخرى في صفحة الدفع قبل السداد.",
  },
  contact: {
    en: "Our team is on WhatsApp via the button at the bottom of any page, or you can open a support ticket from your account.",
    ar: "فريقنا متاح على واتساب من خلال الزر في أسفل أي صفحة، أو يمكنك فتح تذكرة دعم من حسابك.",
  },
};

const LINKS = {
  order_status: [{ label: "Orders", labelAr: "الطلبات", href: "/orders" }],
  returns: [{ label: "Orders", labelAr: "الطلبات", href: "/orders" }],
  shipping: [{ label: "Shipping info", labelAr: "معلومات الشحن", href: "/shipping-delivery" }],
  contact: [{ label: "Support", labelAr: "الدعم", href: "/contact" }],
};

/**
 * @param {string} message
 * @param {{ hasHistory?: boolean, lang?: 'en'|'ar' }} ctx
 * @returns {{ handled: boolean, needsAi: boolean, kind: string, reply?: string, links?: Array, mode?: string }}
 */
function route(message, ctx = {}) {
  const text = String(message || "").trim();
  const lang = AR.test(text) ? "ar" : ctx.lang === "ar" ? "ar" : "en";
  const pick = (kind) => ({
    handled: true,
    needsAi: false,
    kind,
    reply: CANNED[kind][lang],
    links: LINKS[kind] || [],
    lang,
  });

  if (!text) return { handled: true, needsAi: false, kind: "empty", reply: CANNED.greeting[lang], links: [], lang };

  // Short canned turns — never worth an AI call.
  if (text.length <= 40) {
    if (GREETING.test(text)) return pick("greeting");
    if (THANKS.test(text)) return pick("thanks");
    if (BYE.test(text)) return pick("bye");
  }

  if (ORDER_STATUS.test(text)) return pick("order_status");
  if (RETURN_POLICY.test(text)) return pick("returns");
  if (SHIPPING.test(text) && !/price|سعر/i.test(text)) return pick("shipping");
  if (CONTACT.test(text) && text.length <= 60) return pick("contact");

  // Handoffs: still AI-assisted, but tagged so the orchestrator can attach
  // the right CTA instead of pretending to be a search.
  const mode = BOQ_INTENT.test(text)
    ? "boq"
    : RFQ_INTENT.test(text)
      ? "rfq"
      : "product_search";

  return { handled: false, needsAi: true, kind: "ai", mode, lang };
}

module.exports = { route };
