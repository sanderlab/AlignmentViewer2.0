/**
 * Base react hook for a virtual vertical scrollbar.
 */
import "./VirtualScrollbars.scss";
import React, { useState, useCallback, useMemo, useRef } from "react";
import useSize from "@react-hook/size";

interface IVirtualScrollbarProps {
  visible: boolean;

  direction: "horizontal" | "vertical";

  worldSize: number;
  worldOffset: number;
  draggerFixedDimSize?: number;
  draggerVarDimMinSize?: number;

  oppositeScrollbarFixedDimSize: number; //gap in corner if there are scrollbars on both dimensions

  scrollbarMoved(newWorldOffset: number): void;
}

export function VirtualScrollbar(props: IVirtualScrollbarProps) {
  const {
    visible,
    direction,
    
    draggerFixedDimSize = 10,
    draggerVarDimMinSize = 20,

    oppositeScrollbarFixedDimSize, //if this is a vertical scrollbar then horizontal scrollbar height
    scrollbarMoved,
    worldSize,
    worldOffset,
  } = props;

  const scrollbarHolderRef = useRef<HTMLDivElement>(null);
  const [holderWidth, holderHeight] = useSize(scrollbarHolderRef);
  const holderSize = direction === "horizontal"
    ? holderWidth : holderHeight;

  //state
  const [dragging, setDragging] = useState<boolean>(false);
  const [dragPageOffsetPx, setDragPageOffsetPx] = useState<number>(-1);
  const [dragStartScrollbarOffsetPx, setDragStartScrollbarOffsetPx] = useState<number>(
    -1
  );
  
  //cache
  const holderStartOffset = direction === "horizontal"
    ? scrollbarHolderRef.current?.getBoundingClientRect().left
    : scrollbarHolderRef.current?.getBoundingClientRect().top;

  const scrollbarHolderProportions = useMemo(()=>{
    return holderStartOffset === undefined ? {
      draggerHolderSize: 0, draggerHolderStart: 0
    } : {
      draggerHolderSize: holderSize - oppositeScrollbarFixedDimSize,
      draggerHolderStart: holderStartOffset
    }
  }, [
    holderStartOffset,
    holderSize, 
    oppositeScrollbarFixedDimSize
  ]);

  //calculate all sizing into one variable
  const scrollbarSizing = useMemo(() => {
    const draggerSizePx = Math.max(
      draggerVarDimMinSize, //min width of scrollbar is 20
      scrollbarHolderProportions.draggerHolderSize *
        (scrollbarHolderProportions.draggerHolderSize / worldSize)
    );
    const numScrollablePx = scrollbarHolderProportions.draggerHolderSize - draggerSizePx; //num client pixels avail to scroll
    const hiddenWorldSize = worldSize - (scrollbarHolderProportions.draggerHolderSize + 
                                          oppositeScrollbarFixedDimSize);
    const worldToScrollablePixelsRatio = hiddenWorldSize / numScrollablePx; //e.g., 1 world pixel = 10 client pixel

    return {
      draggerSizePx: draggerSizePx,
      draggerOffsetPx: worldOffset / worldToScrollablePixelsRatio,
      worldToScrollablePixelsRatio: worldToScrollablePixelsRatio,
      numScrollablePx: numScrollablePx //the left of the scrollbar can go from zero to here.
    };
  }, [
    draggerVarDimMinSize,
    scrollbarHolderProportions.draggerHolderSize,
    oppositeScrollbarFixedDimSize,
    worldOffset,
    worldSize
  ]);

  /*
   *
   *
   * HELPER FUNCTIONS
   *
   *
   */

  /**
   * Calculate where a
   * @param suggestedScrollbarClientTop
   */
  const getWorldOffset = useCallback((draggerOffsetPx: number) => {
    return draggerOffsetPx * scrollbarSizing.worldToScrollablePixelsRatio;
  }, [
    scrollbarSizing.worldToScrollablePixelsRatio
  ]);

  /*
   *
   *
   * EVENT FUNCTIONS
   *
   *
   */
  const scrollbarDragMove = useCallback((e: React.MouseEvent) => {
    if (dragging && dragPageOffsetPx !== -1) {
      e.stopPropagation();
      e.preventDefault();
      const delta = (direction === "horizontal" ? e.pageX : e.pageY) - dragPageOffsetPx;
      const approxScrollbarOffsetPx = delta + dragStartScrollbarOffsetPx;
      scrollbarMoved(
        approxScrollbarOffsetPx <= 0 ? 0 : 
        approxScrollbarOffsetPx >= scrollbarSizing.numScrollablePx ? 
          getWorldOffset(scrollbarSizing.numScrollablePx) : 
          getWorldOffset(approxScrollbarOffsetPx)
      );
    }
  }, [
    direction,
    dragging,
    dragPageOffsetPx,
    dragStartScrollbarOffsetPx,
    getWorldOffset,
    scrollbarMoved,
    scrollbarSizing.numScrollablePx
  ]);

  const scrollbarDragStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
    setDragPageOffsetPx(direction === "horizontal" ? e.pageX : e.pageY);
    setDragStartScrollbarOffsetPx(
      e.currentTarget.getBoundingClientRect()[
        direction === "horizontal" ? "left" : "top"
      ] - scrollbarHolderProportions.draggerHolderStart
    );
  }, [
    direction,
    scrollbarHolderProportions.draggerHolderStart
  ]);

  const scrollbarDragEnd = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      e.stopPropagation();
      e.preventDefault();
      setDragging(false);
      setDragPageOffsetPx(-1);
      setDragStartScrollbarOffsetPx(-1);
    }
  }, [dragging]);

  /*
   *
   *
   * RENDER FUNCTIONS
   *
   *
   */
  //when dragging scrollbar, a div fills the entire screen so
  //that user doesn't have to be super precise in holding on
  //scrollbar (this is how it works in the browser natively)
  const renderedFullpageDragDiv = useMemo(() => {
    return (
      <div
        className={`${direction}-scrollbar-fullpage-drag`}
        style={{
          display: dragging ? "block" : "none",
        }}
        onMouseDown={scrollbarDragEnd}
        onMouseUp={scrollbarDragEnd}
        onMouseOut={scrollbarDragEnd}
        onMouseMove={scrollbarDragMove}
        //onTouchMove={this.scrollbarDragMove}
        //onTouchEnd={this.scrollbarDragEnd}
      />
    );
  }, [
    direction,
    dragging, 
    scrollbarDragEnd, 
    scrollbarDragMove
  ]);

  const renderedDragger = useMemo(() => {
    return (
      <div
        className={`${direction}-scrollbar`}
        style={
          direction==="horizontal"
            ? {
              left: scrollbarSizing.draggerOffsetPx,
              width: scrollbarSizing.draggerSizePx,
              height: draggerFixedDimSize,
            }
            : {
              top: scrollbarSizing.draggerOffsetPx,
              height: scrollbarSizing.draggerSizePx,
              width: draggerFixedDimSize,
            }
        }
        //events for drag start
        onMouseDown={scrollbarDragStart}
        //onTouchStart={this.scrollbarDragStart}
      />
    );
  }, [
    direction,
    draggerFixedDimSize,
    scrollbarSizing.draggerOffsetPx,
    scrollbarSizing.draggerSizePx,
    scrollbarDragStart,
  ]);

  const holderClicked = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  )=>{
    const clientRect = e.currentTarget.getBoundingClientRect();
    const clickPosPx = direction === "horizontal"
      ? e.clientX - clientRect.left
      : e.clientY - clientRect.top;

    const newWorldOffset = getWorldOffset(
      clickPosPx - scrollbarSizing.draggerSizePx / 2 //move to middle of bar
    );
    scrollbarMoved(newWorldOffset);
  }, [
    direction,
    getWorldOffset,
    scrollbarMoved,
    scrollbarSizing.draggerSizePx
  ]);

  /*
   *
   *
   * RENDER
   *
   *
   */
  return (
    <>
      <div
        ref={scrollbarHolderRef}
        className={`${direction}-scrollbar-holder`}
        style={{
          ...(
            direction === "horizontal" 
              ? {height: draggerFixedDimSize}
              : {width: draggerFixedDimSize}
          ),
        }}
        onMouseDown={holderClicked}
      >
        { //If it isn't visible then the offsets are not valid so just destroy node. Need to do
          //at this level as parent ref should reamin defined for size calculations.
          !visible ? undefined : renderedDragger
        }
      </div>
      {renderedFullpageDragDiv}
    </>
  );
}