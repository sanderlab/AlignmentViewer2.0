import {
  configureStore,
  ThunkAction,
  Action,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

export interface IAlignmentDetailsState {
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
 * Initialize a particular instance of the alignment details. If the id
 * already exists, nothing is done. If the id doesn't exist in the state
 * then it is created.
 * @param id
 * @param state
 * @returns a copy of the state
 */
const initializeNewIdAsNeeded = (
  id: string,
  state: { [id: string]: IAlignmentDetailsState }
) => {
  if (id in state === false) {
    state[id] = {
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
    } as IAlignmentDetailsState;
  }
  return state; // no need to copy, nothing done.
};

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
const attachRenderDetails = (
  particularAlignmentDetailsState: IAlignmentDetailsState
) => {
  const {
    clientHeight,
    residueWidth,
    residueHeight,
    sequenceCount,
    sequenceLength,
  } = particularAlignmentDetailsState;

  if (
    clientHeight === -1 ||
    residueWidth === -1 ||
    residueHeight === -1 ||
    sequenceCount === -1 ||
    sequenceLength === -1
  ) {
    return particularAlignmentDetailsState; // no need to copy
  }

  particularAlignmentDetailsState.initialized = true;
  particularAlignmentDetailsState.worldHeight = sequenceCount * residueHeight;
  particularAlignmentDetailsState.worldWidth = sequenceLength * residueWidth;

  if (Math.floor(clientHeight / residueHeight) >= sequenceCount) {
    //all sequences in the alignment will fit into the client - no
    //positioning needed
    particularAlignmentDetailsState.worldTopOffset = 0;
    particularAlignmentDetailsState.scrollingAdditionalVerticalOffset = 0;
    particularAlignmentDetailsState.seqIdxsToRender = [
      ...Array(sequenceCount).keys(),
    ];
    particularAlignmentDetailsState.viewportWidth =
      sequenceLength * residueWidth;
    particularAlignmentDetailsState.viewportHeight =
      particularAlignmentDetailsState.seqIdxsToRender.length * residueHeight;
    return particularAlignmentDetailsState;
  }

  if (
    particularAlignmentDetailsState.worldTopOffset + clientHeight >
    particularAlignmentDetailsState.worldHeight
  ) {
    particularAlignmentDetailsState.worldTopOffset =
      particularAlignmentDetailsState.worldHeight - clientHeight;
  }
  if (particularAlignmentDetailsState.worldTopOffset < 0) {
    particularAlignmentDetailsState.worldTopOffset = 0; // I don't think this should ever happen, but just in case
  }

  const topInMiddleOfResidue =
    particularAlignmentDetailsState.worldTopOffset % residueHeight !== 0;
  const bottomInMiddleOfResidue =
    (particularAlignmentDetailsState.worldTopOffset + clientHeight) %
      residueHeight !==
    0;

  let firstRenderedSeq = Math.ceil(
    particularAlignmentDetailsState.worldTopOffset / residueHeight
  );
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

  particularAlignmentDetailsState.scrollingAdditionalVerticalOffset =
    -1 * (particularAlignmentDetailsState.worldTopOffset % residueHeight);
  particularAlignmentDetailsState.seqIdxsToRender = [
    ...Array(numSeqsToRender).keys(),
  ].map((zeroIdx) => zeroIdx + firstRenderedSeq);

  particularAlignmentDetailsState.viewportWidth = sequenceLength * residueWidth;
  particularAlignmentDetailsState.viewportHeight =
    particularAlignmentDetailsState.seqIdxsToRender.length * residueHeight;

  return particularAlignmentDetailsState;
};

export const alignmentDetailsSlice = createSlice({
  name: "alignment-details",
  initialState: {} as { [id: string]: IAlignmentDetailsState },

  reducers: {
    setAlignmentDetails: (
      state,
      action: PayloadAction<{
        id: string;
        sequenceCount: number;
        sequenceLength: number;
      }>
    ) => {
      const { id, sequenceCount, sequenceLength } = action.payload;
      state = initializeNewIdAsNeeded(id, state);
      state[id].sequenceCount = sequenceCount;
      state[id].sequenceLength = sequenceLength;
      state[id] = attachRenderDetails(state[id]);
      return state;
    },

    setResidueDimensions: (
      state,
      action: PayloadAction<{
        id: string;
        residueWidth: number;
        residueHeight: number;
      }>
    ) => {
      const { id, residueWidth, residueHeight } = action.payload;
      state = initializeNewIdAsNeeded(id, state);
      const startResidueTop =
        state[id].worldTopOffset / state[id].residueHeight;
      state[id].residueHeight = residueHeight;
      state[id].residueWidth = residueWidth;

      //try to maintain the same residue at the top
      state[id].worldTopOffset = startResidueTop * residueHeight;

      state[id] = attachRenderDetails(state[id]);
      return state;
    },

    setViewportDimensions: (
      state,
      action: PayloadAction<{
        id: string;
        clientWidth: number;
        clientHeight: number;
      }>
    ) => {
      const { id, clientWidth, clientHeight } = action.payload;
      state = initializeNewIdAsNeeded(id, state);
      state[id].clientWidth = clientWidth;
      state[id].clientHeight = clientHeight;
      state[id] = attachRenderDetails(state[id]);
      return state;
    },

    setWorldTopOffset: (
      state,
      action: PayloadAction<{ id: string; worldTopOffset: number }>
    ) => {
      const { id, worldTopOffset } = action.payload;
      state = initializeNewIdAsNeeded(id, state);
      state[id].worldTopOffset = worldTopOffset;
      state[id] = attachRenderDetails(state[id]);
      return state;
    },

    setSequenceTopOffset: (
      state,
      action: PayloadAction<{ id: string; sequenceTopOffset: number }>
    ) => {
      const { id, sequenceTopOffset } = action.payload;
      state = initializeNewIdAsNeeded(id, state);
      state[id].worldTopOffset = sequenceTopOffset * state[id].residueHeight;
      state[id] = attachRenderDetails(state[id]);
      return state;
    },
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
 * main store
 *
 *
 */

export const store = configureStore({
  reducer: {
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
