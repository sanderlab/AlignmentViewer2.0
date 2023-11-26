import {
  configureStore,
  ThunkAction,
  Action,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import { shallowEqual } from "react-redux";

export interface IVirtualizedMatrixState {
  //
  // ONLY SET BY CALLER
  //

  //the id of the matrix state
  id: string;

  //the surrounding div width/height
  screenSize: number;

  //the size of the cell - i.e., width or height in pixels
  cellPixelSize: number;

  //info about the matrix: the row or column count
  cellCount: number;

  //mouseover
  mouseMove: {
    hoverWorldOffset: number;   //the world offset hovering over
    hoverIdx: number;           //the row or column hovering over
    hoverIdxScreenMin: number;  //the left or top of the hover in screen pixels
    hoverIdxScreenMax: number;  //the right or bottom of the hover in screen pixels
  } | undefined;

  //toggled by clicking
  selected: {
    idx: number;                //the index of the selected row or column
    idxScreenMin: number;       //the left or top of the selected row or column in screen pixels
    idxScreenMax: number;       //the right or bottom of the selected row or column in screen pixels
  }[];

  //
  // SET BY CALLER, BUT WILL BE ADJUSTED IF OUT OF BOUNDS
  //

  //the number of pixels from the world top or world left where the rendering should start
  // (set by instantiator, but will be reset if out of bounds, i.e., clamped)
  worldOffset: number;

  //
  // SET ALGORITHMICALLY
  //

  //a flag to indicate that the state has been fully calculated and has enough info to render
  initialized: boolean;

  //when scrolling, some lines / columns often become partially visible and
  //this controls the vertical/horizontal offset one should apply to the
  //lines/columns when they are placed in the div.
  //It will always be negative or zero
  scrollingAdditionalOffset: number;

  // the actual rows or columns that should be rendered taking into
  // account the rendered location in the data (top, bottom, in the middle) and
  // line offsets
  idxsToRender: number[];

  //the actual canvas or rendered width/height. The rendered size is very close to the
  //screenSize, but is usually slightly larger as it is the actual number of cells being
  //rendered (renderedSize % cellPixelSize = 0), whereas the screenSize is the actual
  //parent div size
  renderSize: number;

  //world width/height
  worldSize: number;
}

/**
 * Initialize a particular instance of the virtualized row or column slice. If the id
 * already exists, nothing is done. If the id doesn't exist in the state then it is
 * created.
 * @param id
 * @param state
 * @returns the state untouched or initialized with default values
 */
const initializeNewIdAsNeeded = (
  id: string,
  state: { [id: string]: IVirtualizedMatrixState }
) => {
  if (id in state === false) {
    state[id] = {
      id: id,
      initialized: false,

      worldOffset: 0,

      cellPixelSize: -1,
      screenSize: -1,
      renderSize: -1,
      worldSize: -1,

      mouseMove: undefined,
      selected: [],

      cellCount: -1,

      idxsToRender: [],
      scrollingAdditionalOffset: -1,
    } as IVirtualizedMatrixState;
  }
  return state; // no need to copy, nothing done.
};

/**
 * Calculate details required to render the virtualized cells. This funciton will
 * also update the initialized flag to be true if all details are available.
 *
 * This function can adjust the following state members:
 *     initialized
 *     scrollingAdditionalOffset
 *     idxsToRender
 *     renderSize,
 *     worldSize
 *
 *     worldOffset (will only be changed if things are out of bounds)
 */
const attachRenderDetails = (state: IVirtualizedMatrixState) => {
  const { screenSize, cellCount, cellPixelSize } = state;

  if (screenSize === -1 || cellPixelSize === -1 || cellCount === -1) {
    return state; // no need to copy
  }

  state.initialized = true;
  state.worldSize = (cellCount * cellPixelSize);//works for vertical scrollbar scrolling

  //easiest case -- everything fits into the visible screen
  if (Math.floor(screenSize / cellPixelSize) >= cellCount) {
    //all lines / columns will fit into the screen - no offset positioning needed
    state.worldOffset = 0;
    state.scrollingAdditionalOffset = 0;
    state.idxsToRender = [...Array(cellCount).keys()];
    state.renderSize = state.idxsToRender.length * cellPixelSize;
    return state;
  }

  //clamp out of bounds
  if (state.worldOffset + screenSize > state.worldSize) {
    state.worldOffset = state.worldSize - screenSize;
  }
  if (state.worldOffset < 0) {
    state.worldOffset = 0;
  }

  //
  //
  // offsets
  //
  //
  const startInMiddleOfCell = state.worldOffset % cellPixelSize !== 0;
  const endInMiddleOfCell =
    (state.worldOffset + screenSize) % cellPixelSize !== 0;

  let firstRenderedCell = Math.ceil(state.worldOffset / cellPixelSize);
  let numCellsToRender = Math.floor(screenSize / cellPixelSize);
  if (startInMiddleOfCell && firstRenderedCell - 1 >= 0) {
    numCellsToRender += 1;
    firstRenderedCell -= 1;
  }
  if (
    endInMiddleOfCell &&
    firstRenderedCell + numCellsToRender + 1 < cellCount
  ) {
    numCellsToRender += 1;
  }

  //edge case: screen height < 1 line or width < 1 column. Show at least one in that case.
  numCellsToRender =
    numCellsToRender < 1 && cellCount > 0 ? 1 : numCellsToRender;

  state.scrollingAdditionalOffset = -1 * (state.worldOffset % cellPixelSize);

  //only update currentIds if they changed (for performance reasons). TODO: does this break any redux rules?
  const currentIdxsToRender = [...Array(numCellsToRender).keys()].map(
    (zeroIdx) => zeroIdx + firstRenderedCell
  );
  if(state.idxsToRender.length !== currentIdxsToRender.length ||
     !shallowEqual(state.idxsToRender, currentIdxsToRender) ){
    state.idxsToRender = currentIdxsToRender;
  }

  //update the selected element positioning
  var anyUpdated = false;
  const newSelected = state.selected.map((elem, idx) => {
    const minOffset = (elem.idx * state.cellPixelSize) - state.worldOffset;
    const newElem = {
      idx: elem.idx,
      idxScreenMin: minOffset,
      idxScreenMax: minOffset + state.cellPixelSize
    };
    anyUpdated = anyUpdated 
      ? true 
      : elem.idxScreenMax !== newElem.idxScreenMax || 
        elem.idxScreenMin !== newElem.idxScreenMin;
    return newElem
  }, []);

  if (anyUpdated){
    state.selected = newSelected;
  }

  state.renderSize = state.idxsToRender.length * cellPixelSize;
  return state;
};

/**
 *
 *
 * METHODS
 * Shared by both horizontal and vertical virtualized slices
 *
 *
 */

/**
 * Set the number of rows or columns
 * @param id
 * @param cellCount
 * @param state
 */
const setCellCount = (
  id: string,
  cellCount: number,
  state: { [id: string]: IVirtualizedMatrixState }
) => {
  state = initializeNewIdAsNeeded(id, state);
  state[id].cellCount = cellCount;
  state[id] = attachRenderDetails(state[id]);
  return state;
};

/**
 * Set the size of the cells in pixels
 * @param id
 * @param size
 * @param state
 */
const setCellSize = (
  id: string,
  size: number,
  state: { [id: string]: IVirtualizedMatrixState }
) => {
  state = initializeNewIdAsNeeded(id, state);
  const startCell = state[id].worldOffset / state[id].cellPixelSize;
  state[id].cellPixelSize = size;

  //try to maintain the same offset
  state[id].worldOffset = startCell * size;

  state[id] = attachRenderDetails(state[id]);
  return state;
};

/**
 * set the offset in increments of full cell increments
 * @param id
 * @param offsetInNumCells offset in full cell increments, i.e., row or column
 *                         offsets not pixel offsets
 * @param state
 */
const setWorldCellOffset = (
  id: string,
  offsetInNumCells: number,
  state: { [id: string]: IVirtualizedMatrixState }
) => {
  state = initializeNewIdAsNeeded(id, state);
  state[id].worldOffset = offsetInNumCells * state[id].cellPixelSize;
  state[id] = attachRenderDetails(state[id]);
  return state;
};

/**
 * set the offset in pixel dimensions
 * @param id
 * @param offsetInPixels offset in full pixels, i.e., not the row or column
 *                       offsets
 * @param state
 */
const setWorldPixelOffset = (
  id: string,
  offsetInPixels: number,
  state: { [id: string]: IVirtualizedMatrixState }
) => {
  state = initializeNewIdAsNeeded(id, state);
  state[id].worldOffset = offsetInPixels;
  state[id] = attachRenderDetails(state[id]);
  return state;
};

/**
 * Set the size of the screen bounding element
 * @param id
 * @param screenSize
 * @param state
 */
const setScreenSize = (
  id: string,
  screenSize: number,
  state: { [id: string]: IVirtualizedMatrixState }
) => {
  state = initializeNewIdAsNeeded(id, state);
  state[id].screenSize = screenSize;
  state[id] = attachRenderDetails(state[id]);
  return state;
};

/**
 *
 * @param pixelOffsets
 * @param state
 */
const batchSetPixelOffsets = (
  pixelOffsets: { id: string; newPixelOffset: number }[],
  state: { [id: string]: IVirtualizedMatrixState }
) => {
  pixelOffsets.forEach((obj) => {
    const { id, newPixelOffset } = obj;
    state = initializeNewIdAsNeeded(id, state);
    state[id].worldOffset = newPixelOffset;
    state[id] = attachRenderDetails(state[id]);
  });
  return state;
};


/**
 * Set the size of the screen bounding element
 * @param id
 * @param mouseOffset
 * @param state
 */
const setMouseOver = (
  id: string,
  mouseViewportOffset: number | undefined,
  state: { [id: string]: IVirtualizedMatrixState }
) => {
  state = initializeNewIdAsNeeded(id, state);
  if (mouseViewportOffset === undefined || state[id].initialized === false){
    state[id].mouseMove = undefined;
  }
  else{
    const mouseWorldOffset = mouseViewportOffset + state[id].worldOffset;
    const hoverIdx = Math.floor(mouseWorldOffset / state[id].cellPixelSize);
    state[id].mouseMove = {
      hoverWorldOffset: mouseWorldOffset,
      hoverIdx: hoverIdx,
      hoverIdxScreenMin: (hoverIdx * state[id].cellPixelSize) - state[id].worldOffset,
      hoverIdxScreenMax: ((hoverIdx * state[id].cellPixelSize) + state[id].cellPixelSize) - state[id].worldOffset,
    };
  }
  state[id] = attachRenderDetails(state[id]);
  return state;
};


/**
 * toggle a selected row or column on or off
 * @param id
 * @param mouseOffset
 * @param state
 */
const toggleSelected = (
  id: string,
  mouseViewportOffset: number,
  state: { [id: string]: IVirtualizedMatrixState }
) => {
  state = initializeNewIdAsNeeded(id, state);
  const mouseWorldOffset = mouseViewportOffset + state[id].worldOffset;
  const clickedIdx = Math.floor(mouseWorldOffset / state[id].cellPixelSize);
  //console.log(
  //  'mouseViewportOffset:'+mouseViewportOffset+', worldOffset:'+state[id].worldOffset + ', state[id].cellPixelSize:'+state[id].cellPixelSize+
  //  ', mouseWorldOffset='+mouseWorldOffset+', clickedIdx:'+clickedIdx + ',state[id].initialized:'+state[id].initialized
  //);
  
  const newSelected = state[id].selected.reduce((acc, element) => {
    if (element.idx !== clickedIdx){
      acc.push(element);
    }
    return acc;
  }, [] as IVirtualizedMatrixState["selected"]);

  if (newSelected.length === state[id].selected.length){
    //nothing was removed, so it is a toggle on. otherwise it 
    //was a toggle off and it was removed
    newSelected.push({
      idx: clickedIdx,
      idxScreenMin: -1, //set by attachRenderDetails
      idxScreenMax: -1, //set by attachRenderDetails
    })
  }
  state[id].selected = newSelected;
  //console.log('state[id].selected:', state[id].selected);
  state[id] = attachRenderDetails(state[id]);
  return state;
};

/**
 *
 *
 * SLICES
 *
 *
 */
export const virtualizedHorizontalSlice = createSlice({
  name: "virtualized-horizontal-slice",
  initialState: {} as { [id: string]: IVirtualizedMatrixState },

  reducers: {
    toggleSelectedPosition: (
      state,
      action: PayloadAction<{
        id: string;
        mouseViewportOffsetX: number;
      }>
    ) => {
      return toggleSelected(
        action.payload.id, action.payload.mouseViewportOffsetX, state
      );
    },

    setMouseOverX: (
      state,
      action: PayloadAction<{
        id: string;
        mouseViewportOffsetX: number | undefined;
      }>
    ) => {
      return setMouseOver(
        action.payload.id, action.payload.mouseViewportOffsetX, state
      );
    },

    setColumnCount: (
      state,
      action: PayloadAction<{
        id: string;
        columnCount: number;
      }>
    ) => {
      return setCellCount(action.payload.id, action.payload.columnCount, state);
    },

    setColumnWidth: (
      state,
      action: PayloadAction<{
        id: string;
        columnWidth: number;
      }>
    ) => {
      return setCellSize(action.payload.id, action.payload.columnWidth, state);
    },

    setWorldLeftColumnOffset: (
      state,
      action: PayloadAction<{ id: string; columnOffset: number }>
    ) => {
      return setWorldCellOffset(
        action.payload.id,
        action.payload.columnOffset,
        state
      );
    },

    setWorldLeftPixelOffset: (
      state,
      action: PayloadAction<{ id: string; worldLeftPixelOffset: number }>
    ) => {
      return setWorldPixelOffset(
        action.payload.id,
        action.payload.worldLeftPixelOffset,
        state
      );
    },

    setScreenWidth: (
      state,
      action: PayloadAction<{
        id: string;
        screenWidth: number;
      }>
    ) => {
      setScreenSize(action.payload.id, action.payload.screenWidth, state);
    },

    batchSetWorldLeftPixelOffset: (
      state,
      action: PayloadAction<{ id: string; newPixelOffset: number }[]>
    ) => {
      return batchSetPixelOffsets(action.payload, state);
    },
  },
});

export const virtualizedVerticalSlice = createSlice({
  name: "virtualized-vertical-slice",
  initialState: {} as { [id: string]: IVirtualizedMatrixState },

  reducers: {
    toggleSelectedSequence: (
      state,
      action: PayloadAction<{
        id: string;
        mouseViewportOffsetY: number;
      }>
    ) => {
      return toggleSelected(
        action.payload.id, action.payload.mouseViewportOffsetY, state
      );
    },

    setMouseOverY: (
      state,
      action: PayloadAction<{
        id: string;
        mouseViewportOffsetY: number | undefined;
      }>
    ) => {
      return setMouseOver(
        action.payload.id, action.payload.mouseViewportOffsetY, state
      );
    },

    setRowCount: (
      state,
      action: PayloadAction<{
        id: string;
        rowCount: number;
      }>
    ) => {
      return setCellCount(action.payload.id, action.payload.rowCount, state);
    },

    setRowHeight: (
      state,
      action: PayloadAction<{
        id: string;
        rowHeight: number;
      }>
    ) => {
      return setCellSize(action.payload.id, action.payload.rowHeight, state);
    },

    setWorldTopRowOffset: (
      state,
      action: PayloadAction<{ id: string; rowOffset: number }>
    ) => {
      return setWorldCellOffset(
        action.payload.id,
        action.payload.rowOffset,
        state
      );
    },

    setWorldTopPixelOffset: (
      state,
      action: PayloadAction<{ id: string; worldTopPixelOffset: number }>
    ) => {
      return setWorldPixelOffset(
        action.payload.id,
        action.payload.worldTopPixelOffset,
        state
      );
    },

    setScreenHeight: (
      state,
      action: PayloadAction<{
        id: string;
        screenHeight: number;
      }>
    ) => {
      setScreenSize(action.payload.id, action.payload.screenHeight, state);
    },

    batchSetWorldTopPixelOffset: (
      state,
      action: PayloadAction<{ id: string; newPixelOffset: number }[]>
    ) => {
      return batchSetPixelOffsets(action.payload, state);
    },
  },
});

/*
 *
 *
 * export slice functions
 *
 *
 */
export const {
  toggleSelectedPosition,
  setMouseOverX,
  setColumnCount,
  setColumnWidth,
  setWorldLeftColumnOffset,
  setWorldLeftPixelOffset,
  setScreenWidth,
  batchSetWorldLeftPixelOffset,
} = virtualizedHorizontalSlice.actions;

export const {
  toggleSelectedSequence,
  setMouseOverY,
  setRowCount,
  setRowHeight,
  setWorldTopRowOffset,
  setWorldTopPixelOffset,
  setScreenHeight,
  batchSetWorldTopPixelOffset,
} = virtualizedVerticalSlice.actions;

/*
 *
 *
 * export some helper functions
 *
 *
 */


/*
 *
 *
 * main store
 *
 *
 */
export const store = configureStore({
  reducer: {
    virtualizedHorizontalSlice: virtualizedHorizontalSlice.reducer,
    virtualizedVerticalSlice: virtualizedVerticalSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
export type AppDispatch = typeof store.dispatch