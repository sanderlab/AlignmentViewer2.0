/**
 * Base react hook for a webgl detailed alignment scrollbar.
 */
import React, { useEffect, useRef, useState } from "react";
import "./AlignmentDetails.scss";
import { ResizeSensor } from "css-element-queries";
import { useDispatch, useSelector } from "react-redux";
import { RootState, setWorldTopOffset } from "../common/ReduxStore";

interface IWebGLScrollbarProps {
  visible: boolean;
}

export function AlignmentDetailsScrollbar(props: IWebGLScrollbarProps) {
  const SCROLLBAR_HOLDER_WIDTH = 16;
  const SCROLLBAR_MIN_HEIGHT = 20;
  const SCROLLBAR_WIDTH = 10;
  const SCROLLBAR_OFFSET = (SCROLLBAR_HOLDER_WIDTH - SCROLLBAR_WIDTH) / 2;

  //ref to div
  const scrollbarHolderRef = useRef<HTMLDivElement>(null);

  //props
  const { visible } = props;

  //state
  const [dragging, setDragging] = useState<boolean>(false);
  const [dragStartTop, setDragStartTop] = useState<number>(-1);
  const [dragStartScrollbarTop, setDragStartScrollbarTop] = useState<number>(
    -1
  );
  const [scrollbarHolderProportions, setScrollbarHolderProportions] = useState({
    height: 100,
    top: 0,
  });

  //redux
  const dispatch = useDispatch();
  const dimensions = useSelector(
    (state: RootState) => state.alignmentDetailsSlice
  );

  //sizing - could be passed as a prop, but doing this calculation here in case
  //         the parent does something odd with css and messes up the actual
  //         spacing that the scrollbar consumes.
  useEffect(() => {
    if (scrollbarHolderRef.current) {
      const rs = new ResizeSensor(scrollbarHolderRef.current, () => {
        if (scrollbarHolderRef.current) {
          const rect = scrollbarHolderRef.current!.getBoundingClientRect();
          if (
            scrollbarHolderProportions.top !== rect.top ||
            scrollbarHolderProportions.height !== rect.height
          ) {
            setScrollbarHolderProportions({
              height: rect.height,
              top: rect.top,
            });
          }
        }
      });
      return () => {
        rs.detach();
      };
    } else {
      console.error(
        "Unable to add resize sensor as scrollbarHolderRef.current was not defined",
        scrollbarHolderRef
      );
    }
  }, [scrollbarHolderProportions]);

  //calculate all sizing into one variable
  const scrollbarSizing = (() => {
    const heightInClient = Math.max(
      SCROLLBAR_MIN_HEIGHT, //min height of scrollbar is 20
      scrollbarHolderProportions.height *
        (scrollbarHolderProportions.height / dimensions.worldHeight)
    );
    const clientToWorldRatio =
      (scrollbarHolderProportions.height - heightInClient) /
      (dimensions.worldHeight - scrollbarHolderProportions.height);

    return {
      heightInClient: heightInClient,
      currentClientTop: clientToWorldRatio * dimensions.worldTopOffset,
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
  const getNewOffsetFromWorldTop = (suggestedScrollbarClientTop: number) => {
    let newWorldTop =
      (1 / scrollbarSizing.clientToWorldRatio) * suggestedScrollbarClientTop;
    return newWorldTop;
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
      const newPixelsFromWorldTop = getNewOffsetFromWorldTop(
        delta + dragStartScrollbarTop
      );
      dispatch(setWorldTopOffset(newPixelsFromWorldTop));
    }
  };

  const scrollbarDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
    setDragStartTop(e.pageY);
    setDragStartScrollbarTop(
      (e.currentTarget as HTMLDivElement).getBoundingClientRect().top -
        scrollbarHolderProportions.top
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
          width: SCROLLBAR_WIDTH,
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
            y - scrollbarSizing.heightInClient / 2 //move to middle of bar
          );
          dispatch(setWorldTopOffset(newPixelsFromWorldTop));
        }}
      >
        {renderDragger()}
      </div>
      {renderFullpageDragDiv()}
    </>
  );
}
