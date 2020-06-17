//DEPRECATED: this hook wasn't capturing mouse and other events. I spent a while
//trying to solve, but couldn't figure it out. Switched to standard react pixi component
//which doesn't have the same issues.

import React, { useEffect, useState } from "react";
import { Viewport, MovedEventData } from "pixi-viewport";
import * as PIXI from "pixi.js";

export interface IAlignmentDetailsViewportProps {
  app: PIXI.Application;
  //the parentElement is used to constrain the wheel events, otherwise when
  //e.g., the minimap on positioned above the viewport, the wheel events
  //propogate through to the viewport
  parentElement: HTMLElement;
  screenWidth: number;
  screenHeight: number;
  worldWidth: number;
  worldHeight: number;
  worldTopOffset: number;
  viewportMoved(newWorldTop: number): void;
}

export function AlignmentDetailsViewport(
  props: IAlignmentDetailsViewportProps
) {
  const {
    app,
    parentElement,
    screenWidth,
    screenHeight,
    worldWidth,
    worldHeight,
    worldTopOffset,
    viewportMoved,
  } = props;

  let [viewport] = useState<Viewport>(
    new Viewport({
      //noTicker: true,
      screenWidth: screenWidth,
      screenHeight: screenHeight,
      worldWidth: worldWidth,
      worldHeight: worldHeight,
      interaction: app.renderer.plugins.interaction,
      divWheel: parentElement,
    })
      .drag({ clampWheel: true, direction: "y" })
      .clamp({
        direction: "y",
        underflow: "none",
      })
  );

  //resize on any changes to screen or world width/height
  useEffect(() => {
    viewport.resize(screenWidth, screenHeight, worldWidth, worldHeight);
    app.render(); //stops flicker on safari.
  }, [viewport, screenWidth, screenHeight, worldWidth, worldHeight]);

  //not sure the cost of adding and removing functions, but
  //this might be a place for performance improvement. It is
  //tricky because worldTopOffset can't be queried during
  //the event otherwise I'd only add the listener in the
  //viewport creation phase above (pixelsFromWorldTop is
  //stale if put there or in useEffect)
  viewport.off("moved");
  viewport.on("moved", (data: MovedEventData) => {
    const newWorldTop = data.viewport.top;
    if (data.type === "wheel" && newWorldTop !== worldTopOffset) {
      viewportMoved(newWorldTop);
      app.render(); //stops flicker on safari.
    }
  });

  if (viewport.top !== worldTopOffset) {
    viewport.top = worldTopOffset;
    app.render(); //stops flicker on safari.
  }

  return <></>;
}
