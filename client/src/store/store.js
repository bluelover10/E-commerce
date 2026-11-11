import { configureStore } from "@reduxjs/toolkit";
import notificationsReducer from "./slices/notificationsSlice";
import vendorReducer from "./slices/vendorSlice";
import analyticsReducer from "./slices/analyticsSlice";

// productsSlice / cartSlice were removed — cart state lives exclusively in
// CartContext (localStorage-backed) and product listing data in component state.
export const store = configureStore({
  reducer: {
    notifications: notificationsReducer,
    vendor: vendorReducer,
    analytics: analyticsReducer,
  },
  middleware: (getDefault) => getDefault({ serializableCheck: false }),
});

export default store;
