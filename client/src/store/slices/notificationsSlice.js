import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as notificationService from "../../services/notificationService";

export const fetchNotifications = createAsyncThunk("notifications/fetch", async (_, { rejectWithValue }) => {
  try {
    return await notificationService.list();
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || "Failed");
  }
});

const slice = createSlice({
  name: "notifications",
  initialState: { items: [], unread: 0, status: "idle" },
  reducers: {
    pushRealtime(state, action) {
      state.items.unshift(action.payload);
      state.unread += 1;
    },
    markAllReadLocal(state) {
      state.items = state.items.map((n) => ({ ...n, isRead: true }));
      state.unread = 0;
    },
    markReadLocal(state, action) {
      const n = state.items.find((x) => x._id === action.payload);
      if (n && !n.isRead) {
        n.isRead = true;
        state.unread = Math.max(0, state.unread - 1);
      }
    },
    removeLocal(state, action) {
      const target = state.items.find((x) => x._id === action.payload);
      if (target && !target.isRead) state.unread = Math.max(0, state.unread - 1);
      state.items = state.items.filter((x) => x._id !== action.payload);
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchNotifications.fulfilled, (s, a) => {
      s.items = a.payload.data || a.payload || [];
      s.unread = a.payload.unread || 0;
      s.status = "succeeded";
    });
  },
});

export const { pushRealtime, markAllReadLocal, markReadLocal, removeLocal } = slice.actions;
export default slice.reducer;
