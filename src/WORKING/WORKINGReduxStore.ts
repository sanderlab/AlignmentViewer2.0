import {
  configureStore,
  ThunkAction,
  Action,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import { shallowEqual } from "react-redux";


//functions:
//1. export const {
//   toggleSelected(screenOffset) [position / sequence]
//   registerMouseover(screenOffset: number) [position / sequence]
//   setCellCount(count: number),
//   setColumnWidth,
//   setWorldLeftColumnOffset,
//   setWorldLeftPixelOffset,
//   setScreenWidth,
//   batchSetWorldLeftPixelOffset,

/***************************************************************************
 * IVirtualizedViewportDimensions
 * 
 * This  object contains viewport specific information (div size in pixels, 
 * cell size) for virtualizing the vertical or horizontal dimension of a 
 * viewport. This object should be shared amongst multiple viewports if they 
 * are to be kept in sync. 
 * 
 */
export interface IVirtualizedViewportDimension {
  //CALLER SET: the parent div width/height - REQUIRED
  divHolderSizePx: number;

  //CALLER SET: the width/height of each cell (aka scale) - DEFAULT: 1
  cellSizePx: number;

  //
  //imparative that caller utilize these
  //

  //SET ALGORITHMICALLY - the "world offset" to fit exactly in the webgl viewport. This
  //is the top of the viewport and should be applied 
  fullyRenderedCanvasOffset: number;

  //SET ALGORITHMICALLY. When scrolling, some lines / columns can become partially visible
  //and this controls the vertical/horizontal offset that the viewport must apply to the
  //non-webgl elements  (i.e., top: state.additionalOffsetPx). 
  //It will always be negative or zero
  htmlElementOffset: number;

  // SET ALGORITHMICALLY. the actual rows or columns that should be rendered taking into
  // account the rendered location in the data (top, bottom, in the middle) and
  // line offsets
  idxsToRender: number[];

  //
  //helpful for caller
  //

  //SET ALGORITHMICALLY. the actual canvas or rendered width/height. The rendered size is 
  //very close to the divHolderSizePx, but is usually slightly larger as it is the actual number 
  //of cells being rendered (renderSizePx % cellSizePx = 0), whereas the screenSize is the 
  //actual parent div size
  renderSizePx: number;

  //SET ALGORITHMICALLY. The world width/height for this viewport. This value is equal to 
  //the cellSizePx x cellCount ()
  worldSizePx: number;

  //
  // INTERACTION EVENTS - calculated algorithmically
  //
  mouseHover?: {                       //SET ALGORITHMICALLY. the pixel sizes of "mouseHoverIdx"
    icx: number;                       //SET ALGORITHMICALLY. included for ease of identification
    screenMinPx: number;               //SET ALGORITHMICALLY: the left or top of the hover idx in pixels
    screenSizePx: number;              //SET ALGORITHMICALLY: equal to the cellSizePx (but helpful for css)
  }
  selected: {                          //SET ALGORITHMICALLY. one for each entry of "selectedIdxs" (same order also)
    idx: number;                       //SET ALGORITHMICALLY. included for ease of identification
    screenMinPx: number;               //SET ALGORITHMICALLY: the left or top of the selected idx in pixels
    screenSizePx: number;              //SET ALGORITHMICALLY: equal to the cellSizePx (but helpful for css)
  }[];
}

export interface IVirtualizedDimension { //one for horizontal and one for vertical
  id: string;                            //CALLER SET 
  cellCount: number;                     //CALLER SET - the # of rows or columns
  direction: "vertical" | "horizontal";  //SET ALGORITHMICALLY (well based on how call initializes) 

  mouseHoverIdx?: number;                //SET ALGORITHMICALLY - row or column mouse is hovering over
  selectedIdxs: number[];                //SET ALGORITHMICALLY - rows or columns selected. ordered ascending

  defaultViewport: IVirtualizedViewportDimension;
  additionalViewports: {
    [viewportId: string]: IVirtualizedViewportDimension
  };
}

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
const attachRenderDetails = (state: IVirtualizedDimension) => {
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

//
const populateViewportCalculatedValues = (
  cellCount: number, vp: IVirtualizedViewportDimension
) => {
  vp = {...vp};


  if (Math.floor(vp.divHolderSizePx / vp.cellSizePx) >= cellCount) {
    //all lines / columns will fit into the screen - no offset positioning needed
    vp.worldOffsetPx = 0;
    vp.additionalOffsetPx = 0;
    vp.idxsToRender = shallowEqual(vp.idxsToRender, [...Array(cellCount).keys()]) 
      ? vp.idxsToRender : 
      [...Array(cellCount).keys()]; //only update if changed
  }
  else{

  }

  //check and update selected element coordinates
  const currentSelected = vp.selected.map((item)=>{
    const minOffset = (item.idx * vp.cellSizePx) - vp.worldOffsetPx;
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
  });
  vp.selected = vp.selected[0].

  //easy ones
  vp.renderSizePx = vp.cellSizePx * vp.idxsToRender.length;
  vp.worldSizePx = cellCount * vp.cellSizePx;

  return vp;

  return {
    divHolderSizePx, //caller set
    cellSizePx: , //caller set

    idxsToRender: , 
    selected: ,
    worldOffsetPx: , 
    additionalOffsetPx: ,
    renderSizePx: vp.cellSizePx x vp.idxsToRender.length,
    worldSizePx: cellCount * vp.cellSizePx
  } as IVirtualizedViewportDimension;
};


/**
 * Calculate details required to render the virtualized cells. This funciton will
 * also update the initialized flag to be true if all details are available.
 *
 * This function can adjust the following state members for each viewport:
 *     additionalOffsetPx
 *     canvasSizePx
 *     idxsToRender
 *     renderSizePx,
 *     worldOffsetPx 
 */
const populateCalculatedValues = (state: IVirtualizedDimension) => {
  state = {...state}; //return a new state
  const { cellCount } = state;


  const {}
  state.defaultViewport.renderSizePx;
  state.defaultViewport.canvasSizePx = state.defaultViewport.cellSizePx;
  state.defaultViewport.worldSizePx  = cellCount * state.defaultViewport.cellSizePx;
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

const setupNewVirtualizedDimension = (
  id: string,
  cellCount: number,
  divHolderSizePx: number,
  cellSizePx: number,
  direction: "vertical" | "horizontal",
  state: { [id: string]: IVirtualizedDimension }
) => {
  return {
    ...state,
    id: {
      id: id, 
      cellCount: cellCount,
      direction: direction,
      selectedIdxs: [],
      defaultViewport: {
        divHolderSizePx: divHolderSizePx,
        cellSizePx: 1,
        initialized: false,
        worldOffsetPx: 0,
        additionalOffsetPx: 0, 
        renderSizePx: cellCount*cellSizePx, 
        idxsToRender: [],
        selected: [],
        canvasSizePx: 0, //set later
      },
      additionalViewports: {}
    } as IVirtualizedDimension
  };
};


const addNewViewport = (
  id: string,
  state: { [id: string]: IVirtualizedDimension }
) => {

  state[id].cellCount = cellCount;
  state[id] = attachRenderDetails(state[id]);
  return state;
};


/**
 * Set the number of rows or columns
 * @param id
 * @param cellCount
 * @param state
 */
const setCellCount = (
  id: string,
  cellCount: number,
  state: { [id: string]: IVirtualizedDimension }
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
  state: { [id: string]: IVirtualizedDimension }
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
  state: { [id: string]: IVirtualizedDimension }
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
  state: { [id: string]: IVirtualizedDimension }
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
  state: { [id: string]: IVirtualizedDimension }
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
  state: { [id: string]: IVirtualizedDimension }
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
  state: { [id: string]: IVirtualizedDimension }
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
  state: { [id: string]: IVirtualizedDimension }
) => {
  state = initializeNewIdAsNeeded(id, state);
  const mouseWorldOffset = mouseViewportOffset + state[id].worldOffset;
  const clickedIdx = Math.floor(mouseWorldOffset / state[id].cellPixelSize);
  console.log(
    'mouseViewportOffset:'+mouseViewportOffset+', worldOffset:'+state[id].worldOffset + ', state[id].cellPixelSize:'+state[id].cellPixelSize+
    ', mouseWorldOffset='+mouseWorldOffset+', clickedIdx:'+clickedIdx + ',state[id].initialized:'+state[id].initialized
  );
  
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
  console.log('state[id].selected:', state[id].selected);
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
  initialState: {} as { [id: string]: IVirtualizedDimension },

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
  initialState: {} as { [id: string]: IVirtualizedDimension },

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