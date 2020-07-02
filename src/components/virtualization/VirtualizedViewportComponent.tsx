import { Viewport, MovedEventData } from "pixi-viewport";
import * as PIXI from "pixi.js";
import { PixiComponent } from "@inlet/react-pixi";

interface IMouseLocation {
  worldX: number;
  worldY: number;
  rowIdx: number;
  colIdx: number;
}

export interface IVirtualizedViewportProps {
  app: PIXI.Application;
  //the parentElement is used to constrain the wheel events, otherwise when
  //e.g., the minimap on positioned above the viewport, the wheel events
  //propogate through to the viewport
  parentElement: HTMLElement;
  screenWidth: number;
  screenHeight: number;
  worldWidth: number;
  worldHeight: number;
  worldLeftOffset: number;
  worldTopOffset: number;
  columnWidth: number;
  rowHeight: number;
  viewportMovedVertically(newWorldTop: number): void;
  viewportMovedHorizontally(newWorldLeft: number): void;
  mouseMoved?(event: IMouseLocation): void;
  clicked?(event: IMouseLocation): void;
}

export const VirtualizedViewport = PixiComponent<
  IVirtualizedViewportProps,
  any
>("VirtualizedViewport", {
  create(props: IVirtualizedViewportProps) {
    const {
      app,
      parentElement,
      screenWidth,
      screenHeight,
      worldWidth,
      worldHeight,
    } = props;

    return new Viewport({
      noTicker: true,
      screenWidth: screenWidth,
      screenHeight: screenHeight,
      worldWidth: worldWidth,
      worldHeight: worldHeight,
      interaction: app.renderer.plugins.interaction,
      divWheel: parentElement,
    })
      .drag({ clampWheel: true, direction: "all", pressDrag: false })
      .clamp({ direction: "all" });
  },

  applyProps(
    vp: Viewport,
    oldProps: IVirtualizedViewportProps,
    newProps: IVirtualizedViewportProps
  ) {
    const {
      app,
      screenWidth,
      screenHeight,
      columnWidth,
      rowHeight,
      worldWidth,
      worldHeight,
      worldLeftOffset,
      worldTopOffset,
      mouseMoved,
      viewportMovedVertically,
      viewportMovedHorizontally,
    } = newProps;

    if (
      oldProps.screenWidth !== screenWidth ||
      oldProps.screenHeight !== screenHeight ||
      oldProps.worldWidth !== worldWidth ||
      oldProps.worldHeight !== worldHeight
    ) {
      vp.resize(screenWidth, screenHeight, worldWidth, worldHeight);
      app.render(); //stops flicker on safari.
    }

    if (vp.top !== worldTopOffset) {
      vp.top = worldTopOffset;
      app.render(); //stops flicker on safari.
    }

    if (vp.left !== worldLeftOffset) {
      vp.left = worldLeftOffset;
      app.render(); //stops flicker on safari.
    }

    //not sure the cost of adding and removing functions, but
    //this might be a place for performance improvement. It is
    //tricky because worldTopOffset can't be queried during
    //the event otherwise I'd only add the listener in the
    //viewport creation phase above (pixelsFromWorldTop is
    //stale if put there or in useEffect)
    vp.off("moved");
    vp.on("moved", (data: MovedEventData) => {
      const newWorldTop = data.viewport.top;
      const newWorldLeft = data.viewport.left;

      if (data.type === "wheel" && newWorldTop !== worldTopOffset) {
        viewportMovedVertically(newWorldTop);
        app.render(); //stops flicker on safari.
      }
      if (data.type === "wheel" && newWorldLeft !== worldLeftOffset) {
        viewportMovedHorizontally(newWorldLeft);
        app.render(); //stops flicker on safari.
      }
    });

    if (mouseMoved !== oldProps.mouseMoved) {
      vp.off("mousemove");
      if (mouseMoved) {
        vp.on("mousemove", (event: PIXI.interaction.InteractionEvent) => {
          if (event.data.global.x > 0 && event.data.global.y > 0) {
            mouseMoved({
              worldX: event.data.global.x,
              worldY: event.data.global.y,
              rowIdx: Math.floor(event.data.global.y / rowHeight),
              colIdx: Math.floor(event.data.global.x / columnWidth),
            });
          }
        });
      }
    }

    //warning - clicked interferes with the letter selection. We need to use
    //"pointer-events: none" on the letter div, but it only partially works
    //for allowing click events in the viewport - the clicked event eventually
    //stops firing in some wierd cases. If you re-implemnet - do a lot of testing!

    /*if (clicked !== oldProps.clicked) {
      vp.off("clicked");
      if (clicked) {
        vp.on("clicked", (event) => {
          clicked({
            worldX: event.world.x,
            worldY: event.world.y,
            sequenceIdx: Math.floor(event.world.y / rowHeight),
            residueIdx: Math.floor(event.world.x / columnWidth),
          });
        });
      }
    }*/

    return vp;
  },
});
