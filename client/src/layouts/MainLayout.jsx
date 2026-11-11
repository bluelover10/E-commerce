import { Outlet } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PageTransition from "../components/ui/PageTransition";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="flex-1">
        <PageTransition />
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
