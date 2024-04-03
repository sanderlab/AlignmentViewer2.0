
//
// general

import { IBounds } from "../ResizeSensorHook";

//
export enum VirtualizationStrategy {
  //fully render all rows/columns (offset = worldShiftPx)
  ShiftOnlyFullyRendered,

  //render of only requested rows/columns (offset = renderShiftPx)
  Virtualize,

  //virtualizedmatrix should not perform the offset at all - it will be
  //done manually by the caller
  Manual
};


export enum ScrollbarOptions{
  //no scrollbar
  NeverOn = "NeverOn", 

  //show the scrollbar at all times if overflowed (other component hovered)
  AlwaysOnWhenOverflowed = "AlwaysOnWhenOverflowed", 

  //show the scrollbar when hovered over the virtualization
  OnHoverWhenOverflowed = "AlwaysOnWOnHoverWhenOverflowedhenOverflowed", 
}

export enum VirtualizationRole{
  Controller, //sets the container sizing, initializes the axis
  Responder
}


//
// inteface for passing props from parent AlignmentViewer component to
// component classes like AlignmentDetails, PositionalAxis, PositionalBarplot,
// SequenceLogo, MiniMap
//
interface IVirtualizationBasics {
  virtualizationId: string;
}
export interface IControllerRole extends IVirtualizationBasics{
  role: VirtualizationRole.Controller;
  cellCount: number;
  cellSizePx: number;
}
export interface IResponderRole extends IVirtualizationBasics{
  role: VirtualizationRole.Responder;
  cellCount: never;
  cellSizePx: never;
}


//
// Interfaces for the getMatrixContent, getRowContent, getColumnContent that
// clients must implement
//
export interface IVirtualizedHorizontalContents {
  firstColIdxToRender: number;
  lastColIdxToRender: number;
  renderWidthPx: number;
  renderShiftLeftPx: number;
  worldWidthPx: number;
  worldShiftLeftPx: number;
}
export interface IVirtualizedVerticalContents {
  firstRowIdxToRender: number;
  lastRowIdxToRender: number;
  renderHeightPx: number;
  renderShiftTopPx: number;
  worldHeightPx: number;
  worldShiftTopPx: number;
}
export interface IVirtualizedMatrixContent extends 
  IVirtualizedHorizontalContents, IVirtualizedVerticalContents{}

  
//
// Interfaces passed to VirtualizedMatrix components
//
export interface IVirtualizeParamBasics {
  virtualizationId: string;     //for redux

  //misc params - omitted from 
  virtualizationStrategy: VirtualizationStrategy;

  //params omitted from the redux simplification
  scrollbar: ScrollbarOptions;
  hoverTracker: undefined | "start" | "end" | "both"; //start=left or top, end = right or bottom
  containerBoundsUpdated?: (bounds: IBounds)=>void;
  overflowVisible?: boolean; // allow caller to deal with overflow themselves

  startScrolledIndicatorStyleAttr?: React.CSSProperties;
  endScrolledIndicatorStyleAttr?: React.CSSProperties;
}
export interface IResponderVirtualizeParams extends IVirtualizeParamBasics{
  //is the caller the owner of the axis? and should this virtualization
  //be in charge of updating sizing in the redux store?
  role: VirtualizationRole.Responder;
  cellCount: never;
  cellSizePx: never;
}
export interface IControllerVirtualizeParams extends IVirtualizeParamBasics{
  //is the caller the owner of the axis? and should this virtualization
  //be in charge of updating sizing in the redux store?
  role: VirtualizationRole.Controller;
  cellCount: number;
  cellSizePx: number;
}
export type IVirtualizeParams = IResponderVirtualizeParams | IControllerVirtualizeParams;

//slighly simpler for redux
export type IResponderVirtualizeReduxParams = 
  Omit<IResponderVirtualizeParams, "scrollbar" | "hoverTracker" | "containerBoundsUpdated">;
export type IControllerVirtualizeReduxParams = 
  Omit<IControllerVirtualizeParams, "scrollbar" | "hoverTracker" | "containerBoundsUpdated">;
export type IVirtualizeReduxParams = 
  IResponderVirtualizeReduxParams | IControllerVirtualizeReduxParams

//
// Primary entry points to create a virtualization.
//
export interface IVirtualizedVerticalViewer {
  getContentForRows(params: IVirtualizedVerticalContents): JSX.Element;
  verticalParams: IVirtualizeParams;
}
export interface IVirtualizedHorizontalViewer {
  getContentForColumns(params: IVirtualizedHorizontalContents): JSX.Element;
  horizontalParams: IVirtualizeParams;
}
export interface IVirtualizedMatrixViewer {
  getMatrixContent(params: IVirtualizedMatrixContent): JSX.Element;
  horizontalParams: IVirtualizeParams;
  verticalParams: IVirtualizeParams;
}
