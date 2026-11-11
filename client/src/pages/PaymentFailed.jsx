import { Link } from "react-router-dom";

function PaymentFailed() {
  return (
    <div className="gradient-mesh flex min-h-screen items-center justify-center px-4 py-16">
      <div
        className="card-surface hover-lift w-full max-w-md p-10 text-center"
        role="alert"
        aria-live="polite"
      >
        <div
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full"
          style={{
            background: "var(--danger-soft)",
            color: "var(--danger-ink)",
            boxShadow: "0 0 0 10px color-mix(in srgb, var(--danger) 6%, transparent)",
          }}
          aria-hidden="true"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </div>
        <h2 className="section-title !text-3xl">Payment failed</h2>
        <p className="text-muted mt-3 text-sm leading-relaxed">
          We couldn't process your payment — no money was charged. Your cart is
          safe; you can try again or pay with cash on delivery.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link to="/cart" className="btn-primary btn-lg w-full">
            Back to checkout
          </Link>
          <Link to="/contact" className="btn-ghost w-full">
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PaymentFailed;
