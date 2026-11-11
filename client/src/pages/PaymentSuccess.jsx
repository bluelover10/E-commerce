import { Link } from "react-router-dom";

function PaymentSuccess() {
  return (
    <div className="gradient-mesh flex min-h-screen items-center justify-center px-4 py-16">
      <div
        className="card-surface hover-lift w-full max-w-md p-10 text-center"
        role="status"
        aria-live="polite"
      >
        <div
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full"
          style={{
            background: "var(--success-soft)",
            color: "var(--success-ink)",
            boxShadow: "0 0 0 10px color-mix(in srgb, var(--success) 6%, transparent)",
          }}
          aria-hidden="true"
        >
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="section-title !text-3xl">Payment successful</h2>
        <p className="text-muted mt-3 text-sm leading-relaxed">
          Thank you for your purchase. We've received your order and it's being
          prepared for shipment — you'll get live updates along the way.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link to="/dashboard/orders" className="btn-primary btn-lg w-full">
            View my orders
          </Link>
          <Link to="/products" className="btn-ghost w-full">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccess;
