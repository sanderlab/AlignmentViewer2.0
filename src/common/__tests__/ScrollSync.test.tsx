import "jest-webgl-canvas-mock";
import * as React from "react";

import { ScrollSync, ScrollType } from "../ScrollSync";

import { mount, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
Enzyme.configure({ adapter: new Adapter() });

describe("ScrollSync", () => {
  it("Should work.", () => {
    const scrollSyncInstance = new ScrollSync(ScrollType.horizontal);
    expect(scrollSyncInstance).not.toBeUndefined();
    expect(scrollSyncInstance).not.toBeNull();
  });

  it.each([ScrollType.horizontal, ScrollType.vertical])(
    "Should allow registering a scroller of type %s to a scroll group.",
    (scrollType) => {
      const wrapper = mount(<div />);
      const scrollSyncInstance = new ScrollSync(
        scrollType as ScrollType.horizontal | ScrollType.vertical
      );
      scrollSyncInstance.registerElementScroller(
        wrapper.getDOMNode() as HTMLElement
      );

      wrapper
        .getDOMNode()
        .dispatchEvent(new window.UIEvent("scroll", { detail: 0 }));
      wrapper.update();
    }
  );
});
