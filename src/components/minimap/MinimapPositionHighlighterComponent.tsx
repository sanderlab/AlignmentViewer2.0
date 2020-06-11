import * as PIXI from "pixi.js";
import { PixiComponent } from "@inlet/react-pixi";
import { Graphics } from "pixi.js";

interface IMinimapPositionHighlighterProps {
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: number;
  fillAlpha: number;
  dragFunctions?: {
    onDragStart(
      event: PIXI.interaction.InteractionEvent,
      parent: PIXI.DisplayObject
    ): void;
    onDragEnd(
      event: PIXI.interaction.InteractionEvent,
      parent: PIXI.DisplayObject
    ): void;
    onDragMove(
      event: PIXI.interaction.InteractionEvent,
      parent: PIXI.DisplayObject
    ): void;
  };
}

export const MinimapPositionHighlighter = PixiComponent(
  "MinimapPositionHighlighter",
  {
    create: (props: IMinimapPositionHighlighterProps) => {
      const toReturn = new Graphics();
      toReturn.interactive = true;
      return toReturn;
    },
    applyProps: (instance, oldProps, newProps) => {
      const { x, y, width, height, fillColor, fillAlpha } = newProps;
      instance.clear();
      instance.beginFill(fillColor, fillAlpha);
      instance.drawRect(x, y, width, height);
      instance.endFill();

      //inspired by
      //http://scottmcdonnell.github.io/pixi-examples/index.html?s=demos&f=dragging.js
      if (oldProps.dragFunctions !== newProps.dragFunctions) {
        instance.removeAllListeners();
        if (newProps.dragFunctions) {
          instance.addListener("pointerdown", (e) => {
            e.stopPropagation(); //keep entire viewport from moving
          });

          const dragStart = (e: PIXI.interaction.InteractionEvent) => {
            newProps.dragFunctions?.onDragStart(e, instance.parent);
          };
          const dragEnd = (e: PIXI.interaction.InteractionEvent) => {
            newProps.dragFunctions?.onDragEnd(e, instance.parent);
          };
          const dragMove = (e: PIXI.interaction.InteractionEvent) => {
            newProps.dragFunctions?.onDragMove(e, instance.parent);
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
          instance.addListener("touchmove", dragMove);
        }
      }
    },
  }
);
