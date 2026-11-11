import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as analyticsService from "../../services/analyticsService";

export const fetchOverview = createAsyncThunk("analytics/overview", async (_, { rejectWithValue }) => {
  try {
    const r = await analyticsService.getOverview();
    return r.data || r;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || "Failed");
  }
});

const slice = createSlice({
  name: "analytics",
  initialState: { overview: null, status: "idle", error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchOverview.pending, (s) => { s.status = "loading"; })
      .addCase(fetchOverview.fulfilled, (s, a) => { s.overview = a.payload; s.status = "succeeded"; })
      .addCase(fetchOverview.rejected, (s, a) => { s.error = a.payload; s.status = "failed"; });
  },
});

export default slice.reducer;
