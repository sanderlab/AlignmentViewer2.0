import * as PIXI from "pixi.js";
import { PixiComponent } from "@inlet/react-pixi";
import { Viewport } from "pixi-viewport";

export interface ICanvasAlignmentViewportProps {
  useDrag?: boolean; // Allows the user to drag the viewport around.
  usePinch?: boolean; // Allows the user to pinch to zoom; e.g. on a trackpad.
  useWheel?: boolean; // Allows the user to use a mouse wheel to zoom.
  numColumns: number;
  numRows: number;
  app: PIXI.Application;
  mouseClick?: (x: number, y: number) => void;
  zoomPercent?: number;
}

export const CanvasAlignmentViewport = PixiComponent<
  ICanvasAlignmentViewportProps,
  any
>("CanvasAlignmentViewport", {
  create(props: ICanvasAlignmentViewportProps) {
    const {
      app,
      mouseClick,
      numColumns,
      numRows,
      useDrag,
      usePinch,
      useWheel,
      zoomPercent,
    } = props;
    app.renderer.backgroundColor = 0xffffff;

    let vp = new Viewport({
      screenWidth: app.renderer.width,
      screenHeight: app.renderer.height,
      worldWidth: numColumns,
      worldHeight: numRows,
      interaction: app.renderer.plugins.interaction,
    })
      .decelerate()
      .clamp({
        direction: "all",
      })
      .bounce({ friction: 0.1, time: 150, underflow: "center" });

    // !IMPORTANT
    // Two-finger drag on trackpad is also enabled by this.
    // Issue currently open: https://github.com/davidfig/pixi-viewport/issues/143
    if (useDrag) {
      vp = vp.drag({
        direction: "all", //this is the line that kills pinch
      });
    }

    if (usePinch) {
      vp = vp.pinch();
    }

    if (useWheel) {
      vp = vp.wheel();
    }

    if (zoomPercent) {
      vp = vp.zoomPercent(zoomPercent);
    }
    vp.on("clicked", (e) => {
      if (mouseClick) {
        mouseClick(e.world.x, e.world.y);
      }
    });
    return vp;
  },

  applyProps(
    vp: Viewport, //PIXI.Graphics,
    oldProps: ICanvasAlignmentViewportProps,
    newProps: ICanvasAlignmentViewportProps
  ) {
    if (
      oldProps.numColumns !== newProps.numColumns ||
      oldProps.numRows !== newProps.numRows
    ) {
      const { app, numRows, numColumns } = newProps;
      vp.resize(app.renderer.width, app.renderer.height, numColumns, numRows);

      if (numRows > numColumns) {
        vp = vp.clampZoom({
          maxHeight: numRows + 0.1 * numRows,
          //maxWidth: numColumns//app.renderer.width,
        });
      } else {
        vp = vp.clampZoom({
          maxWidth: numColumns + 0.1 * numColumns, //app.renderer.width,
        });
      }

      vp = vp.fitWorld(true);
      vp = vp.setZoom(app.renderer.width / numColumns, false);
    }
    return vp;
  },
});
