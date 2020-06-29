import {
  configureStore,
  ThunkAction,
  Action,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

export interface IVirtualizedMatrixState {
  //a flag to indicate that the state has been fully calculated
  //and has enough info to render the msa
  initialized: boolean;

  //the number of pixels from the world top where the viewport should start
  worldTopOffset: number;

  //the scale
  columnWidth: number;
  rowHeight: number;

  //
  //VISIBLE ROWS
  //

  //when scrolling, some lines often become partially visible and
  //this controls the vertical offset one should apply to the lines
  //when they are placed in the div.
  //It will always be negative or zero
  scrollingAdditionalVerticalOffset: number;

  // the actual number of lines that should be rendered taking into
  // account the viewport location (top, bottom, in the middle) and
  // line offsets
  rowIdxsToRender: number[];

  //the surrounding div dimensions
  clientWidth: number;
  clientHeight: number;

  //the actual canvas size that webgl draws into
  viewportWidth: number;
  viewportHeight: number;

  //world dimensions
  worldWidth: number;
  worldHeight: number;

  //info about the matrix
  rowCount: number;
  columnCount: number;
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
  state: { [id: string]: IVirtualizedMatrixState }
) => {
  if (id in state === false) {
    state[id] = {
      initialized: false,

      worldTopOffset: 0,

      rowHeight: -1,
      columnWidth: -1,
      clientHeight: -1,
      clientWidth: -1,
      viewportWidth: -1,
      viewportHeight: -1,
      worldWidth: -1,
      worldHeight: -1,

      rowCount: -1,
      columnCount: -1,

      rowIdxsToRender: [],
      scrollingAdditionalVerticalOffset: -1,
    } as IVirtualizedMatrixState;
  }
  return state; // no need to copy, nothing done.
};

/**
 * Calculate details required to render the matrix. Will update
 * the initialized flag to be true if all details are available.
 *
 * This function can adjust the following state members:
 *     initialized
 *     scrollingAdditionalVerticalOffset
 *     rowIdxsToRender
 *     viewportHeight, viewportWidth,
 *     worldHeight, worldWidth
 *
 *     worldTopOffset (will only be changed if things are out of bounds)
 */
const attachRenderDetails = (state: IVirtualizedMatrixState) => {
  const { clientHeight, columnWidth, rowHeight, rowCount, columnCount } = state;

  if (
    clientHeight === -1 ||
    columnWidth === -1 ||
    rowHeight === -1 ||
    rowCount === -1 ||
    columnCount === -1
  ) {
    return state; // no need to copy
  }

  state.initialized = true;
  state.worldHeight = rowCount * rowHeight;
  state.worldWidth = columnCount * columnWidth;

  if (Math.floor(clientHeight / rowHeight) >= rowCount) {
    //all lines in the text will fit into the client - no offset positioning needed
    state.worldTopOffset = 0;
    state.scrollingAdditionalVerticalOffset = 0;
    state.rowIdxsToRender = [...Array(rowCount).keys()];
    state.viewportWidth = columnCount * columnWidth;
    state.viewportHeight = state.rowIdxsToRender.length * rowHeight;
    return state;
  }

  if (state.worldTopOffset + clientHeight > state.worldHeight) {
    state.worldTopOffset = state.worldHeight - clientHeight;
  }
  if (state.worldTopOffset < 0) {
    state.worldTopOffset = 0; // I don't think this should ever happen, but just in case
  }

  const topInMiddleOfLine = state.worldTopOffset % rowHeight !== 0;
  const bottomInMiddleOfLine =
    (state.worldTopOffset + clientHeight) % rowHeight !== 0;

  let firstRenderedLine = Math.ceil(state.worldTopOffset / rowHeight);
  let numLinesToRender = Math.floor(clientHeight / rowHeight);
  if (topInMiddleOfLine && firstRenderedLine - 1 >= 0) {
    numLinesToRender += 1;
    firstRenderedLine -= 1;
  }
  if (
    bottomInMiddleOfLine &&
    firstRenderedLine + numLinesToRender + 1 < rowCount
  ) {
    numLinesToRender += 1;
  }

  //edge case: client height < 1 line. Show at least one in that case.
  numLinesToRender =
    numLinesToRender < 1 && rowCount > 0 ? 1 : numLinesToRender;

  state.scrollingAdditionalVerticalOffset =
    -1 * (state.worldTopOffset % rowHeight);
  state.rowIdxsToRender = [...Array(numLinesToRender).keys()].map(
    (zeroIdx) => zeroIdx + firstRenderedLine
  );

  state.viewportWidth = columnCount * columnWidth;
  state.viewportHeight = state.rowIdxsToRender.length * rowHeight;

  return state;
};

export const virtualizedMatrixSlice = createSlice({
  name: "virtualized-matrix",
  initialState: {} as { [id: string]: IVirtualizedMatrixState },

  reducers: {
    setMatrixSize: (
      state,
      action: PayloadAction<{
        id: string;
        rowCount: number;
        columnCount: number;
      }>
    ) => {
      const { id, rowCount, columnCount } = action.payload;
      state = initializeNewIdAsNeeded(id, state);
      state[id].rowCount = rowCount;
      state[id].columnCount = columnCount;
      state[id] = attachRenderDetails(state[id]);
      return state;
    },

    setMatrixDimensions: (
      state,
      action: PayloadAction<{
        id: string;
        columnWidth: number;
        rowHeight: number;
      }>
    ) => {
      const { id, columnWidth, rowHeight } = action.payload;
      state = initializeNewIdAsNeeded(id, state);
      const startLineTop = state[id].worldTopOffset / state[id].rowHeight;
      state[id].rowHeight = rowHeight;
      state[id].columnWidth = columnWidth;

      //try to maintain the same line at the top
      state[id].worldTopOffset = startLineTop * rowHeight;

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

    setRowTopOffset: (
      state,
      action: PayloadAction<{ id: string; lineTopOffset: number }>
    ) => {
      const { id, lineTopOffset } = action.payload;
      state = initializeNewIdAsNeeded(id, state);
      state[id].worldTopOffset = lineTopOffset * state[id].rowHeight;
      state[id] = attachRenderDetails(state[id]);
      return state;
    },
  },
});

export const {
  setMatrixDimensions,
  setMatrixSize,
  setRowTopOffset,
  setViewportDimensions,
  setWorldTopOffset,
} = virtualizedMatrixSlice.actions;

/*
 *
 *
 * main store
 *
 *
 */

export const store = configureStore({
  reducer: {
    virtualizedMatrixSlice: virtualizedMatrixSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
