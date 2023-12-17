import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

//
// Virtualization is done on each axis individually. 
// Synchronization:
// - If 2+ axes are to be synced and have the same cellSizePx (e.g., 
//   horizontal sync between logo, barplot and main msa viewport), they 
//   should use the same "IGenericAxis" state. 
// - If 2+ axes are to be synced and and have different cellSizePx (e.g.,
//   vertical axis of minimap and main msa viewport), then each should
//   each have their own "IGenericVirtualization" states. In the future
//   this could be added as separate axes and tracked in the virtualization
//   but edge cases make it difficult to synchronize algorithmically (see
//   UPDATE below - I tried and ran into issues).
//
export interface IGenericVirtualization {
  //ONLY SET BY CALLER - used to enforce only a single controller 
  //container is used for initialization and sizing
  controllerContainerId: string;  

  //ONLY SET BY CALLER
  cellCount: number;

  //ONLY SET BY CALLER - the div / viewport size
  containerSizePx: number;

  //ONLY SET BY CALLER - the width of each column or height of each row
  cellSizePx: number;

  //CALCULATED AND SET BY CALLER [will be clamped if out of bounds] 
  worldOffsetPx: number; 

  offsets?: ReturnType<typeof attachOffsets>;
}

export interface IGenericVirtualizations {
  [virtualizationUUID: string]: IGenericVirtualization
}

//
// Functions for mutating state based on update requests
//
//const updateOffsets = (
//  virtualization: IGenericVirtualization, 
//  baseOffsetsOnAxis?: IGenericAxis,   //adjust other axes to this one
//) => {
//  const {
//    cellCount,
//    axes
//  } = virtualization;
//
//  //default to the first axis if there is nothing being (this should only
//  //happens at initialization)
//  baseOffsetsOnAxis = baseOffsetsOnAxis ? baseOffsetsOnAxis : axes[0];
//
//  //Interpolate between different potential scales. The scales go from zero to
//  //the maxOffset for each virtualized axis
//  const updatedAxisWorldSize = cellCount * baseOffsetsOnAxis.cellSizePx;
//
//  //compute max amount world can be offset - clamp to zero if world smaller than container
//  let updatedAxisMaxOffset = updatedAxisWorldSize - baseOffsetsOnAxis.containerSizePx;
//  updatedAxisMaxOffset = updatedAxisMaxOffset >= 0 
//    ? updatedAxisMaxOffset 
//    : 0;
//  
//  //clamp update if necessary
//  baseOffsetsOnAxis.worldOffsetPx = baseOffsetsOnAxis.worldOffsetPx < 0
//    ? 0
//    : baseOffsetsOnAxis.worldOffsetPx > updatedAxisMaxOffset
//      ? updatedAxisMaxOffset
//      : baseOffsetsOnAxis.worldOffsetPx;
//  
//  //
//  //
//  //
//
//  //
//  // set offsets on all virtualized axes
//  // UPDATE: The problem with multiple axes is that if the updating axis fits 
//  //         into the container as is, then the clamped "updatedAxisMaxOffset" 
//  //         becomes zero and it is unclear how to deal with interpolation with 
//  //         other axes. Switching to a single axis for now - interpolation will
//  //         then be done custom in any axis that need synchronization and have a
//  //         different cellSsize.
//  //
//
//  for (const ax of axes){ //forEach has incorrect typescript error on updatedAxis 
//    const axWorldSizePx = cellCount * ax.cellSizePx;
//    const axMaxOffset = axWorldSizePx - ax.containerSizePx;
//
//    /***********************************
//     * interpolate between scales [0, updatedAxisMaxOffset] and [0, axMaxOffset]
//     *      y = y1 + ((x – x1)/(x2 - x1) * (y2 - y1))
//     *      where: 
//     *        x1 and y1 = 0
//     *        x = updatedAxis.worldOffsetPx
//     *        x2 = updatedAxisMaxOffset
//     *        y2 = axMaxOffset
//     *      y = 0 + ((updatedAxis.worldOffsetPx - 0)/(updatedAxisMaxOffset-0)) * axMaxOffset
//     */
//    ax.worldOffsetPx = (baseOffsetsOnAxis.worldOffsetPx / updatedAxisMaxOffset) * axMaxOffset;
//    //TODO: is there a need to clamp? I don't think so since we clamp the top above..
//  }
//}



