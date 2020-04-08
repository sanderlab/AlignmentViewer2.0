// ! CRA automatically uses this filename by convention in the Jest configuration it generates
// https://www.npmjs.com/package/jest-fetch-mock#using-with-create-react-app

//
// configure Enzyme
//

import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";
Enzyme.configure({ adapter: new Adapter() });

//
// add global mocks
//

//mock out the crypto getRandomValues to always return the same values
//for any given array length -
//  (1) crypto isn't normally available and
//  (2) the randomness causes snapshots to always be unique.

const crypto = require("crypto");
Object.defineProperty(global, "crypto", {
  value: {
    getRandomValues: (arr) => {
      return new Array(arr).map((num) => {
        return 0;
      });
    },
  },
});
