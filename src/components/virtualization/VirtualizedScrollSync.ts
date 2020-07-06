import {
  store,
  setWorldTopOffset,
  setWorldLeftOffset,
  IVirtualizedMatrixState,
} from "../../common/ReduxStore";

/**
 * VirtualizedScrollSync.ts
 * This helper is used to synchronize the different virtualized matrix scrollers.
 *
 * Example usage:
 *     import VirtualizedScrollSync from './ScrollSync';
 *     let scrollSyncV = new ScrollSync(ScrollType.vertical);
 *     scrollSyncV.registerScroller(domElement);
 *
 * Originally made to work with ace editors as well, but now removed
 *
 * Ideas adapted to work  from 2 projects (each of which are aimed at dom elements):
 *   https://github.com/okonet/react-scroll-sync
 *   https://github.com/AhmadMHawwash/scroll-sync-react
 */
export enum VirtualizedScrollType {
  vertical,
  horizontal,
  both,
}

export class VirtualizedScrollSync {
  private currentState:
    | {
        [id: string]: IVirtualizedMatrixState;
      }
    | undefined;

  private scrollDirection:
    | VirtualizedScrollType.vertical
    | VirtualizedScrollType.horizontal;
  private scrollers: string[];

  /*
   *
   *
   * PUBLIC METHODS
   *
   *
   */
  constructor(
    scrollDirection:
      | VirtualizedScrollType.vertical
      | VirtualizedScrollType.horizontal
  ) {
    this.scrollDirection = scrollDirection;
    this.scrollers = [];

    store.subscribe(this.stateChanged);
  }

  /**
   * Register a scroller with this scroll sync.
   * @param scroller
   */
  registerScrollers(scrollerIds: string[]) {
    scrollerIds.forEach((scrollerId) => {
      if (!this.scrollers.includes(scrollerId)) {
        this.scrollers.push(scrollerId);
      }
    });
  }

  /**
   * Un-register a scroller with this scroll sync.
   * @param scroller
   */
  unRegisterScroller(scrollerIdToRemove: string) {
    this.scrollers = this.scrollers.filter((el) => el !== scrollerIdToRemove);
  }

  /*
   *
   *
   * PRIVATE METHODS
   *
   *
   */

  /**
   *
   */
  private stateChanged = () => {
    const oldState = this.currentState;
    this.currentState = store.getState().virtualizedMatrixSlice;

    const offsetPropName =
      this.scrollDirection === VirtualizedScrollType.horizontal
        ? "worldLeftOffset"
        : "worldTopOffset";

    //determine whether any scrollers had their offsets changed
    const changedScrollerId = this.scrollers.find((scrollerId) => {
      if (!this.currentState) {
        throw Error(
          "Unable to configure scroll sync. State not configured propertly:" +
            this.currentState
        );
      }
      if (!oldState) {
        //first time
        if (
          this.currentState[scrollerId] &&
          !isNaN(this.currentState[scrollerId][offsetPropName])
        ) {
          return true;
        }
      } else {
        if (
          oldState[scrollerId] &&
          this.currentState[scrollerId] &&
          oldState[scrollerId][offsetPropName] !==
            this.currentState[scrollerId][offsetPropName]
        ) {
          return true;
        }
      }
      return false;
    });
    //console.log("changedScrollerId:" + changedScrollerId);

    if (changedScrollerId) {
      //the offset did change on one of the scrollers
      const newOffset = this.currentState[changedScrollerId][offsetPropName];
      this.scrollers.forEach((scrollerId) => {
        if (scrollerId !== changedScrollerId) {
          if (
            !this.currentState ||
            !this.currentState[scrollerId] ||
            this.currentState[scrollerId][offsetPropName] !== newOffset
          ) {
            if (this.scrollDirection === VirtualizedScrollType.horizontal) {
              store.dispatch(
                setWorldLeftOffset({
                  id: scrollerId,
                  worldLeftOffset: newOffset,
                })
              );
            } else {
              store.dispatch(
                setWorldTopOffset({ id: scrollerId, worldTopOffset: newOffset })
              );
            }
          }
        }
      });
    }
  };
}
