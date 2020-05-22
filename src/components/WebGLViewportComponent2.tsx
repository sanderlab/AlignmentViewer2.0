import React, { useEffect, useState } from "react";
import { useApp } from "@inlet/react-pixi";
import { Viewport } from "pixi-viewport";
import { useSelector } from "react-redux";
import { RootState } from "../common/ReduxStore";
import { Alignment } from "../common/Alignment";

export interface IWebGLViewportProps {
  alignment: Alignment;
  screenWidth: number;
  screenHeight: number;
  worldWidth: number;
  worldHeight: number;
}

export function WebGLViewport2(props: IWebGLViewportProps) {
  const { screenWidth, screenHeight, worldWidth, worldHeight } = props;
  const app = useApp();

  const [viewport, setViewport] = useState<Viewport>(
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
      .on("moved", (data) => {
        console.log("MOVED");
      })
  );

  //resize on any changes to screen or world width/height
  useEffect(() => {
    viewport.resize(screenWidth, screenHeight, worldWidth, worldHeight);
  }, [
    props.screenWidth,
    props.screenHeight,
    props.worldWidth,
    props.worldHeight,
  ]);

  //scroll back to zero when a new alignment is added
  useEffect(() => {
    console.log("SNAP");
    viewport.snap(0, 0);
  }, [props.alignment]);

  const pixelsFromWorldTop = useSelector(
    (state: RootState) => state.webglViewport.pixelsFromWorldTop
  );

  return <></>;
}
