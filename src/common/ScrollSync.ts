/**
 * ScrollSync.ts
 * This helper is used to synchronize the different div scrollers.
 *
 * Example usage:
 *     import ScrollSync from './ScrollSync';
 *     let scrollSyncV = new ScrollSync(ScrollType.vertical);
 *     scrollSyncV.registerScroller(domElement);
 *
 * Originally made to work with ace editors as well, but now removed
 *
 * Ideas adapted to work  from 2 projects (each of which are aimed at dom elements):
 *   https://github.com/okonet/react-scroll-sync
 *   https://github.com/AhmadMHawwash/scroll-sync-react
 */
export enum ScrollType {
  vertical,
  horizontal,
  both,
}

export class ScrollSync {
  private ticking = false;
  private scrollDirection: ScrollType.vertical | ScrollType.horizontal;
  private scrollers: HTMLElement[];
  private scrollerMouseEnterListeners = new Map<HTMLElement, () => void>();
  private scrollerMouseLeaveListeners = new Map<HTMLElement, () => void>();

  //reuse the same scroll functions for each element
  private scrollFnHandles: Map<HTMLElement, (this: HTMLElement) => any>;

  /*
   *
   *
   * PUBLIC METHODS
   *
   *
   */
  constructor(scrollDirection: ScrollType.vertical | ScrollType.horizontal) {
    this.scrollDirection = scrollDirection;
    this.scrollers = [];
    this.scrollFnHandles = new Map<HTMLElement, (this: HTMLElement) => any>();
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

      //keep track of functions
      this.scrollerMouseEnterListeners.set(scroller, () => {
        this.addScrollEvents(scroller);
      });
      this.scrollerMouseLeaveListeners.set(scroller, () => {
        this.removeScrollEvents(scroller);
      });

      //register the listeners
      scroller.addEventListener(
        "mouseenter",
        this.scrollerMouseEnterListeners.get(scroller)!
      );
      scroller.addEventListener(
        "mouseleave",
        this.scrollerMouseLeaveListeners.get(scroller)!
      );
    }
  }

  /**
   * Un-register a scroller with this scroll sync.
   * @param scroller
   */
  unRegisterElementScroller(scrollerToRemove: HTMLElement) {
    this.scrollers = this.scrollers.filter((el) => el !== scrollerToRemove);

    scrollerToRemove.removeEventListener(
      "mouseenter",
      this.scrollerMouseEnterListeners.get(scrollerToRemove)!
    );
    scrollerToRemove.removeEventListener(
      "mouseleave",
      this.scrollerMouseLeaveListeners.get(scrollerToRemove)!
    );
    this.removeScrollEvents(scrollerToRemove);
  }

  /*
   *
   *
   * PRIVATE METHODS
   *
   *
   */

  /**
   * Execute the scroll changes to all group scrollers.
   *
   * Note: the reason for jumpy scrolling I think is due
   * to easing from the scroller, that doesn't happen with the
   * scrollSibling.
   *
   * Update: I've partially fixed by setting all the sibilingScrollers
   * in a single animation frame. This makes all the siblings move
   * en mass. Unfortunately, the element being scrolled still is
   * always a bit different than its siblings - it looks like it is
   * just a bit ahead.
   *
   * I'm not sure how to fix - the best would be to put current
   * scroller into the same animation frame, but it is impossible
   * to cancel the current scroll event, and I'm unsure whether it
   * is even possible.
   */
  private handleScroll = (scroller: HTMLElement, event?: Event) => {
    if (!this.ticking) {
      requestAnimationFrame(() => {
        const siblingScrollers = this.scrollers.filter(
          (possibleSib) => possibleSib !== scroller
        );
        siblingScrollers.forEach((siblingScroller) => {
          this.syncScrollPosition(scroller, siblingScroller);
        });
        this.ticking = false;
      });
      this.ticking = true;
    }
  };

  /**
   * This function executes the actual position sync
   * @param scroller
   * @param siblingScroller
   */
  private syncScrollPosition(
    scroller: HTMLElement,
    siblingScroller: HTMLElement
  ) {
    if (this.scrollDirection === ScrollType.horizontal) {
      const newScrollLeft = scroller.scrollLeft;

      if (siblingScroller.scrollLeft !== newScrollLeft) {
        siblingScroller.scrollLeft = newScrollLeft;
      }
    } else {
      const newScrollTop = scroller.scrollTop;
      if (siblingScroller.scrollTop !== newScrollTop) {
        siblingScroller.scrollTop = newScrollTop;
      }
    }
  }

  /**
   * Add event listeners and functions from a particular scroller
   * @param scroller
   */
  private addScrollEvents(scroller: HTMLElement) {
    if (!this.scrollFnHandles.has(scroller)) {
      this.scrollFnHandles.set(
        scroller,
        this.handleScroll.bind(this, scroller)
      );
    }

    const scrollFn = this.scrollFnHandles.get(scroller)!;
    scroller.addEventListener("scroll", scrollFn, {
      capture: false,
      passive: true,
    });
  }

  /**
   * Remove event listeners and functions from a particular scroller
   * @param scroller
   */
  private removeScrollEvents(scroller: HTMLElement) {
    const scrollFn = this.scrollFnHandles.get(scroller);
    if (scrollFn) {
      scroller.removeEventListener("scroll", scrollFn);
    }
  }
}
