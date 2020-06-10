import "jest-webgl-canvas-mock";
import * as fs from "fs";
import * as React from "react";

import { shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
Enzyme.configure({ adapter: new Adapter() });

import { enableFetchMocks, default as fetchMock } from "jest-fetch-mock";
enableFetchMocks();

import { default as App } from "../App";

// Due to the runtime necessities of using styles, we need to explicitly mock out some stub data.
// https://github.com/facebook/jest/issues/3094
jest.mock("../MolecularStyles.module.scss", () => {
  return {
    aaStyBackgroundAlpha_Default: 0.25,
    aaStyDefaultLetterColor_Default: "#ffffff",
    aaStyClass_Default: "mock-aa-class",
    aaStyColorOrder_Default: "",
    aaStyColors_Default: "",
    aaStyBackgroundColorsLightTheme_Default: "",
    aaStyLetterColorsDarkTheme_Default: "",
    aaStyDesc_Default: "mock-aa-style-desc",
    ntStyBackgroundAlpha_Default: 0.25,
    ntStyDefaultLetterColor_Default: "#ffffff",
    ntStyClass_Default: "mock-nt-class",
    ntStyColorOrder_Default: "",
    ntStyColors_Default: "",
    ntStyBackgroundColorsLightTheme_Default: "",
    ntStyLetterColorsDarkTheme_Default: "",
    ntStyDesc_Default: "mock-nt-style-desc",
  };
});

describe("App", () => {
  beforeAll(() => {
    const sequenceFile = fs
      .readFileSync("public/7fa1c5691376beab198788a726917d48_b0.4.a2m")
      .toString();
    fetchMock.mockResponse(sequenceFile);
  });

  it("Should render within 2 minutes.", async () => {
    const wrapper = shallow(<App />);
    wrapper.update();
    await new Promise((resolve) => setImmediate(resolve));
    expect(wrapper).toMatchSnapshot();
  }, 120000);
});
