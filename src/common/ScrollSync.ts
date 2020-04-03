import { Ace } from "ace-builds";

/**
 * ScrollSync.ts
 * This helper is used to synchronize the different ace and div
 * scrolling.
 *
 * Should be used as a singleton:
 *     import ScrollSync from './ScrollSync';
 *     let scrollSync = ScrollSync.singleton();
 *     scrollSync.setScrollerGroup('verticalScrollersA', 'vertical')
 *     scrollSync.registerScrollElement(element, group) //AND/OR
 *     scrollSync.registerScrollAceEditor(aceEditor, group) //OR
 *
 * Ideas taken from 2 projects:
 *   https://github.com/okonet/react-scroll-sync
 *   https://github.com/AhmadMHawwash/scroll-sync-react
 */
export enum ScrollType {
  vertical,
  horizontal,
  both
}

interface ScrollProps {
  scrolltype: ScrollType;
  scrollers: (HTMLElement | Ace.Editor)[];
}

export default class ScrollSync {
  static singleton: undefined | ScrollSync = undefined;

  private _groupScrollpropsHM: { [key: string]: ScrollProps } = {};
  private _lastScrollerOffsets: Map<
    Ace.Editor | HTMLElement,
    { lastTop: number; lastLeft: number }
  > = new Map();
  private _blockNextHorizontalScrollEvent: Map<
    Ace.Editor | HTMLElement,
    boolean
  > = new Map();
  private _blockNextVerticalScrollEvent: Map<
    Ace.Editor | HTMLElement,
    boolean
  > = new Map();

  /**
   * @returns {ScrollSync}
   */
  static getInstance(): ScrollSync {
    if (!this.singleton) {
      this.singleton = new ScrollSync();
    }
    return this.singleton;
  }

  _setScrollerLastOffsets(scroller: HTMLElement | Ace.Editor) {}

  /**
   * Returns the width of the hidden area (scroll width) in px of the element or ace editor.
   * @param scroller
   */
  _getAceMaxScrollWidth(scroller: Ace.Editor): number {
    //scroller is an ace editor
    return (
      scroller.renderer.$getLongestLine() +
      2 * scroller.renderer.$padding -
      scroller.renderer.$size.scrollerWidth
    );
  }

  /**
   *
   */
  _handleScrollEvent(
    scrolledScroller: HTMLElement | Ace.Editor,
    groupName: string,
    newScrollValue: number,
    scrollDirection: ScrollType.horizontal | ScrollType.vertical
  ) {
    if (!this._blockNextHorizontalScrollEvent.get(scrolledScroller)) {
      this._setScrollerLastOffsets(scrolledScroller);
      //update other nodes in the group
      const group = this._groupScrollpropsHM[groupName];
      group.scrollers.forEach(siblingScroller => {
        if (siblingScroller !== scrolledScroller) {
          if ("renderer" in siblingScroller) {
            //the siblingScroller is an ace editor
            if (
              scrollDirection === ScrollType.horizontal &&
              siblingScroller.session.getScrollLeft() !== newScrollValue
            ) {
              this._blockNextHorizontalScrollEvent.set(siblingScroller, true);
              siblingScroller.session.setScrollLeft(newScrollValue); //not proportional
            } else if (
              scrollDirection === ScrollType.vertical &&
              siblingScroller.session.getScrollTop() !== newScrollValue
            ) {
              this._blockNextVerticalScrollEvent.set(siblingScroller, true);
              siblingScroller.session.setScrollTop(newScrollValue); //not proportional
            }
          } else {
            //the siblingScroller is an html element
            if (
              scrollDirection === ScrollType.horizontal &&
              siblingScroller.scrollLeft !== newScrollValue
            ) {
              this._blockNextHorizontalScrollEvent.set(siblingScroller, true);
              siblingScroller.scrollLeft = newScrollValue;
            } else if (
              scrollDirection === ScrollType.vertical &&
              siblingScroller.scrollTop !== newScrollValue
            ) {
              this._blockNextVerticalScrollEvent.set(siblingScroller, true);
              siblingScroller.scrollTop = newScrollValue;
            }
          }
        }
      });
    }
    this._blockNextHorizontalScrollEvent.set(scrolledScroller, false);
  }

