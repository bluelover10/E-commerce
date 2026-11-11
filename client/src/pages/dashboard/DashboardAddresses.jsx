import Addresses from "../Addresses";

export default function DashboardAddresses() {
  return (
    <div>
      <h2 className="mb-6 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        Saved addresses
      </h2>
      <Addresses embedded />
    </div>
  );
}
