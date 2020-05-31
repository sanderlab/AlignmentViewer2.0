import {
  configureStore,
  ThunkAction,
  Action,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

interface IAlignmentDetailsState {
  //a flag to indicate that the state has been fully calculated
  //and has enough info to render the msa
  initialized: boolean;

  //the number of pixels from the world top where the viewport should start
  worldTopOffset: number;

  //the dimension scale for individual residues
  residueWidth: number;
  residueHeight: number;

  //
  //VISIBLE SEQUENCES
  //

  // the first sequence completely visible in the viewport. Unless
  // the entire alignment is being shown, there may be a sequence
  // partially shown above this sequence.
  firstFullyVisibleSeqIdx: number;

  //when scrolling, some sequences often become partially visible and
  //this controls the vertical offset one should apply to the sequences
  //when they are placed in the div.
  //It will always be negative or zero
  //or zero
  scrollingAdditionalVerticalOffset: number;

  // the actual number of sequences that should be rendered taking into
  // account the viewport location (top, bottom, in the middle) and
  // sequence offsets
  seqIdxsToRender: number[];

  //the surrounding div dimensions
  clientWidth: number;
  clientHeight: number;

  //the actual canvas size that webgl draws into
  viewportWidth: number;
  viewportHeight: number;

  //world dimensions
  worldWidth: number;
  worldHeight: number;

  //info about alignment
  sequenceCount: number;
  sequenceLength: number;
}

/**
 * Calculate details required to render the alignment. Will update
 * the initialized flag to be true if all details are available.
 */
const attachRenderDetails = (state: IAlignmentDetailsState) => {
  const {
    clientHeight,
    residueWidth,
    residueHeight,
    sequenceCount,
    sequenceLength,
  } = state;

  if (
    clientHeight === -1 ||
    residueWidth === -1 ||
    residueHeight === -1 ||
    sequenceCount === -1 ||
    sequenceLength === -1
  ) {
    return;
  }

  state.initialized = true;

  state.worldHeight = sequenceCount * residueHeight;
  state.worldWidth = sequenceLength * residueWidth;

  //always render 2 more than needed unless there are not 2 more.
  const maxFullyVisibleSeqs =
    Math.floor(clientHeight / residueHeight) < sequenceCount
      ? Math.floor(clientHeight / residueHeight)
      : sequenceCount;

  const maxSeqsToRender =
    maxFullyVisibleSeqs + 2 <= sequenceCount
      ? maxFullyVisibleSeqs + 2
      : maxFullyVisibleSeqs + 1 <= sequenceCount
      ? maxFullyVisibleSeqs + 1
      : sequenceCount;

  const maxStartingSeqIdx = sequenceCount - maxSeqsToRender; //never below zero

  if (
    state.worldTopOffset + maxSeqsToRender * residueHeight >=
    state.worldHeight
  ) {
    //state.worldTopOffset is past the bottom of the viewport.
    //clamp topoffset to last possible sequence
    state.worldTopOffset = state.worldHeight - clientHeight;
  }

  if (state.worldTopOffset % residueHeight === 0) {
    //top of view is perfectly aligned with a the top of a sequence
    //1 additional sequence will be rendered, which won't be fully visible
    //as it will flow past the bottom
    state.firstFullyVisibleSeqIdx =
      state.worldTopOffset / residueHeight > maxStartingSeqIdx
        ? maxStartingSeqIdx
        : state.worldTopOffset / residueHeight;

    state.scrollingAdditionalVerticalOffset = 0;
    state.seqIdxsToRender = [
      ...Array(Math.min(maxFullyVisibleSeqs + 1, maxSeqsToRender)).keys(),
    ].map((zeroIdx) => zeroIdx + state.firstFullyVisibleSeqIdx);
  } else {
    //top of the view is scrolled partially past a sequence
    //2 additional sequences will be rendered, neither of which will be
    //fully visible as the first partially flows above the viewport and
    //bottom partially below the viewport
    state.firstFullyVisibleSeqIdx =
      Math.floor(state.worldTopOffset / residueHeight) > maxStartingSeqIdx
        ? maxStartingSeqIdx
        : Math.floor(state.worldTopOffset / residueHeight);
    state.scrollingAdditionalVerticalOffset =
      -1 * (state.worldTopOffset % residueHeight);
    state.seqIdxsToRender = [
      ...Array(Math.min(maxFullyVisibleSeqs + 2, maxSeqsToRender)).keys(),
    ].map((zeroIdx) => zeroIdx + state.firstFullyVisibleSeqIdx);
  }

  state.viewportWidth = sequenceLength * residueWidth;
  state.viewportHeight = state.seqIdxsToRender.length * residueHeight;

  return state;
};

export const alignmentDetailsSlice = createSlice({
  name: "alignment-details",
  initialState: {
    initialized: false,

    worldTopOffset: 0,

    residueHeight: -1,
    residueWidth: -1,
    clientHeight: -1,
    clientWidth: -1,
    viewportWidth: -1,
    viewportHeight: -1,
    worldWidth: -1,
    worldHeight: -1,

    sequenceCount: -1,
    sequenceLength: -1,

    firstFullyVisibleSeqIdx: -1,
    seqIdxsToRender: [],
    scrollingAdditionalVerticalOffset: -1,
  } as IAlignmentDetailsState,
  reducers: {
    setAlignmentDetails: (
      state,
      action: PayloadAction<{
        sequenceCount: number;
        sequenceLength: number;
      }>
    ) => {
      state.sequenceCount = action.payload.sequenceCount;
      state.sequenceLength = action.payload.sequenceLength;
      attachRenderDetails(state);
    },

    setResidueDimensions: (
      state,
      action: PayloadAction<{
        residueWidth: number;
        residueHeight: number;
      }>
    ) => {
      state.residueHeight = action.payload.residueHeight;
      state.residueWidth = action.payload.residueWidth;
      attachRenderDetails(state);
    },

    setViewportDimensions: (
      state,
      action: PayloadAction<{
        clientWidth: number;
        clientHeight: number;
      }>
    ) => {
      state.clientWidth = action.payload.clientWidth;
      state.clientHeight = action.payload.clientHeight;
      attachRenderDetails(state);
    },

    setWorldTopOffset: (state, action: PayloadAction<number>) => {
      state.worldTopOffset = action.payload;
      attachRenderDetails(state);
    },
  },
  extraReducers: (builder) => {
    //builder.addCase(minimapTopOffsetChanged, (state, action) => {
    //  const worldTopOffset = action.payload * state.residueHeight;
    //  state.firstFullyVisibleSequenceIdx = action.payload;
    //  state.visibleSequenceOffset = 0;
    //});
  },
});

export const {
  setAlignmentDetails,
  setResidueDimensions,
  setViewportDimensions,
  setWorldTopOffset,
} = alignmentDetailsSlice.actions;

/*
 *
 *
 * WebGL detailed alignment view viewport location
 *
 *
 */

interface WebGLViewportState {
  pixelsFromWorldTop: number;
}

const initialWebGLViewportState: WebGLViewportState = {
  pixelsFromWorldTop: 0,
};

export const webGLViewportSlice = createSlice({
  name: "webgl-viewport",
  initialState: initialWebGLViewportState,
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
    //alignmentSlice: alignmentSlice.reducer,
    alignmentDetailsSlice: alignmentDetailsSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
