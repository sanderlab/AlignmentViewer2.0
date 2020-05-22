import * as PIXI from "pixi.js";
import { PixiComponent } from "@inlet/react-pixi";
import { Viewport } from "pixi-viewport";
import { useSelector } from "react-redux";
import { RootState } from "../common/ReduxStore";

export interface IWebGLViewportProps {
  screenWidth: number;
  screenHeight: number;
  worldWidth: number;
  worldHeight: number;
  app: PIXI.Application;

  onViewportYChanged: (currentY: number) => void;
}

export const WebGLViewport = PixiComponent<IWebGLViewportProps, any>(
  "WebGLViewport",
  {
    create(props: IWebGLViewportProps) {
      const { app, screenWidth, screenHeight, worldWidth, worldHeight } = props;
      //app.renderer.transparent = true;
      app.renderer.backgroundColor = 0xff0000;

      let vp = new Viewport({
        noTicker: true,
        screenWidth: screenWidth,
        screenHeight: screenHeight,
        worldWidth: worldWidth,
        worldHeight: worldHeight,
        interaction: app.renderer.plugins.interaction,
      });

      vp.drag({ clampWheel: true, direction: "y" }).clamp({
        direction: "y",
        underflow: "none",
      });

      return vp;
    },

    //apply props is triggered on new props
    applyProps(
      vp: Viewport,
      oldProps: IWebGLViewportProps,
      newProps: IWebGLViewportProps
    ) {
      const { screenWidth, screenHeight, worldWidth, worldHeight } = newProps;

      /*
       *
       *
       * setup event listeners
       *
       *
       */

      if (oldProps.onViewportYChanged !== newProps.onViewportYChanged) {
        vp.off("moved");
        vp.on("moved", (data) => {
          //only y drag by wheel is enabled, so move means that the
          //y top moved.
          //@ts-ignore  //data is misannotated in their typescript definition file
          newProps.onViewportYChanged(data.viewport.top);
        });
      }

      //deal with resizing events and new alignments
      const resizedStage =
        oldProps.screenWidth !== screenWidth ||
        oldProps.screenHeight !== screenHeight;
      const newAlignment =
        oldProps.worldWidth !== worldWidth ||
        oldProps.worldHeight !== worldHeight;

      if (resizedStage || newAlignment) {
        vp.resize(screenWidth, screenHeight, worldWidth, worldHeight);

        if (newAlignment) {
          vp = vp.snap(0, 0);
        }

        return vp;
      }
    },
  }
);
