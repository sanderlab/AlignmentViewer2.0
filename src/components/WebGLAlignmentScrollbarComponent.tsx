/**
 * Base react hook for a webgl detailed alignment scrollbar.
 */
import React, { useEffect, useRef, useState } from "react";
import "./WebGLAlignmentScrollbarComponent.scss";
import { store, setPixelsFromWorldTop, RootState } from "../common/ReduxStore";
import { useSelector } from "react-redux";

interface IWebGLScrollbarProps {
  visible: boolean;
  worldHeight: number;
}

export function WebGLScrollbar(props: IWebGLScrollbarProps) {
  const { visible, worldHeight } = props;
  const [scrollbarHolderProportions, setScrollbarHolderProportions] = useState({
    height: -1,
    top: -1,
  });
  const [dragging, setDragging] = useState(false);
  const [dragStartTop, setDragStartTop] = useState(-1);
  const [dragStartScrollbarTop, setDragStartScrollbarTop] = useState(-1);

  const scrollbarHolderRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollbarHolderRef.current) {
      const rect = scrollbarHolderRef.current.getBoundingClientRect();
      setScrollbarHolderProportions({
        height: rect.height,
        top: rect.top,
      });
    }
  }, []); //pass array as 2nd param to only run on mount

  const SCROLLBAR_HOLDER_WIDTH = 16;
  const SCROLLBAR_MIN_HEIGHT = 20;
  const SCROLLBAR_WIDTH = 10;
  const SCROLLBAR_OFFSET = (SCROLLBAR_HOLDER_WIDTH - SCROLLBAR_WIDTH) / 2;

  const pixelsFromWorldTop = useSelector(
    (state: RootState) => state.webglViewport.pixelsFromWorldTop
  );

  /*
   *
   *
   * HELPER FUNCTIONS
   *
   *
   */
  const getScrollbarProportions = () => {
    return {
      scrollbarHeight: Math.max(
        SCROLLBAR_MIN_HEIGHT, //min height of scrollbar is 20
        scrollbarHolderProportions.height *
          (scrollbarHolderProportions.height / worldHeight)
      ),
      scrollbarClientTop:
        (pixelsFromWorldTop / worldHeight) * scrollbarHolderProportions.height,
    };
  };

  /**
   * Calculate where a
   * @param suggestedClientTop
   */
  const getNewOffsetFromWorldTop = (suggestedClientTop: number) => {
    let newPixelsFromWorldTop =
      worldHeight * (suggestedClientTop / scrollbarHolderProportions.height);
    if (
      newPixelsFromWorldTop + scrollbarHolderProportions.height >
      worldHeight
    ) {
      //trying to drag past the bottom of the world, fix to bottom of world
      newPixelsFromWorldTop = worldHeight - scrollbarHolderProportions.height;
    }
    //if it is below zero, set to zero
    newPixelsFromWorldTop =
      newPixelsFromWorldTop < 0 ? 0 : newPixelsFromWorldTop;

    return newPixelsFromWorldTop;
  };

  /*
   *
   *
   * EVENT FUNCTIONS
   *
   *
   */
  const scrollbarDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDragging(true);
    setDragStartTop(e.pageY);
    setDragStartScrollbarTop(
      (e.currentTarget as HTMLDivElement).getBoundingClientRect().top -
        scrollbarHolderProportions.top
    );
  };
  const scrollbarDragMove = (e: React.MouseEvent) => {
    if (dragging && dragStartTop !== -1) {
      e.stopPropagation();
      const delta = e.pageY - dragStartTop;
      const newPixelsFromWorldTop = getNewOffsetFromWorldTop(
        delta + dragStartScrollbarTop
      );
      store.dispatch(setPixelsFromWorldTop(newPixelsFromWorldTop));
    }
  };
  const scrollbarDragEnd = (e: React.MouseEvent) => {
    if (dragging) {
      e.stopPropagation();
      setDragging(false);
      setDragStartTop(-1);
      setDragStartScrollbarTop(-1);
    }
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
        ref={scrollbarHolderRef}
        className="vertical-scrollbar-holder"
        style={{
          width: SCROLLBAR_HOLDER_WIDTH,
          display: visible ? "block" : "none",
        }}
        onMouseDown={(e) => {
          const clientRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const y = e.clientY - clientRect.top; //y position within the client element.
          const newPixelsFromWorldTop = getNewOffsetFromWorldTop(
            y - getScrollbarProportions().scrollbarHeight / 2 //move to middle of bar
          );
          store.dispatch(setPixelsFromWorldTop(newPixelsFromWorldTop));
        }}
      >
        <div
          className="vertical-scrollbar"
          style={{
            left: SCROLLBAR_OFFSET,
            top: getScrollbarProportions().scrollbarClientTop,
            height: getScrollbarProportions().scrollbarHeight,
            width: SCROLLBAR_WIDTH,
          }}
          //events for drag start
          onMouseDown={scrollbarDragStart}
          //onTouchStart={this.scrollbarDragStart}
          // events for drag end
          onMouseUp={scrollbarDragEnd}
          //onTouchEnd={this.scrollbarDragEnd}
          // events for drag move
          onMouseMove={scrollbarDragMove}
          //onTouchMove={this.scrollbarDragMove}
        ></div>
      </div>

      {
        //when dragging scrollbar, a div fills the entire screen so
        //that user doesn't have to be super precise in holding on
        //scrollbar (this is how it works in the browser natively)
      }
      <div
        className="vertical-scrollbar-fullpage-drag "
        style={{
          display: dragging ? "block" : "none",
        }}
        onMouseUp={scrollbarDragEnd}
        onMouseMove={scrollbarDragMove}
      ></div>
    </>
  );
}
