import { Ace } from "ace-builds";
import _ from "lodash";

/**
 * ScrollSync.ts
 * This helper is used to synchronize the different ace and div scrolling
 * scrolling.
 *
 * Example usage:
 *     import ScrollSync from './ScrollSync';
 *     let scrollSyncV = new ScrollSync(ScrollType.vertical);
 *     scrollSyncV.registerScroller(domElement);
 *     scrollSyncV.registerScroller(aceEditor);
 *
 * Ideas adapted to work with both dom elements and ace from 2 projects
 * (each of which are aimed at dom elements):
 *   https://github.com/okonet/react-scroll-sync
 *   https://github.com/AhmadMHawwash/scroll-sync-react
 */
export enum ScrollType {
  vertical,
  horizontal,
  both,
}

export class ScrollSync {
  private scrollDirection: ScrollType.vertical | ScrollType.horizontal;
  private aceEditorDirection: "changeScrollLeft" | "changeScrollTop";
  private scrollers: (Ace.Editor | HTMLElement)[];

  //reuse the same scroll functions for each element / ace editor
  private scrollFnHandles: Map<
    Ace.Editor | HTMLElement,
    (this: HTMLElement) => any
  >;

  /*
   *
   *
   * PUBLIC METHODS
   *
   *
   */
  constructor(scrollDirection: ScrollType.vertical | ScrollType.horizontal) {
    this.scrollDirection = scrollDirection;
    this.aceEditorDirection =
      scrollDirection === ScrollType.horizontal
        ? "changeScrollLeft"
        : "changeScrollTop";
    this.scrollers = [];
    this.scrollFnHandles = new Map<
      Ace.Editor | HTMLElement,
      (this: HTMLElement) => any
    >();
  }

  /**
   * Register a scroller with this scroll sync. By attaching
   * the scroll events only when a scroll is possible, we avoid
   * ths jerky-ness and potential forever loop of one scroll
   * updating another back and forth.
   * @param scroller
   */
  registerElementScroller(scroller: HTMLElement) {
    if (!this.scrollers.includes(scroller)) {
      this.scrollers.push(scroller);
      scroller.addEventListener("mouseenter", () => {
        this.addScrollEvents(scroller);
      });
      scroller.addEventListener("mouseleave", () => {
        this.removeScrollEvents(scroller);
      });
    }
  }

  /**
   * Register a scroller with this scroll sync. By attaching
   * the scroll events only when a scroll is possible, we avoid
   * ths jerky-ness and potential forever loop of one scroll
   * updating another back and forth.
   * Note - the ace editor doesn't have a native mouseenter/leave
   * so we need to use the parent element's event listeners.
   * @param scroller
   */
  registerAceScroller(scroller: Ace.Editor, parentElem: HTMLElement) {
    if (!this.scrollers.includes(scroller)) {
      this.scrollers.push(scroller);

      parentElem.addEventListener("mouseenter", () => {
        this.addScrollEvents(scroller);
      });
      parentElem.addEventListener("mouseleave", () => {
        this.removeScrollEvents(scroller);
      });
    }
  }

  /**
   * Deregister a scroller with this scroll sync
   * Requires removal of mouse events also ..
   * @param scroller
   */
  //unRegisterScroller(scroller: HTMLElement | Ace.Editor) {
  //  this.scrollers = this.scrollers.filter((s) => s !== scroller);
  //  this.removeScrollEvents(scroller);
  //}

  /*
   *
   *
   * PRIVATE METHODS
   *
   *
   */
  private isAceEditor(x: Ace.Editor | HTMLElement): x is Ace.Editor {
    return "renderer" in x;
  }

  /**
   * Execute the scroll changes to all group scrollers.
   *
   * Note: the reason for jumpy scrolling I think is due
   * to easing from the scroller, that doesn't happen with the
   * scrollSibling. I'm not sure how to fix (one thought was
   * to cancel the scroll event and set the position myself,
   * but one can't cancel a scroll event).
   */
  private handleScroll = (
    scroller: Ace.Editor | HTMLElement,
    event?: Event
  ) => {
    const siblingScrollers = this.scrollers.filter(
      (possibleSib) => possibleSib !== scroller
    );
    siblingScrollers.forEach((siblingScroller) => {
      this.syncScrollPosition(scroller, siblingScroller);
    });
  };

  /**
   * This function executes the actual position sync
   * @param scroller
   * @param siblingScroller
   */
  private syncScrollPosition(
    scroller: Ace.Editor | HTMLElement,
    siblingScroller: Ace.Editor | HTMLElement
  ) {
    if (this.scrollDirection === ScrollType.horizontal) {
      const newScrollLeft = this.isAceEditor(scroller)
        ? scroller.session.getScrollLeft()
        : scroller.scrollLeft;

      if (this.isAceEditor(siblingScroller)) {
        if (siblingScroller.session.getScrollLeft() !== newScrollLeft) {
          siblingScroller.session.setScrollLeft(newScrollLeft);
        }
      } else if (siblingScroller.scrollLeft !== newScrollLeft) {
        siblingScroller.scrollLeft = newScrollLeft;
      }
    } else {
      const newScrollTop = this.isAceEditor(scroller)
        ? scroller.session.getScrollTop()
        : scroller.scrollTop;

      if (this.isAceEditor(siblingScroller)) {
        if (siblingScroller.session.getScrollTop() !== newScrollTop) {
          siblingScroller.session.setScrollTop(newScrollTop);
        }
      } else if (siblingScroller.scrollTop !== newScrollTop) {
        siblingScroller.scrollTop = newScrollTop;
      }
    }
  }

  /**
   * Add event listeners and functions from a particular scroller
   * @param scroller
   */
  private addScrollEvents(scroller: Ace.Editor | HTMLElement) {
    if (!this.scrollFnHandles.has(scroller)) {
      this.scrollFnHandles.set(
        scroller,
        this.handleScroll.bind(this, scroller)
      );
    }

    const scrollFn = this.scrollFnHandles.get(scroller)!;
    if (this.isAceEditor(scroller)) {
      scroller.session.on(this.aceEditorDirection, scrollFn);
    } else {
      scroller.addEventListener("scroll", scrollFn);
    }
  }

  /**
   * Remove event listeners and functions from a particular scroller
   * @param scroller
   */
  private removeScrollEvents(scroller: Ace.Editor | HTMLElement) {
    const scrollFn = this.scrollFnHandles.get(scroller);
    if (scrollFn) {
      if (this.isAceEditor(scroller)) {
        scroller.session.off(this.aceEditorDirection, scrollFn);
      } else {
        scroller.removeEventListener("scroll", scrollFn);
      }
    } else {
      console.log("failed to remove scrollFn");
    }
  }
}
