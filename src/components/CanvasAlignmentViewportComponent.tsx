import * as PIXI from "pixi.js";
import { PixiComponent } from "@inlet/react-pixi";
import { Viewport, ClickEventData } from "pixi-viewport";

export interface ICanvasAlignmentViewportProps {
  numColumns: number;
  numRows: number;
  app: PIXI.Application;
  mouseClick?: (mousePosition: IPosition) => void;
  stageResolution: {
    width: number;
    height: number;
  };
}

interface IViewportInstance {
  vp: Viewport;
  lastMouseClick?: (data: ClickEventData) => void | undefined;
}

const OVERFLOW_ZOOM_ALLOWED = 0.05; //allow 5% zoom out (both sides = 10% total) past max width / height

export const CanvasAlignmentViewport = PixiComponent<
  ICanvasAlignmentViewportProps,
  any
>("CanvasAlignmentViewport", {
  create(props: ICanvasAlignmentViewportProps) {
    const { app, numColumns, numRows, stageResolution } = props;
    app.renderer.backgroundColor = 0xffffff;

    const useDrag = true; // Allows the user to drag the viewport around.
    const usePinch = true; // Allows the user to pinch to zoom; e.g. on a trackpad.
    const useWheel = true; // Allows the user to use a mouse wheel to zoom.

    let vp = new Viewport({
      screenWidth: stageResolution.width,
      screenHeight: stageResolution.height,
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

    //if (zoomPercent) {
    //  vp = vp.zoomPercent(zoomPercent);
    //}
    return vp;
  },

  //apply props is triggered on new props
  applyProps(
    vp: Viewport,
    oldProps: ICanvasAlignmentViewportProps,
    newProps: ICanvasAlignmentViewportProps
  ) {
    const { mouseClick, numRows, numColumns, stageResolution } = newProps;

    if (oldProps.mouseClick !== mouseClick) {
      vp.off("clicked"); //I tested and adding this line keeps us from getting multiple click listners
      if (mouseClick) {
        vp.on("clicked", (e) => {
          mouseClick({ x: e.world.x, y: e.world.y });
        });
      }
    }

    //deal with resizing events and new alignments
    const resizedStage =
      !oldProps.stageResolution ||
      oldProps.stageResolution.height !== stageResolution.height ||
      oldProps.stageResolution.width !== stageResolution.width;
    const newAlignment =
      !oldProps.numColumns ||
      !oldProps.numRows ||
      oldProps.numColumns !== numColumns ||
      oldProps.numRows !== numRows;

    if (resizedStage || newAlignment) {
      vp.resize(
        stageResolution.width,
        stageResolution.height,
        numColumns,
        numRows
      );

      //*** TODO: as we increase in size, scale proportionally

      //compress if the resize is making pushing the alignment off the
      //screen -- this only happens when the resize is making everything
      //smaller
      if (!newAlignment && oldProps.stageResolution) {
        //for new alignments zoom is done regardless (see below)
        if (
          oldProps.stageResolution.width > stageResolution.width &&
          vp.scale.x * numColumns > stageResolution.width
        ) {
          //it is shrinking horizontally and pushing the current alignment
          //off the screen
          vp = vp.setZoom(stageResolution.width / numColumns, false);
        }

        if (
          oldProps.stageResolution.height > stageResolution.height &&
          vp.scale.y * numRows > stageResolution.height
        ) {
          //it is shrinking vertically and pushing the current alignment
          //off the screen
          vp = vp.setZoom(stageResolution.width / numColumns, false);
        }
      }
    }

    //new alignments set zoom clamping and also force the alignment into
    //as much of a view as possible.
    if (newAlignment) {
      if (numRows > numColumns) {
        vp = vp.clampZoom({
          maxHeight: numRows + OVERFLOW_ZOOM_ALLOWED * numRows,
        });
      } else {
        vp = vp.clampZoom({
          maxWidth: numColumns + OVERFLOW_ZOOM_ALLOWED * numColumns,
        });
      }

      vp = vp.fitWorld(true);
      vp = vp.setZoom(stageResolution.width / numColumns, false);
    }
    return vp;
  },
});
