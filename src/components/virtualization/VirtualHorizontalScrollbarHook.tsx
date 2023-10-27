/**
 * Base react hook for a virtual vertical scrollbar.
 */
import "./VirtualScrollbars.scss";
import React, { useState, useCallback } from "react";
import { ReactResizeSensor } from "../ResizeSensorHook";

interface IVirtualScrollbarProps {
  visible: boolean;
  worldWidth: number;
  worldLeftOffset: number;
  height?: number;
  minWidth?: number;
  scrollbarMoved(newWorldTop: number): void;
}

export function VirtualHorizontalScrollbar(props: IVirtualScrollbarProps) {
  const {
    height = 10,
    minWidth = 20,
    scrollbarMoved,
    worldWidth,
    worldLeftOffset,
  } = props;
  const SCROLLBAR_HOLDER_HEIGHT = height + 6;
  const SCROLLBAR_OFFSET = (SCROLLBAR_HOLDER_HEIGHT - height) / 2;

  //props
  const { visible } = props;

  //state
  const [dragging, setDragging] = useState<boolean>(false);
  const [dragStartLeft, setDragStartLeft] = useState<number>(-1);
  const [dragStartScrollbarLeft, setDragStartScrollbarLeft] = useState<number>(
    -1
  );
  const [scrollbarHolderProportions, setScrollbarHolderProportions] = useState({
    width: 100,
    left: 0,
  });

  //useCallback
  const scrollbarHolderSizeChanged = useCallback((bounds) => {
    //sizing - could be passed as a prop, but doing this calculation here in case
    //         the parent does something odd with css and messes up the actual
    //         spacing that the scrollbar consumes.
    if (
      !scrollbarHolderProportions ||
      scrollbarHolderProportions.left !== bounds.left ||
      scrollbarHolderProportions.width !== bounds.width
    ) {
      setScrollbarHolderProportions({
        width: bounds.width,
        left: bounds.left,
      });
    }
  }, []);

  //calculate all sizing into one variable
  const scrollbarSizing = (() => {
    const widthInClient = Math.max(
      minWidth, //min width of scrollbar is 20
      scrollbarHolderProportions.width *
        (scrollbarHolderProportions.width / worldWidth)
    );
    const clientToWorldRatio =
      (scrollbarHolderProportions.width - widthInClient) /
      (worldWidth - scrollbarHolderProportions.width);

    return {
      widthInClient: widthInClient,
      currentClientLeft: clientToWorldRatio * worldLeftOffset,
      clientToWorldRatio: clientToWorldRatio,
    };
  })();

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
  const getNewOffsetFromWorldLeft = (suggestedScrollbarClientLeft: number) => {
    let newWorldLeft =
      (1 / scrollbarSizing.clientToWorldRatio) * suggestedScrollbarClientLeft;
    return newWorldLeft;
  };

  /*
   *
   *
   * EVENT FUNCTIONS
   *
   *
   */
  const scrollbarDragMove = (e: React.MouseEvent) => {
    if (dragging && dragStartLeft !== -1) {
      e.stopPropagation();
      e.preventDefault();
      const delta = e.pageX - dragStartLeft;
      const newPixelsFromWorldLeft = getNewOffsetFromWorldLeft(
        delta + dragStartScrollbarLeft
      );
      scrollbarMoved(newPixelsFromWorldLeft);
    }
  };

  const scrollbarDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
    setDragStartLeft(e.pageX);
    setDragStartScrollbarLeft(
      (e.currentTarget as HTMLDivElement).getBoundingClientRect().left -
        scrollbarHolderProportions.left
    );
  };

  const scrollbarDragEnd = (e: React.MouseEvent) => {
    if (dragging) {
      e.stopPropagation();
      e.preventDefault();
      setDragging(false);
      setDragStartLeft(-1);
      setDragStartScrollbarLeft(-1);
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
        className="horizontal-scrollbar-fullpage-drag"
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
        className="horizontal-scrollbar"
        style={{
          top: SCROLLBAR_OFFSET,
          left: scrollbarSizing.currentClientLeft,
          width: scrollbarSizing.widthInClient,
          height: height,
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
        className="horizontal-scrollbar-holder"
        style={{
          height: SCROLLBAR_HOLDER_HEIGHT,
          display: visible ? "block" : "none",
        }}
        onMouseDown={(e) => {
          const clientRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const x = e.clientX - clientRect.left; //x position within the client element.
          const newPixelsFromWorldLeft = getNewOffsetFromWorldLeft(
            x - scrollbarSizing.widthInClient / 2 //move to middle of bar
          );
          scrollbarMoved(newPixelsFromWorldLeft);
        }}
      >
        <ReactResizeSensor onSizeChanged={scrollbarHolderSizeChanged} />
        {renderDragger()}
      </div>
      {renderFullpageDragDiv()}
    </>
  );
}
