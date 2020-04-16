import "jest-webgl-canvas-mock";
import * as React from "react";

import { ScrollSync, ScrollType } from "../ScrollSync";

import { mount, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
Enzyme.configure({ adapter: new Adapter() });

describe("ScrollSync", () => {
  it("Should work.", () => {
    const scrollSyncInstance = ScrollSync.getInstance();
    expect(scrollSyncInstance).not.toBeUndefined();
    expect(scrollSyncInstance).not.toBeNull();
  });

  it.each([ScrollType.both, ScrollType.horizontal, ScrollType.vertical])(
    "Should allow registering a scroller of type %s to a scroll group.",
    (scrollType) => {
      const wrapper = mount(<div />);
      const scrollSyncInstance = ScrollSync.getInstance();
      scrollSyncInstance.setScrollerGroup("cool-kids", scrollType);
      scrollSyncInstance.registerScroller(
        wrapper.getDOMNode() as HTMLElement,
        "cool-kids"
      );

      wrapper
        .getDOMNode()
        .dispatchEvent(new window.UIEvent("scroll", { detail: 0 }));
      wrapper.update();
    }
  );

  it.each([ScrollType.both, ScrollType.horizontal, ScrollType.vertical])(
    "Should allow setting a scroller of type %s to a scroll group.",
    (scrollType) => {
      const scrollSyncInstance = ScrollSync.getInstance();
      scrollSyncInstance.setScrollerGroup("cooler-kids", scrollType);
    }
  );
});
