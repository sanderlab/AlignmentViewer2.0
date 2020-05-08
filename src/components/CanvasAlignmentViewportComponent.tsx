import * as PIXI from "pixi.js";
import { PixiComponent } from "@inlet/react-pixi";
import { Viewport, ClickEventData } from "pixi-viewport";

export interface ICanvasAlignmentViewportProps {
  numColumns: number;
  numRows: number;
  app: PIXI.Application;
  onMouseClick?: (mousePosition: IPosition) => void;
  stageResolution: {
    width: number;
    height: number;
  };
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
    const { onMouseClick, numRows, numColumns, stageResolution } = newProps;

    if (oldProps.onMouseClick !== onMouseClick) {
      vp.off("clicked"); //I tested and adding this line keeps us from getting multiple click listners
      if (onMouseClick) {
        vp.on("clicked", (e) => {
          onMouseClick({ x: e.world.x, y: e.world.y });
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

      //set the clamp based on the current stage height/width
      let clampWidth,
        clampHeight = 0;
      if (
        numColumns / stageResolution.width >
        numRows / stageResolution.height
      ) {
        //width is more important
        clampWidth = numColumns + OVERFLOW_ZOOM_ALLOWED * numColumns;
        vp = vp.clampZoom({
          maxHeight: undefined,
          maxWidth: clampWidth,
        });
      } else {
        //height is more important
        clampHeight = numRows + OVERFLOW_ZOOM_ALLOWED * numRows;
        vp = vp.clampZoom({
          maxWidth: undefined,
          maxHeight: clampHeight,
        });
      }

      //zoom to appropriate level
      if (newAlignment) {
        //new alignments set zoom clamping and also force the alignment into
        //as much of a view as possible.
        vp = vp.fitWorld(true);
        vp = vp.setZoom(stageResolution.width / numColumns, false);
      } else if (
        oldProps.stageResolution &&
        oldProps.stageResolution.width !== stageResolution.width
      ) {
        //the viewport is being resized horizontally (likely by user dragging)
        //  1. compress if the resize is making pushing the alignment off the screen
        //  2. scale alignment if the resize is expanding

        if (oldProps.stageResolution.width > stageResolution.width) {
          //viewport is shrinking horizontally
          if (vp.scale.x * numColumns > stageResolution.width) {
            //it is pushing the current alignment off the screen, force
            //the alignment to stay the same size as the viewport
            vp = vp.setZoom(stageResolution.width / numColumns, false);
          }
        } else {
          //viewport is expanding horizontally

          //detect new zoom level. this is pretty crude. is there a better way?
          let newZoomLevel =
            vp.scale.x *
            (stageResolution.width / oldProps.stageResolution.width);

          if (
            (clampWidth &&
              (newZoomLevel * numColumns < clampWidth ||
                numColumns > stageResolution.width)) ||
            (clampHeight &&
              (newZoomLevel * numRows < clampHeight ||
                numRows > stageResolution.height))
          ) {
            vp = vp.setZoom(newZoomLevel, false);
          }
        }
      }
    }
    return vp;
  },
});
