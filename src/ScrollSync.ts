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
  private _blockNextScrollEvent: Map<
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

  /**
   * Returns the width of the hidden area (scroll width) in px of the element or ace editor.
   * @param scroller
   */
  _getAceMaxScrollWidth(scroller: HTMLElement | Ace.Editor): number {
    if ("renderer" in scroller) {
      //scroller is an ace editor
      return (
        scroller.renderer.$getLongestLine() +
        2 * scroller.renderer.$padding -
        scroller.renderer.$size.scrollerWidth
      );
    }
    return -1;
  }

  /**
   *
   * @param scroller
   * @param groupName
   * @param newScrollLeft
   */
  _handleHorizontalScrollEvent(
    scroller: HTMLElement | Ace.Editor,
    groupName: string,
    newScrollLeft: number
  ) {
    //determine properties of the node being scrolled
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
    console.log(
      "FRACTION SCROLLED:",
      scrollerFractionScrolled +
        " (which equals: " +
        newScrollLeft +
        "px), max=" +
        this._getAceMaxScrollWidth(scroller)
    );

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
            this._blockNextScrollEvent.set(targetScroller, true);
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
            this._blockNextScrollEvent.set(targetScroller, true);
            targetScroller.scrollLeft = newScrollLeft; //TODO: KEEP / REMOVE? CURRENTLY TESTING (not proportional)
          }
        }
      }
    }
  }

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
   */
  registerScroller(scroller: HTMLElement | Ace.Editor, groupName: string) {
    const group = this._groupScrollpropsHM[groupName];
    if (!group) {
      throw `Error: attempt to register scroll sync on unknown group "{groupName}"
                    please register group first with setScrollerGroup`;
    }
    if (group.scrollers.includes(scroller)) {
      throw `Error: attempt to readd  scroller to group "{groupName}"`;
    }

    group.scrollers.push(scroller);

    if ("renderer" in scroller) {
      //the scroller is an ace editor
      if (group.scrolltype === ScrollType.both || ScrollType.horizontal) {
        scroller.session.on("changeScrollLeft", newScrollLeft => {
          if (!this._blockNextScrollEvent.get(scroller)) {
            this._handleHorizontalScrollEvent(
              scroller,
              groupName,
              Math.round(scroller.session.getScrollLeft())
            );
          }
          this._blockNextScrollEvent.set(scroller, false);
        });
      }
      if (group.scrolltype === ScrollType.both || ScrollType.vertical) {
        //TODO implement vertical sync
        //scroller.session.on("changeScrollTop", e => {
        //    console.log(groupName + ' set to ' + e + ' from top by ' + aceEditor.id);
        //});
      }
    } else {
      //the scroller is an html element
      if (group.scrolltype === ScrollType.both || ScrollType.horizontal) {
        scroller.onscroll = e => {
          if (e.target && !this._blockNextScrollEvent.get(scroller)) {
            this._handleHorizontalScrollEvent(
              scroller,
              groupName,
              (<HTMLElement>e.target).scrollLeft
            );
          }
          this._blockNextScrollEvent.set(scroller, false);
        };
      }
      if (group.scrolltype === ScrollType.both || ScrollType.vertical) {
        //TODO implement vertical sync
      }
    }
  }
}
