import {
  configureStore,
  ThunkAction,
  Action,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

/*
 *
 *
 * WebGL detailed alignment view viewport location
 *
 *
 */

interface WebGLViewportState {
  pixelsFromWorldTop: number;

  //viewport: {
  //  firstSequenceIdx: number;
  //  firstSequenceWorldTop: number;
  //  residueWidth: number;
  //  residueHeight: number;
  //};
}

const initialState: WebGLViewportState = {
  pixelsFromWorldTop: 0,
};

export const webGLViewportSlice = createSlice({
  name: "webgl-viewport",
  initialState,
  reducers: {
    // Use the PayloadAction type to declare the contents of `action.payload`
    setPixelsFromWorldTop: (state, action: PayloadAction<number>) => {
      state.pixelsFromWorldTop = action.payload;
    },
  },
});

export const { setPixelsFromWorldTop } = webGLViewportSlice.actions;

/*
 *
 *
 * main store
 *
 *
 */

export const store = configureStore({
  reducer: {
    webglViewport: webGLViewportSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
