import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { PixiComponent } from "@pixi/react";

export interface IMiniMapViewportProps {
  numColumns: number;
  numRows: number;
  app: PIXI.Application;
  onMouseClick?: (mousePosition: IPosition) => void;
  stageWidth: number;
  stageHeight: number;
  //ensureVisible?: {
  //  y: number;
  //  height: number;
  //};
}

const OVERFLOW_ZOOM_ALLOWED = 0.05; //allow 5% zoom out (both sides = 10% total) past max width / height

export const MiniMapViewport = PixiComponent<IMiniMapViewportProps, any>(
  "MiniMapViewport",
  {
    create(props: IMiniMapViewportProps) {
      const { app, numColumns, numRows, stageWidth } = props;
      app.renderer.background.color = 0xffffff;

      const useDrag = true; // Allows the user to drag the viewport around.
      const usePinch = true; // Allows the user to pinch to zoom; e.g. on a trackpad.
      const useWheel = true; // Allows the user to use a mouse wheel to zoom.

      let vp = new Viewport({
        screenWidth: stageWidth,
        worldWidth: numColumns,
        worldHeight: numRows,
        events: app.renderer.events,
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

      vp.on("moved", () => {
        app.render(); //no idea why this is required - didn't use to be!
      });

      return vp;
    },

    //apply props is triggered on new props
    applyProps(
      vp: Viewport,
      oldProps: IMiniMapViewportProps,
      newProps: IMiniMapViewportProps
    ) {
      const {
        onMouseClick,
        numRows,
        numColumns,
        stageWidth,
        stageHeight,
      } = newProps;

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
        oldProps.stageWidth !== stageWidth ||
        oldProps.stageHeight !== stageHeight;
      const newAlignment =
        !oldProps.numColumns ||
        !oldProps.numRows ||
        oldProps.numColumns !== numColumns ||
        oldProps.numRows !== numRows;

      if (resizedStage || newAlignment) {
        vp.resize(stageWidth, stageHeight, numColumns, numRows);
        newProps.app.render(); //stops flicker on safari.

        //set the clamp based on the current stage height/width
        let clampWidthMax, clampHeightMax;
        let clampMinWidth = undefined;
        //let clampMinWidth = newProps.ensureVisible
        //  ? newProps.ensureVisible.height
        //  : undefined;

        if (numColumns / stageWidth > numRows / stageHeight) {
          //width is more important
          clampWidthMax = numColumns + OVERFLOW_ZOOM_ALLOWED * numColumns;
          vp = vp.clampZoom({
            maxHeight: undefined,
            maxWidth: clampWidthMax,
            minHeight: clampMinWidth,
          });
        } else {
          //height is more important
          clampHeightMax = numRows + OVERFLOW_ZOOM_ALLOWED * numRows;
          vp = vp.clampZoom({
            maxWidth: undefined,
            maxHeight: clampHeightMax,
            minHeight: clampMinWidth,
          });
        }

        //zoom to appropriate level
        if (newAlignment) {
          //new alignments set zoom clamping and also force the alignment into
          //as much of a view as possible.
          //vp = vp.fitWorld(true); //TODO: fails with hook? I don't get it
          vp = vp.setZoom(stageWidth / numColumns, false);
        } else if (oldProps.stageWidth !== stageWidth) {
          //the viewport is being resized horizontally (likely by user dragging)
          //  1. compress if the resize is making pushing the alignment off the screen
          //  2. scale alignment if the resize is expanding

          if (oldProps.stageWidth > stageWidth) {
            //viewport is shrinking horizontally
            if (vp.scale.x * numColumns > stageWidth) {
              //it is pushing the current alignment off the screen, force
              //the alignment to stay the same size as the viewport
              vp = vp.setZoom(stageWidth / numColumns, false);
            }
          } else {
            //viewport is expanding horizontally

            //detect new zoom level. this is pretty crude. is there a better way?
            let newZoomLevel = vp.scale.x * (stageWidth / oldProps.stageWidth);

            if (
              (clampWidthMax &&
                (newZoomLevel * numColumns < clampWidthMax ||
                  numColumns > stageWidth)) ||
              (clampHeightMax &&
                (newZoomLevel * numRows < clampHeightMax ||
                  numRows > stageHeight))
            ) {
              vp = vp.setZoom(newZoomLevel, false);
            }
          }
        }
      }

      //once all the zoom etc
      //if (newProps.ensureVisible) {
      //  vp.ensureVisible(
      //    undefined,
      //    newProps.ensureVisible.y,
      //    undefined,
      //    newProps.ensureVisible.height
      //  );
      //}

      return vp;
    },
  }
);