const attachOffsets = (
  cellCount: number,
  cellSizePx: number,
  containerSizePx: number,
  worldOffsetPx: number
) => {
  //initialize return object assuming render fully fits into viewport container
  const toReturn = {

    //
    //FIXED PROPERTIES
    //

    //for virtualizaitons that fully render all ids and then shift
    //within the viewport
    offsetForFullWorldRender: worldOffsetPx, //FIXED

    //the size of a full render (if all cells are rendered)
    worldRenderSizePx: cellCount * cellSizePx, //FIXED

    //
    //PROPERTIES ADJUSTED BELOW AS NEEDED
    //

    //the first and last idx to render //adjusted below
    firstIdxToRender: 0,
    lastIdxToRender: cellCount-1,
    numIdxsToRender: cellCount,

    //for virtualizaitons that render only the idxs in the viewport container
    offsetForRenderingIdxsOnly: 0, //adjusted below

    //the rendered size if everything doesn't fit into the container viewport
    //later this is equal to:
    //    (lastIdxToRender-firstIdxToRender+1) * cellSize
    subsetRenderSizePx: cellCount * cellSizePx,
  }
  
  if (toReturn.worldRenderSizePx > containerSizePx){ 
    //the viewport isn't large enough to fit the entire virtualization 
    //without offsetting - do some math
    const startInMiddleOfCell = worldOffsetPx % cellSizePx !== 0;
    const endInMiddleOfCell = 
      (worldOffsetPx + containerSizePx) % cellSizePx !== 0;

    let firstRenderedCellIdx = Math.ceil(worldOffsetPx / cellSizePx);
    let numCellsToRender = Math.floor(containerSizePx / cellSizePx);
    if (startInMiddleOfCell && (firstRenderedCellIdx - 1) >= 0) {
      numCellsToRender += 1;
      firstRenderedCellIdx -= 1;
    }
    if (
      endInMiddleOfCell && (firstRenderedCellIdx + numCellsToRender + 1) < 
      cellCount
    ) {
      numCellsToRender += 1;
    }

    //edge case: screen height < 1 line or width < 1 column. Show at least one in that case.
    numCellsToRender = (
      (numCellsToRender < 1) && (cellCount > 0) 
    )
      ? 1 
      : numCellsToRender;

    //update return object
    toReturn.offsetForRenderingIdxsOnly = -( //wrong
      worldOffsetPx % cellSizePx
    );
    toReturn.subsetRenderSizePx = cellSizePx * numCellsToRender;
    toReturn.firstIdxToRender = firstRenderedCellIdx;
    toReturn.lastIdxToRender = firstRenderedCellIdx+numCellsToRender-1;
    toReturn.numIdxsToRender = numCellsToRender;
  }
  return toReturn;
}

//
// Functions for mutating state based on update requests
//
const checkAndFixWorldOffset = (
  virtualization: IGenericVirtualization
) => {
  const {
    cellCount,
    cellSizePx,
    containerSizePx,
    worldOffsetPx
  } = virtualization;
  const axisWorldSize = cellCount * cellSizePx;

  //compute max amount world can be offset - clamp to zero if world smaller 
  //than container
  let axisMaxOffset = axisWorldSize - containerSizePx;
  axisMaxOffset = axisMaxOffset >= 0 
    ? axisMaxOffset 
    : 0;
  
  //clamp update if necessary
  virtualization.worldOffsetPx = worldOffsetPx < 0
    ? 0
    : worldOffsetPx > axisMaxOffset
      ? axisMaxOffset
      : worldOffsetPx;
  
  //attach offsets
  virtualization.offsets = attachOffsets(
    virtualization.cellCount, 
    virtualization.cellSizePx, 
    virtualization.containerSizePx, 
    virtualization.worldOffsetPx
  )
}


//
// define the reducers
//
const genericReducers = {

  //
  //initialization of a new alignment
  //
  initializeNewVirtualization: (
    state: IGenericVirtualizations,
    action: PayloadAction<{
      virtualizationId: string;
      virtualization: IGenericVirtualization;
    }>
  ) => {
    const {
      virtualizationId,
      virtualization
    } = action.payload;
    checkAndFixWorldOffset(virtualization);
    state[virtualizationId] = virtualization;
  },

  //
  // update cell (row/column) count
  //
  setCellCount: (
    state: IGenericVirtualizations,
    action: PayloadAction<{ 
      virtualizationId: string;
      cellCount: number;
    }>
  ) => {
    const {
      virtualizationId,
      cellCount
    } = action.payload;

    if(state[virtualizationId].cellCount !== cellCount){
      state[virtualizationId].cellCount = cellCount;
      checkAndFixWorldOffset( state[virtualizationId] );
    }
  },

  //
  // update cell size (height/width)
  //
  setCellSize: (
    state: IGenericVirtualizations,
    action: PayloadAction<{ 
      virtualizationId: string;
      cellSizePx: number;
    }>
  ) => {
    const {
      cellSizePx,
      virtualizationId,
    } = action.payload;

    if(state[virtualizationId].cellSizePx !== cellSizePx){
      state[virtualizationId].cellSizePx = cellSizePx;
      checkAndFixWorldOffset(state[virtualizationId]);
    }
  },

  //
  // update cell size (height/width)
  //
  setContainerSize: (
    state: IGenericVirtualizations,
    action: PayloadAction<{ 
      virtualizationId: string;
      containerSizePx: number;
    }>
  ) => {
    const {
      virtualizationId,
      containerSizePx,
    } = action.payload;

    if(state[virtualizationId].containerSizePx !== containerSizePx){
      state[virtualizationId].containerSizePx = containerSizePx;
      checkAndFixWorldOffset(state[virtualizationId]);
    }
  },

  //
  // update cell size (height/width)
  //
  setWorldOffset: (
    state: IGenericVirtualizations,
    action: PayloadAction<{ 
      virtualizationId: string;
      worldOffsetPx: number;
    }>
  ) => {
    const {
      virtualizationId,
      worldOffsetPx,
    } = action.payload;
    if(state[virtualizationId].worldOffsetPx !== worldOffsetPx){
      state[virtualizationId].worldOffsetPx = worldOffsetPx;
      checkAndFixWorldOffset(state[virtualizationId]);
    }
  },
};


