import * as PIXI from "pixi.js";
import { PixiComponent } from "@pixi/react";
import { Graphics } from "pixi.js";

interface IMinimapPositionHighlighterProps {
  minimapHolder: React.RefObject<HTMLDivElement>; 
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: number;
  fillAlpha: number;
  onDragStart(
    event: PIXI.FederatedPointerEvent,
    parent: PIXI.DisplayObject
  ): void;
  onDragEnd(
    event: PIXI.FederatedPointerEvent,
    parent: PIXI.DisplayObject
  ): void;
  onDragMove(
    event: PIXI.FederatedPointerEvent,
    parent: PIXI.DisplayObject
  ): void;
}

export const MinimapPositionHighlighter = PixiComponent(
  "MinimapPositionHighlighter",
  {
    create: (props: IMinimapPositionHighlighterProps) => {
      const toReturn = new Graphics();
      toReturn.eventMode = "static";
      return toReturn;
    },
    applyProps: (instance, oldProps, newProps) => {
      const { x, y, width, height, fillColor, fillAlpha } = newProps;
      instance.clear();
      instance.beginFill(fillColor, fillAlpha);
      instance.drawRect(x, y, width, height);
      instance.endFill();
      //console.log('oldProps:', oldProps.dragFunctions ? oldProps.dragFunctions.onDragStart : undefined)
      //console.log('newProps:', newProps.dragFunctions ? newProps.dragFunctions.onDragStart : undefined)
      //console.log('eq:' + ( (oldProps.dragFunctions && newProps.dragFunctions) ? oldProps.dragFunctions.onDragStart === newProps.dragFunctions.onDragStart : '?'))
      //console.log('<>');

      //inspired by
      //http://scottmcdonnell.github.io/pixi-examples/index.html?s=demos&f=dragging.js
      if (oldProps.onDragStart !== newProps.onDragStart ||
          oldProps.onDragEnd !== newProps.onDragEnd ||
          oldProps.onDragMove !== newProps.onDragMove) {
        
        //console.log('SETTING UP NEW DRAG LISTENERS onDragStart: ' + (oldProps.onDragStart != newProps.onDragStart));
        //console.log('SETTING UP NEW DRAG LISTENERS onDragEnd: ' + (oldProps.onDragEnd != newProps.onDragEnd));
        //console.log('SETTING UP NEW DRAG LISTENERS onDragMove: ' + (oldProps.onDragMove != newProps.onDragMove));

        instance.removeAllListeners();

        instance.addListener("pointerdown", (e) => {
          e.stopPropagation(); //keep entire viewport from moving
        });

        const dragStart = (e: PIXI.FederatedPointerEvent) => {
          newProps.onDragStart(e, instance.parent);
        };
        const dragEnd = (e: PIXI.FederatedPointerEvent) => {
          newProps.onDragEnd(e, instance.parent);
        };
        const dragMove = (e: PIXI.FederatedPointerEvent) => {
          newProps.onDragMove(e, instance.parent);
        };

        //events for drag start
        instance.addListener("mousedown", dragStart);
        instance.addListener("touchstart", dragStart);

        // events for drag end
        instance.addListener("mouseup", dragEnd);
        instance.addListener("mouseupoutside", dragEnd);
        instance.addListener("touchend", dragEnd);
        instance.addListener("touchendoutside", dragEnd);

        // events for drag move
        instance.addListener("mousemove", dragMove);
        instance.addListener("touchmove", dragMove)

          //console.log(
          //  'instance:', instance
          //);
          //console.log(
          //  'newProps.minimapHolder.current:', 
          //  newProps.minimapHolder.current);
      }
    },
    willUnmount: (instance) => {
      instance.removeAllListeners();
    }
  }
);
