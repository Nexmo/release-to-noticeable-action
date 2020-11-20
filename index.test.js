const { Toolkit } = require("actions-toolkit");

const mockedEnv = require("mocked-env");
const nock = require("nock");
nock.disableNetConnect();

describe("GitHub Release to Noticeable", () => {
  let action, restore, restoreTest;

  // Mock Toolkit.run to define `action` so we can call it
  Toolkit.run = jest.fn((actionFn) => {
    action = actionFn;
  });
  require(".");

  beforeEach(() => {
    jest.resetModules();

    // Default in case the test does not use per-test environment vars
    restoreTest = () => {};

    restore = mockedEnv({
      GITHUB_WORKFLOW: "Noticeable Release",
      GITHUB_ACTION: "Noticeable Release Action",
      GITHUB_ACTOR: "NexmoDev",
      GITHUB_WORKSPACE: "/tmp",
      GITHUB_SHA: "fake-sha-abc-123",
      GITHUB_REPOSITORY: "nexmo/fake-test-repo",
      GITHUB_EVENT_NAME: "",
      GITHUB_EVENT_PATH: "",
    });
  });

  afterEach(() => {
    restore();
    restoreTest();

    if (!nock.isDone()) {
      throw new Error(
        `Not all HTTP mocks have been used:\n\n${nock.pendingMocks()}`
      );

      nock.cleanAll();
    }
  });

  it("exits successfully", () => {
    const tools = mockEvent("release", {});
    tools.exit.success = jest.fn();
    action(tools);
    expect(tools.exit.success).toHaveBeenCalled();
    expect(tools.exit.success).toHaveBeenCalledWith("We did it!");
  });
});

function mockEvent(name, mockPayload) {
  jest.mock(
    "/github/workspace/event.json",
    () => {
      return mockPayload;
    },
    {
      virtual: true,
    }
  );

  process.env.GITHUB_EVENT_NAME = name;
  process.env.GITHUB_EVENT_PATH = "/github/workspace/event.json";

  return new Toolkit();
}
