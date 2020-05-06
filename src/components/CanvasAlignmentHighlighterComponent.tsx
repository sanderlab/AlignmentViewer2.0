import React from "react";
import * as PIXI from "pixi.js";
import { PixiComponent } from "@inlet/react-pixi";
import { Graphics } from "pixi.js";

interface IAlignmentHighlighterProps {
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: number;
  fillAlpha: number;
  dragFunctions?: {
    onDragStart(event: PIXI.interaction.InteractionEvent): void;
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

export const CanvasAlignmentHighlighter = PixiComponent(
  "CanvasAlignmentHighlighter",
  {
    create: (props: IAlignmentHighlighterProps) => {
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

          //events for drag start
          instance.addListener("mousedown", newProps.dragFunctions.onDragStart);
          instance.addListener(
            "touchstart",
            newProps.dragFunctions.onDragStart
          );

          // events for drag end
          instance.addListener("mouseup", (e) => {
            if (newProps.dragFunctions) {
              newProps.dragFunctions.onDragEnd(e, instance.parent);
            }
          });
          instance.addListener("mouseupoutside", (e) => {
            if (newProps.dragFunctions) {
              newProps.dragFunctions.onDragEnd(e, instance.parent);
            }
          });
          instance.addListener("touchend", (e) => {
            if (newProps.dragFunctions) {
              newProps.dragFunctions.onDragEnd(e, instance.parent);
            }
          });
          instance.addListener("touchendoutside", (e) => {
            if (newProps.dragFunctions) {
              newProps.dragFunctions.onDragEnd(e, instance.parent);
            }
          });

          // events for drag move
          instance.addListener("mousemove", (e) => {
            if (newProps.dragFunctions) {
              newProps.dragFunctions.onDragMove(e, instance.parent);
            }
          });
          instance.addListener("touchmove", (e) => {
            if (newProps.dragFunctions) {
              newProps.dragFunctions.onDragMove(e, instance.parent);
            }
          });
        }
      }
    },
  }
);
