import "@emran-alhaddad/saudi-riyal-font/index.css";

interface RiyalSymbolProps {
  bold?: boolean;
  className?: string;
}

/**
 * Renders the official Saudi Riyal currency symbol (U+20C1)
 * using the @emran-alhaddad/saudi-riyal-font package.
 */
const RiyalSymbol = ({ bold = false, className = "" }: RiyalSymbolProps) => (
  <span
    className={`${bold ? "icon-saudi_riyal_bold_new" : "icon-saudi_riyal_new"} ${className}`}
    aria-label="SAR"
  />
);

export default RiyalSymbol;
