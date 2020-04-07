# Testing For AlignmentViewer 2.0

We are using [Jest](https://facebook.github.io/jest) as our unit testing framework our choice.

## Enzyme

As of this writing, we are using [Create React App](https://create-react-app.dev/) as a foundation and [enzyme](https://airbnb.io/enzyme/) for rendering components. The former has a lot of configuration baked, but is missing a piece for the latter - and the [proposed solution](https://create-react-app.dev/docs/running-tests/#srcsetuptestsjs)) maybe\* doesn't work.

**\*** NG: the filename in the alignment viewer repo was misspelled - that might have been the issue. Either way, we are using the `src/setuptests.js` to add global mocks (e.g., for they `crypto` module).

To get enzyme setup in your test file, you will need to include some variation of these 3 lines in the your test file:

```ts
import { shallow, mount, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
Enzyme.configure({ adapter: new Adapter() });
```

## Canvas and WebGL

If testing a component using the canvas and/or dealing with WebGL components, it is necessary to have it mocked out since the tests are running in [jsdom](https://github.com/jsdom/jsdom), a virtual browser.

The remedy is to import [this library](https://www.npmjs.com/package/jest-webgl-canvas-mock) at the top of your file:

```ts
import "jest-webgl-canvas-mock";
```

## Fetching

When the code makes a `fetch` request, or similar network call, the test will most likely need to have said `fetch` calls mocked. We use [jest-fetch-mock](https://www.npmjs.com/package/jest-fetch-mock) to do this, and it's pretty powerful!

In order to use it, you need to include these lines in your file:

```ts
import { enableFetchMocks, default as fetchMock } from "jest-fetch-mock";
enableFetchMocks();
```

Let's look at a simple example:

```ts
import { enableFetchMocks, default as fetchMock } from "jest-fetch-mock";
enableFetchMocks();

describe("Example", () => {
  beforeAll(async () => {
    fetchMock.mockResponse("Every fetch request will return me!");
  });
});
```

## Bringing it All Together

Here is an example of the above imports all working together in unison in a more realistic scenario, albeit with a made-up component:

```tsx
import "jest-webgl-canvas-mock";

import { shallow, mount, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
Enzyme.configure({ adapter: new Adapter() });

import { enableFetchMocks, default as fetchMock } from "jest-fetch-mock";
enableFetchMocks();

import * as fs from "fs";

describe("SequenceComponent", () => {
  beforeAll(async () => {
    const sequenceFile = fs.readFileSync("an-example-file.a2m").toString();
  });

  it("Should match the existing snapshot.", () => {
    const wrapper = shallow(<SequenceComponent />);
    expect(wrapper).toMatchInlineSnapshot(`
<div
  className="SequenceComponent"
  sequenceFileLocation="an-example-file.a2m"
>
  <canvas />
</div>
    `);
  });
});
```
