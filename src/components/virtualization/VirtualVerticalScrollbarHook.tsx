/**
 * Base react hook for a virtual vertical scrollbar.
 */
import "./VirtualScrollbars.scss";
import React, { useState, useCallback } from "react";
import { IBounds, ReactResizeSensor } from "../ResizeSensorHook";

interface IVirtualScrollbarProps {
  visible: boolean;
  horizontalScrollbarHeight: number;
  worldHeight: number;
  worldTopOffset: number;
  width?: number;
  minHeight?: number;
  scrollbarMoved(newWorldTop: number): void;
}

export function VirtualVerticalScrollbar(props: IVirtualScrollbarProps) {
  const {
    width = 10,
    minHeight = 20,
    horizontalScrollbarHeight,
    scrollbarMoved,
    worldHeight,
    worldTopOffset,
  } = props;
  const SCROLLBAR_HOLDER_WIDTH = width;// + 4;
  const SCROLLBAR_OFFSET = (SCROLLBAR_HOLDER_WIDTH - width) / 2;

  //props
  const { visible } = props;

  //state
  const [dragging, setDragging] = useState<boolean>(false);
  const [dragStartTop, setDragStartTop] = useState<number>(-1);
  const [dragStartScrollbarTop, setDragStartScrollbarTop] = useState<number>(
    -1
  );
  const [scrollbarAreaProportions, setScrollbarAreaProportions] = useState({
    scrollareaBoundsHeight: 100,
    draggerHolderHeight: 100,
    clientTop: 0,
  });
  
  //useCallback
  const scrollbarHolderSizeChanged = useCallback((bounds: IBounds) => {
    //sizing - could be passed as a prop, but doing this calculation here in case
    //         the parent does something odd with css and messes up the actual
    //         spacing that the scrollbar consumes.
    if (
      !scrollbarAreaProportions ||
      scrollbarAreaProportions.clientTop !== bounds.top ||
      scrollbarAreaProportions.scrollareaBoundsHeight !== bounds.height
    ) {
      setScrollbarAreaProportions({
        //if there is also a horizontal scrollbar, stop scrollbar right above horizontal scrollbar
        draggerHolderHeight: bounds.height - horizontalScrollbarHeight, 
        scrollareaBoundsHeight: bounds.height,
        clientTop: bounds.top,
      });
    }
  }, [scrollbarAreaProportions, horizontalScrollbarHeight]);

  //calculate all sizing into one variable
  const scrollbarSizing = (() => {
    const heightInClient = Math.max(
      minHeight, //min height of scrollbar is 20
      scrollbarAreaProportions.draggerHolderHeight *
        (scrollbarAreaProportions.draggerHolderHeight / worldHeight)
    );
    const numScrollablePixels = scrollbarAreaProportions.draggerHolderHeight - heightInClient; //num client pixels avail to scroll
    const hiddenWorldHeight = worldHeight - (scrollbarAreaProportions.scrollareaBoundsHeight);
    const worldToScrollablePixelsRatio = hiddenWorldHeight / numScrollablePixels; //e.g., 1 world pixel = 10 client pixel

    return {
      heightInClient: heightInClient,
      currentClientTop: worldTopOffset / worldToScrollablePixelsRatio,
      worldToScrollablePixelsRatio: worldToScrollablePixelsRatio,
      numScrollablePixels: numScrollablePixels //the top of the scrollbar can go from zero to here.
    };
  })();
  
  /*
   *
   *
   * HELPER FUNCTIONS
   *
   *
   */

  const getNewOffsetFromWorldTop = (clientScrollbarTop: number) => {
    return clientScrollbarTop * scrollbarSizing.worldToScrollablePixelsRatio;
  };

  /*
   *
   *
   * EVENT FUNCTIONS
   *
   *
   */
  const scrollbarDragMove = (e: React.MouseEvent) => {
    if (dragging && dragStartTop !== -1) {
      e.stopPropagation();
      e.preventDefault();
      const delta = e.pageY - dragStartTop;
      const approxScrollbarTop = delta + dragStartScrollbarTop;
      scrollbarMoved(
        approxScrollbarTop <= 0 ? 0 : 
        approxScrollbarTop >= scrollbarSizing.numScrollablePixels ? 
          getNewOffsetFromWorldTop(scrollbarSizing.numScrollablePixels) : 
          getNewOffsetFromWorldTop(approxScrollbarTop)
      );
    }
  };

  const scrollbarDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
    setDragStartTop(e.pageY);
    setDragStartScrollbarTop(
      (e.currentTarget as HTMLDivElement).getBoundingClientRect().top -
      scrollbarAreaProportions.clientTop
    );
  };

  const scrollbarDragEnd = (e: React.MouseEvent) => {
    if (dragging) {
      e.stopPropagation();
      e.preventDefault();
      setDragging(false);
      setDragStartTop(-1);
      setDragStartScrollbarTop(-1);
    }
  };

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
  const renderFullpageDragDiv = () => {
    return (
      <div
        className="vertical-scrollbar-fullpage-drag"
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
  };

  const renderDragger = () => {
    return (
      <div
        className="vertical-scrollbar"
        style={{
          left: SCROLLBAR_OFFSET,
          top: scrollbarSizing.currentClientTop,
          height: scrollbarSizing.heightInClient,
          width: width,
        }}
        //events for drag start
        onMouseDown={scrollbarDragStart}
        //onTouchStart={this.scrollbarDragStart}
      />
    );
  };

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
        className="vertical-scrollbar-holder"
        style={{
          width: SCROLLBAR_HOLDER_WIDTH,
          display: visible ? "block" : "none",
        }}
        onMouseDown={(e) => {
          const clientRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const y = e.clientY - clientRect.top; //y position within the client element.
          const newPixelsFromWorldTop = getNewOffsetFromWorldTop(
            y - scrollbarSizing.heightInClient / 2 //move to middle of bar
          );
          scrollbarMoved(newPixelsFromWorldTop);
        }}
      >
        <ReactResizeSensor onSizeChanged={scrollbarHolderSizeChanged} />
        {renderDragger()}
      </div>
      {renderFullpageDragDiv()}
    </>
  );
}
