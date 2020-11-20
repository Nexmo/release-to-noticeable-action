const { Toolkit } = require("actions-toolkit");

const mockedEnv = require("mocked-env");
const nock = require("nock");
nock.disableNetConnect();

const defaultRelease = {
  action: "published",
  release: {
    name: "v1.2.3",
    body: "This is an example release body",
    html_url: "https://github.com/nexmo/fake-test-repo/releases/v1.2.3",
    published_at: "2019-05-15T15:20:53Z",
  },
  repository: {
    name: "fake-test-repo",
  },
};

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
      NOTICEABLE_PROJECT_ID: "Example-Project-ID",
      NOTICEABLE_API_KEY: "Noticeable-API-123",
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

  it("exits if the project ID is missing", async () => {
    restoreTest = mockedEnv({
      NOTICEABLE_PROJECT_ID: undefined,
    });
    const tools = mockEvent("release", defaultRelease);
    tools.exit.failure = jest.fn();
    await action(tools);
    expect(tools.exit.failure).toHaveBeenCalledWith(
      "Missing 'NOTICEABLE_PROJECT_ID' environment variable"
    );
  });

  it("exits if the noticeable API key is missing", async () => {
    restoreTest = mockedEnv({
      NOTICEABLE_API_KEY: undefined,
    });
    const tools = mockEvent("release", defaultRelease);
    tools.exit.failure = jest.fn();
    await action(tools);
    expect(tools.exit.failure).toHaveBeenCalledWith(
      "Missing 'NOTICEABLE_API_KEY' environment variable"
    );
  });

  it("stops execution when the event is not published", async () => {
    const tools = mockEvent("release", {
      ...defaultRelease,
      action: "deleted",
    });
    tools.exit.failure = jest.fn();
    await action(tools);
    expect(tools.exit.failure).toHaveBeenCalledWith(
      "Release status is not in 'published'. Got 'deleted'"
    );
  });

  for (let t of [
    {
      name: "runs with the default parameters",
      env: {},
      variables: {},
    },

    {
      name: "adds a title prefix if the RELEASE_PREFIX input is provided",
      env: {
        INPUT_RELEASE_PREFIX: "demo-project",
      },
      variables: {
        title: "demo-project v1.2.3",
      },
    },

    {
      name:
        "does not append the GitHub release link if the DISABLE_REPO_LINK input is provided",
      env: {
        INPUT_DISABLE_REPO_LINK: "true",
      },
      variables: {
        content: "This is an example release body",
      },
    },

    {
      name: "adds the beta label if it is a prerelease",
      event: {
        release: {
          ...defaultRelease.release,
          prerelease: true,
        },
      },
      variables: {
        labels: [{ name: "Beta" }],
      },
    },

    {
      name: "adds as a draft if the DRAFT input is set",
      env: {
        INPUT_DRAFT: "true",
      },
      variables: {
        draft: true,
      },
    },
  ]) {
    it(t.name, async () => {
      restoreTest = mockedEnv(t.env || {});
      const tools = mockEvent("release", {
        ...defaultRelease,
        ...(t.event || {}),
      });
      tools.exit.success = jest.fn();

      mockCreatePost(t.variables);

      await action(tools);
      expect(tools.exit.success).toHaveBeenCalledWith(
        "Changelog entry created"
      );
    });
  }
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

function mockCreatePost(variables) {
  nock("https://api.noticeable.io", {
    reqheaders: {
      Authorization: "Apikey Noticeable-API-123",
    },
  })
    .post("/graphql", {
      query:
        "\n" +
        "    mutation AddEntry(\n" +
        "      $project: ID!\n" +
        "      $title: String!\n" +
        "      $content: String!\n" +
        "      $draft: Boolean!\n" +
        "      $created: DateTime!\n" +
        "      $labels: [LabelInput]\n" +
        "    ) {\n" +
        "      createPost(\n" +
        "        input: {\n" +
        "          projectId: $project\n" +
        '          author: { fullName: "Vonage" }\n' +
        "          content: $content\n" +
        "          isDraft: $draft\n" +
        "          labels: $labels\n" +
        "          publicationTime: $created\n" +
        "          title: $title\n" +
        "        }\n" +
        "      ) {\n" +
        "        post {\n" +
        "          id\n" +
        "          permalink\n" +
        "        }\n" +
        "      }\n" +
        "    }\n" +
        "  ",
      variables: {
        project: "Example-Project-ID",
        title: "v1.2.3",
        content:
          "This is an example release body\n\nhttps://github.com/nexmo/fake-test-repo/releases/v1.2.3",
        draft: false,
        created: "2019-05-15T15:20:53.000Z",
        labels: [],
        ...variables,
      },
    })
    .reply(200, {
      data: {
        createPost: {
          post: {
            id: "8bJYiSW4IJbN7Iru93Nq",
            permalink:
              "https://timeline.noticeable.io/IiJ4ZSyjbeAdrXpWHGng/posts/demo-post-8bjyisw4ijbn7iru93nq",
          },
        },
      },
    });
}