export const alignmentVirtualizationsSlice = createSlice({
  name: "alignment-virtualization",
  initialState: {} as IGenericVirtualizations,
  reducers: genericReducers,
  selectors: {
    //returns the details about a specific axis or undefined
    //if either the virtualizationId or axisId do not exist
    getAxisOffsets: (
      state: IGenericVirtualizations, 
      virtualizationId: string
    ) => {
      const virtualization = state[virtualizationId];
      if(!virtualization) return undefined;

      const {
        cellSizePx,
        containerSizePx,
        worldOffsetPx
      } = virtualization;
      
      //initialize return object assuming render fully fits into viewport container
      const toReturn = {

        //
        //FIXED PROPERTIES
        //

        //for virtualizaitons that fully render all ids and then shift
        //within the viewport
        offsetForFullWorldRender: worldOffsetPx, //FIXED

        //the size of a full render (if all cells are rendered)
        worldRenderSizePx: virtualization.cellCount * cellSizePx, //FIXED

        //
        //PROPERTIES ADJUSTED BELOW AS NEEDED
        //

        //the first and last idx to render //adjusted below
        firstIdxToRender: 0,
        lastIdxToRender: virtualization.cellCount-1,
        numIdxsToRender: virtualization.cellCount,

        //for virtualizaitons that render only the idxs in the viewport container
        offsetForRenderingIdxsOnly: 0, //adjusted below

        //the rendered size if everything doesn't fit into the container viewport
        //later this is equal to:
        //    (lastIdxToRender-firstIdxToRender+1) * cellSize
        subsetRenderSizePx: virtualization.cellCount * cellSizePx,
      }
      
      if (toReturn.worldRenderSizePx > containerSizePx){ 
        //the viewport isn't large enough to fit the entire virtualization 
        //without offsetting - do some math
        const startInMiddleOfCell = worldOffsetPx % cellSizePx !== 0;
        const endInMiddleOfCell = 
          (worldOffsetPx + containerSizePx) % cellSizePx !== 0;

        let firstRenderedCellIdx = Math.ceil(worldOffsetPx / cellSizePx);
        let numCellsToRender = Math.floor(containerSizePx / cellSizePx);
        if (startInMiddleOfCell && (firstRenderedCellIdx - 1) >= 0) {
          numCellsToRender += 1;
          firstRenderedCellIdx -= 1;
        }
        if (
          endInMiddleOfCell && (firstRenderedCellIdx + numCellsToRender + 1) < 
          virtualization.cellCount
        ) {
          numCellsToRender += 1;
        }

        //edge case: screen height < 1 line or width < 1 column. Show at least one in that case.
        numCellsToRender = (
          (numCellsToRender < 1) && (virtualization.cellCount > 0) 
        )
          ? 1 
          : numCellsToRender;

        //update return object
        toReturn.offsetForRenderingIdxsOnly = -( //wrong
          worldOffsetPx % cellSizePx
        );
        toReturn.subsetRenderSizePx = cellSizePx * numCellsToRender;
        toReturn.firstIdxToRender = firstRenderedCellIdx;
        toReturn.lastIdxToRender = firstRenderedCellIdx+numCellsToRender-1;
        toReturn.numIdxsToRender = numCellsToRender;
      }
      return toReturn;
    }

  }
});

export const {
  initializeNewVirtualization,
  setCellCount,
  setCellSize,
  setContainerSize,
  setWorldOffset,
} = alignmentVirtualizationsSlice.actions;

export const {
  getAxisOffsets
} = alignmentVirtualizationsSlice.selectors;

//example selector usage
//const blah = useSelector((state: IGenericVirtualizations)  =>
//  alignmentVirtualizationsSlice.getSelectors().getAxisParams(
//    state, 'asdf', 'asdf'
//  ), shallowEqual
//);
