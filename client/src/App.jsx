import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import ScrollToTop from "./components/ui/ScrollToTop";
import AppRoutes from "./routes/AppRoutes";

/* Light-only app: the former ThemeProvider (light/dark switching) was removed
   along with its CSS — one consistent light appearance everywhere. */
function App() {
  return (
    <BrowserRouter>
      <Provider store={store}>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <ScrollToTop />
              <AppRoutes />
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </Provider>
    </BrowserRouter>
  );
}

export default App;
