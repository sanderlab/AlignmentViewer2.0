import React, { useEffect, useState } from "react";
import { Viewport } from "pixi-viewport";
import { useSelector, useDispatch } from "react-redux";
import { RootState, setPixelsFromWorldTop } from "../../common/ReduxStore";
import { Alignment } from "../../common/Alignment";

export interface IWebGLViewportProps {
  app: PIXI.Application;
  alignment: Alignment;
  screenWidth: number;
  screenHeight: number;
  worldWidth: number;
  worldHeight: number;
}

export function WebGLViewport(props: IWebGLViewportProps) {
  const {
    app,
    alignment,
    screenWidth,
    screenHeight,
    worldWidth,
    worldHeight,
  } = props;

  useEffect(() => {
    //CRAZY - this is needed to work in safari.  Answer came from here:
    //https://stackoverflow.com/questions/50349103
    //Basic idea: cancel the wheel event if scolling Y over the detailed
    //            alignment - this is handled manually by my code / viewport
    //I'm not sure whether this will mess up any code that embeds AV2 ...
    //It throws errors in the console chrome - hence the sniffing for safari..
    //I don't think it has any effect in firefox.
    //
    //TODO: document / think about more / change
    //
    if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
      window.onwheel = function (e: WheelEvent) {
        if (
          e.deltaY &&
          (app.view === e.srcElement ||
            (e.srcElement as HTMLElement).classList.contains(
              "detailed-sequence-text"
            ))
        ) {
          return false;
        }
        return true;
      };
    }
  }, [app]);

  const dispatch = useDispatch();

  let [viewport] = useState<Viewport>(
    new Viewport({
      noTicker: true,
      screenWidth: screenWidth,
      screenHeight: screenHeight,
      worldWidth: worldWidth,
      worldHeight: worldHeight,
      interaction: app.renderer.plugins.interaction,
    })
      .drag({ clampWheel: true, direction: "y" })
      .clamp({
        direction: "y",
        underflow: "none",
      })
  );

  const pixelsFromWorldTop = useSelector(
    (state: RootState) => state.webglViewport.pixelsFromWorldTop
  );

  //resize on any changes to screen or world width/height
  useEffect(() => {
    viewport.resize(screenWidth, screenHeight, worldWidth, worldHeight);
  }, [viewport, screenWidth, screenHeight, worldWidth, worldHeight]);

  //scroll back to zero when a new alignment or new viewport is added
  //or move to theworld top pixel
  useEffect(() => {
    viewport.top = pixelsFromWorldTop;
  }, [alignment, pixelsFromWorldTop, viewport]);

  //not sure the cost of adding and removing functions, but
  //this might be a place for performance improvement. It is
  //tricky because pixelsFromWorldTop can't be queried during
  //the event otherwise I'd only add the listener in the
  //viewport creation phase above (pixelsFromWorldTop is
  //stale if put there or in useEffect)
  viewport.off("moved");
  viewport.on("moved", (data) => {
    //@ts-ignore
    const newWorldTop = Math.abs(data.viewport.top);
    if (newWorldTop !== pixelsFromWorldTop) {
      dispatch(setPixelsFromWorldTop(newWorldTop));
    }
  });
  return <></>;
}