  /**
   * DEPRICATING _handleHorizontalScrollEvent
   * @param scroller
   * @param groupName
   * @param newScrollLeft
   
  _handleHorizontalScrollEvent(
    scroller: HTMLElement | Ace.Editor,
    groupName: string,
    newScrollLeft: number
  ) {
    this._setScrollerLastOffsets(scroller);

    //determine properties of the node being scrolled and set "last" scrolled numbers
    var scrollerFractionScrolled;
    if ("renderer" in scroller) {
      //the node being scrolled is an ace editor
      scrollerFractionScrolled =
        newScrollLeft / this._getAceMaxScrollWidth(scroller);
    } else {
      //the node being scrolled is an HTMLElement
      scrollerFractionScrolled =
        newScrollLeft / (scroller.scrollWidth - scroller.offsetWidth);
    }

    //update other nodes in the group
    const group = this._groupScrollpropsHM[groupName];
    for (var i = 0; i < group.scrollers.length; i++) {
      const targetScroller = group.scrollers[i];
      if (targetScroller !== scroller) {
        if ("renderer" in targetScroller) {
          //its another ace editor
          const targetMaxWidth = this._getAceMaxScrollWidth(targetScroller);
          const proportionalScrollLeft = Math.round(
            scrollerFractionScrolled * targetMaxWidth
          );
          if (
            proportionalScrollLeft !== targetScroller.session.getScrollLeft()
          ) {
          //targetScroller.session.setScrollLeft(proportionalScrollLeft);
          }
          if (targetScroller.session.getScrollLeft() !== newScrollLeft) {
            this._blockNextHorizontalScrollEvent.set(targetScroller, true);
            targetScroller.session.setScrollLeft(newScrollLeft); //TODO: KEEP / REMOVE? CURRENTLY TESTING (not proportional)
          }
        } else {
          //its an html element
          const targetMaxWidth =
            targetScroller.scrollWidth - targetScroller.offsetWidth;
          const proportionalScrollLeft = Math.round(
            scrollerFractionScrolled * targetMaxWidth
          );
          if (targetScroller.scrollLeft !== proportionalScrollLeft) {
          //targetScroller.scrollLeft = proportionalScrollLeft;
          }
          if (targetScroller.scrollLeft !== newScrollLeft) {
            this._blockNextHorizontalScrollEvent.set(targetScroller, true);
            targetScroller.scrollLeft = newScrollLeft; //TODO: KEEP / REMOVE? CURRENTLY TESTING (not proportional)
          }
        }
      }
    }
  }*/

  /**
   * Add or modify a group of synchronized scrollers.
   *
   * @param {string} groupName The name of the group to add .
   * @param {string} scrollType The type of scolling: "vertical", "horizontal", "both".
   *                            default="both"
   */
  setScrollerGroup(groupName: string, scrollType: ScrollType) {
    this._groupScrollpropsHM[groupName] = {
      scrolltype: scrollType,
      scrollers: this._groupScrollpropsHM[groupName]
        ? this._groupScrollpropsHM[groupName].scrollers
        : []
    };
  }

  /**
   * Register an element or ace editor for scroll synchronization.
   * @param scroller
   * @param groupName
   * @param dontErrorOnDuplicate if true, silently returns if the scroller is already registered
   *                             with this group, otherwise throws an error.
   */
  registerScroller(
    scroller: HTMLElement | Ace.Editor,
    groupName: string,
    dontErrorOnDuplicate?: boolean
  ) {
    const group = this._groupScrollpropsHM[groupName];
    if (!group) {
      throw new Error(`Error: attempt to register scroll sync on unknown group "${groupName}"
                    please register group first with setScrollerGroup`);
    }
    if (group.scrollers.includes(scroller)) {
      if (dontErrorOnDuplicate) {
        return;
      }
      throw new Error(
        `Error: attempt to re-add scroller to group "${groupName}"`
      );
    }

    group.scrollers.push(scroller);
    this._setScrollerLastOffsets(scroller); // initialize "last" offsets

    if ("renderer" in scroller) {
      //the scroller is an ace editor
      if (
        group.scrolltype === ScrollType.both ||
        group.scrolltype === ScrollType.horizontal
      ) {
        scroller.session.on("changeScrollLeft", newScrollLeft => {
          this._handleScrollEvent(
            scroller,
            groupName,
            Math.round(scroller.session.getScrollLeft()),
            ScrollType.horizontal
          );
        });
      }

      if (
        group.scrolltype === ScrollType.both ||
        group.scrolltype === ScrollType.vertical
      ) {
        scroller.session.on("changeScrollTop", e => {
          this._handleScrollEvent(
            scroller,
            groupName,
            Math.round(scroller.session.getScrollTop()),
            ScrollType.vertical
          );
        });
      }
    } else {
      //the scroller is an html element
      scroller.onscroll = e => {
        //determine direction - if the last scroll left !== to the new left
        //then it is horizontal otherwise it is vertical
        const direction =
          (e.target as HTMLElement).scrollLeft !==
          this._lastScrollerOffsets.get(scroller)?.lastLeft
            ? ScrollType.horizontal
            : ScrollType.vertical;

        if (
          group.scrolltype === ScrollType.both ||
          group.scrolltype === direction
        ) {
          this._handleScrollEvent(
            scroller,
            groupName,
            (e.target as HTMLElement).scrollLeft,
            direction
          );
        }
      };
    }
  }
}
