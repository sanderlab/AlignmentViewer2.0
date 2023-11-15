import * as PIXI from "pixi.js";
import { PixiRef, Sprite } from "@pixi/react";
import { useRef, useState } from "react";
import React from "react";

interface IMinimapPositionHighlighterProps {
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: number;

  maxHeight: number;
  maxWidth: number;

  highlighterMoved(
    newStartRowIdx: number
  ): void;
}

export function MinimapPositionHighlighter(props: IMinimapPositionHighlighterProps){
  const {
    x, y, width, height, maxWidth, maxHeight, fillColor, highlighterMoved
  } = props;
  const spriteRef = useRef<PixiRef<typeof Sprite>>(null);

  const [dragging, setDragging] = useState<boolean>(false);
  const [dragMouseStartY, setDragMouseStartY] = useState<number>(-1);
  const [dragViewportStartY, setDragViewportStartY] = useState<number>(-1);

  //const app = useApp()
  //console.log(app.stage.getLocalBounds());
  /*
   *
   *
   * EVENT FUNCTIONS
   *
   *
   */
  const dragMove = (e: PIXI.FederatedPointerEvent) => {
    if (dragging && dragMouseStartY !== -1 && spriteRef.current) {
      e.stopPropagation();
      e.preventDefault();

      const currentY = e.getLocalPosition(spriteRef.current.parent).y;
      const mouseDeltaY = currentY - dragMouseStartY;
      highlighterMoved(mouseDeltaY+dragViewportStartY);
    }
  }

  const dragStart = (e: PIXI.FederatedPointerEvent) => {
    if (spriteRef.current){
      e.stopPropagation();
      e.preventDefault();
      setDragging(true);
      setDragViewportStartY(y);
      setDragMouseStartY(
        e.getLocalPosition(spriteRef.current.parent).y
      );
    }
  };

  const dragEnd = (e: PIXI.FederatedPointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(false);
    setDragMouseStartY(-1);
  };

  return (
    <>
      <Sprite 
        ref={spriteRef}
        texture={PIXI.Texture.WHITE}
        eventMode={"static"}
        x={x}
        y={y}
        width={width}
        height={height}
        alpha={dragging ? 0.75 : 0.25}
        tint={fillColor}
        onmousedown={dragStart}
        ontouchstart={dragStart}
        onpointerdown={(e)=>{e.stopPropagation();}} //keep entire viewport from moving
      />
      {!dragging ? undefined : 
        //secondary sprite object takes over the entire canvas during dragging. this
        //enables the mouse to move out of the dragger as long is it is pressed. dragging
        //stops when the mouse button is lived up.
        <Sprite 
          texture={PIXI.Texture.WHITE}
          eventMode={"static"}
          x={0}
          y={0}
          width={maxWidth}
          height={maxHeight}
          alpha={0}

          onmousemove={dragMove}
          ontouchmove={dragMove}

          onmouseup={dragEnd}
          onmouseupoutside={dragEnd}
          onmouseleave={dragEnd}
          onmouseout={dragEnd}
          onpointerout={dragEnd}
          onpointerleave={dragEnd}
          onpointerupoutside={dragEnd}
          //onpointerupoutside={(e)=>{console.log('onpointerupoutside')}}
          ontouchend={dragEnd}
          touchendoutside={dragEnd}
        />
      }
    </>
  );
};
