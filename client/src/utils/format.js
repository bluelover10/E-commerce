export function formatPrice(price) {
  if (price == null || Number.isNaN(Number(price))) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatRating(rating) {
  return Number(rating || 0).toFixed(1);
}
