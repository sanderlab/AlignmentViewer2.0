import ScrollSync from "../ScrollSync";

describe("ScrollSync", () => {
  it("Should work.", () => {
    const scrollSyncInstance = ScrollSync.getInstance();
    expect(scrollSyncInstance).not.toBeUndefined();
    expect(scrollSyncInstance).not.toBeNull();
  });
});
