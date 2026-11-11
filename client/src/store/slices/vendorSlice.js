import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as vendorService from "../../services/vendorService";

export const fetchMyVendor = createAsyncThunk("vendor/me", async (_, { rejectWithValue }) => {
  try {
    const r = await vendorService.getMyVendor();
    return r.data || r;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || "No vendor profile");
  }
});

export const fetchVendorStats = createAsyncThunk("vendor/stats", async (_, { rejectWithValue }) => {
  try {
    const r = await vendorService.getStats();
    return r.data || r;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || "Failed");
  }
});

const slice = createSlice({
  name: "vendor",
  initialState: { profile: null, stats: null, status: "idle", error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMyVendor.fulfilled, (s, a) => { s.profile = a.payload; s.status = "succeeded"; })
      .addCase(fetchMyVendor.rejected, (s, a) => { s.error = a.payload; s.status = "failed"; })
      .addCase(fetchVendorStats.fulfilled, (s, a) => { s.stats = a.payload; });
  },
});

export default slice.reducer;
