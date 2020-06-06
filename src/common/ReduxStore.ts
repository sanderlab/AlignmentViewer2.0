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
 *
 * This function can adjust the following state members:
 *     initialized
 *     firstFullyVisibleSeqIdx
 *     scrollingAdditionalVerticalOffset
 *     seqIdxsToRender
 *     viewportHeight, viewportWidth,
 *     worldHeight, worldWidth
 *
 *     worldTopOffset (will only be changed if things are out of bounds)
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

  if (Math.floor(clientHeight / residueHeight) >= sequenceCount) {
    //all sequences in the alignment will fit into the client - no
    //positioning needed
    state.worldTopOffset = 0;
    state.scrollingAdditionalVerticalOffset = 0;
    state.seqIdxsToRender = [...Array(sequenceCount).keys()];
    state.viewportWidth = sequenceLength * residueWidth;
    state.viewportHeight = state.seqIdxsToRender.length * residueHeight;
    return state;
  }

  if (state.worldTopOffset + clientHeight > state.worldHeight) {
    state.worldTopOffset = state.worldHeight - clientHeight;
  }
  if (state.worldTopOffset < 0) {
    state.worldTopOffset = 0; // I don't think this should ever happen, but just in case
  }

  const topInMiddleOfResidue = state.worldTopOffset % residueHeight !== 0;
  const bottomInMiddleOfResidue =
    (state.worldTopOffset + clientHeight) % residueHeight !== 0;

  let firstRenderedSeq = Math.ceil(state.worldTopOffset / residueHeight);
  let numSeqsToRender = Math.floor(clientHeight / residueHeight);
  if (topInMiddleOfResidue && firstRenderedSeq - 1 >= 0) {
    numSeqsToRender += 1;
    firstRenderedSeq -= 1;
  }
  if (
    bottomInMiddleOfResidue &&
    firstRenderedSeq + numSeqsToRender + 1 < sequenceCount
  ) {
    numSeqsToRender += 1;
  }

  state.scrollingAdditionalVerticalOffset =
    -1 * (state.worldTopOffset % residueHeight);
  state.seqIdxsToRender = [...Array(numSeqsToRender).keys()].map(
    (zeroIdx) => zeroIdx + firstRenderedSeq
  );

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
      const startResidueTop = state.worldTopOffset / state.residueHeight;
      state.residueHeight = action.payload.residueHeight;
      state.residueWidth = action.payload.residueWidth;

      //try to maintain the same residue at the top
      state.worldTopOffset = startResidueTop * action.payload.residueHeight;
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

    setSequenceTopOffset: (state, action: PayloadAction<number>) => {
      state.worldTopOffset = action.payload * state.residueHeight;
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
  setSequenceTopOffset,
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
