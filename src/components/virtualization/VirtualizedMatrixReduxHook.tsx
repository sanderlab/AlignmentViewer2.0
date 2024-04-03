/**
 * Base react hook for interacting with virtualizations in the redux store.
 * the hook for initializng redux with visualization data
 */
import{ useEffect, useCallback } from "react";

import { 
  IGenericVirtualizationComplete,
  //getAxisOffsets, 
  initializeNewVirtualization as reduxInitializeNewVirtualization,
  setCellCount as reduxSetCellCount,
  setCellSize as reduxSetCellSize,
  setContainerSize as reduxSetContainerSize,
  setWorldOffset as reduxSetWorldOffset,
  setHoveredOffset as reduxSetHoveredOffset
} from "../../redux/VirtualizationReducers";
import { 
  IControllerVirtualizeReduxParams,
  IResponderVirtualizeReduxParams,
  VirtualizationRole,
} from "./VirtualizationTypes";
import { useAppDispatch, useAppSelector } from "../../redux/ReduxStore";


//
// typing
//
interface IFullyInitializedResponderReturn extends IGenericVirtualizationComplete {
  setWorldOffsetPx: (newWorldOffsetPx: number) => void;
  setHoveredOffsetPx: (mouseContainerOffsetPx?: number) => void;
  updateContainerSizePx: undefined;
  updateCellSizePx: undefined;
  updateCellCount: undefined;
}
interface IFullyInitControllerReturn extends IGenericVirtualizationComplete {
  setWorldOffsetPx: (newWorldOffsetPx: number) => void;
  setHoveredOffsetPx: (mouseContainerOffsetPx?: number) => void;
  updateContainerSizePx: (newContainerSizePx: number) => void;
  updateCellSizePx: (newCellSizePx: number) => void;
  updateCellCount: (newCellCount: number) => void;
}

export type VirtualizationInputParams = IResponderVirtualizeReduxParams | IControllerVirtualizeReduxParams | undefined;
export type VirtualizationReturnType<T extends VirtualizationInputParams> = 
    T extends undefined 
      ? undefined 
      : T extends IControllerVirtualizeReduxParams 
        ? IFullyInitControllerReturn 
        : IFullyInitializedResponderReturn;

//
// primary hook that deals with initializaiton of redux virtualizations
//
export function useReduxVirtualization<
  T extends VirtualizationInputParams
>(
  params: T,
  containerId: string,
  containerSizePx?: number
): VirtualizationReturnType<VirtualizationInputParams> {
  
  const virtualization = useAppSelector(
    state => !params?.virtualizationId
      ? undefined 
      : state.virtualizations[params.virtualizationId]
  );

  const isController = params?.role === VirtualizationRole.Controller;
  const dispatch = useAppDispatch();

  //no virtualization? create it if this is a controller
  useEffect(() => {
    if(isController && containerSizePx !== undefined){
      if(virtualization && virtualization.controllerContainerId !== containerId){
        console.warn(`Development possibly misconfigured - attempt to initialize multiple 
        "controller" virtualizations. There must only be a single controller for each
        virtualization. Updating to the last created controller, but this may be an
        error.`);
      }
      if (!virtualization || virtualization.controllerContainerId !== containerId){
        dispatch(
          reduxInitializeNewVirtualization({
            virtualizationId: params?.virtualizationId,
            virtualization: {
              cellCount: params.cellCount,
              controllerContainerId: containerId, 
              containerSizePx: containerSizePx, 
              cellSizePx: params.cellSizePx, 
              worldOffsetPx: 0
            }
          })
        );
      }
    }
  }, [
    containerSizePx,
    containerId,
    dispatch, 
    isController, 
    params?.virtualizationId,
    params?.cellCount,
    params?.cellSizePx,
    virtualization,
  ]);

  //
  //functions available to caller if initialized
  //
  const setWorldOffsetPx = useCallback((newWorldOffsetPx: number)=>{
    if (params?.virtualizationId){
      dispatch(reduxSetWorldOffset({
        virtualizationId: params.virtualizationId,
        worldOffsetPx: newWorldOffsetPx
      }))
    }
  }, [
    dispatch,
    params?.virtualizationId,
  ]);

  const setHoveredOffsetPx = useCallback((mouseContainerOffsetPx?: number)=>{
    if (params?.virtualizationId){
      dispatch(reduxSetHoveredOffset({
        virtualizationId: params.virtualizationId,
        mouseContainerOffsetPx: mouseContainerOffsetPx
      }))
    }
  }, [
    dispatch,
    params?.virtualizationId,
  ]);

  const updateContainerSizePx = useCallback((newContainerSizePx: number)=>{
    if (params?.virtualizationId){
      dispatch(reduxSetContainerSize({
        virtualizationId: params.virtualizationId,
        containerSizePx: newContainerSizePx
      }))
    }
  }, [
    dispatch,
    params?.virtualizationId,
  ]);

  const updateCellSizePx = useCallback((newCellSizePx: number)=>{
    if (params?.virtualizationId){
      dispatch(reduxSetCellSize({
        virtualizationId: params.virtualizationId,
        cellSizePx: newCellSizePx
      }))
    }
  }, [
    dispatch,
    params?.virtualizationId
  ]);

  const updateCellCount = useCallback((newCellCount: number)=>{
    if (params?.virtualizationId){
      dispatch(reduxSetCellCount({
        virtualizationId: params.virtualizationId,
        cellCount: newCellCount
      }))
    }
  }, [
    dispatch,
    params?.virtualizationId,
  ]);

  //
  // return nothing if not initialized
  // otherwise
  //    - return the axis+cellCount if not a controller
  //    - return the axis+cellCount+update functions if it is a controller
  //
  return !virtualization
    ? undefined
    : !isController
      ? { 
        ...virtualization,
        setWorldOffsetPx: setWorldOffsetPx,
        setHoveredOffsetPx: setHoveredOffsetPx,
        updateContainerSizePx: undefined,
        updateCellSizePx: undefined,
        updateCellCount: undefined
      } as IFullyInitializedResponderReturn
      : {
        ...virtualization,
        setWorldOffsetPx: setWorldOffsetPx,
        setHoveredOffsetPx: setHoveredOffsetPx,
        updateContainerSizePx: updateContainerSizePx,
        updateCellSizePx: updateCellSizePx,
        updateCellCount: updateCellCount
      } as IFullyInitControllerReturn
}
