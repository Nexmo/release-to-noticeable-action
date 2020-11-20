const { Toolkit } = require("actions-toolkit");
const { GraphQLClient, gql } = require("graphql-request");

// Run your GitHub Action!
Toolkit.run(
  async (tools) => {
    const allowedStatuses = ["published"];
    if (!allowedStatuses.includes(tools.context.payload.action)) {
      return tools.exit.failure(
        `Release status is not in '${allowedStatuses.join(", ")}'. Got '${
          tools.context.payload.action
        }'`
      );
    }

    if (!process.env.NOTICEABLE_API_KEY) {
      return tools.exit.failure(
        `Missing 'NOTICEABLE_API_KEY' environment variable`
      );
    }

    if (!process.env.NOTICEABLE_PROJECT_ID) {
      return tools.exit.failure(
        `Missing 'NOTICEABLE_PROJECT_ID' environment variable`
      );
    }

    const release = tools.context.payload.release;
    const repoName = tools.context.payload.repository.name;
    let labels = tools.inputs.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);

    // Use the title from the release, plus anything set in the environment
    let title = release.name;
    if (tools.inputs.release_prefix) {
      title = tools.inputs.release_prefix + " " + title;
    }

    // Then the content
    let content = release.body;

    // Sometimes we don't want to link to the release (e.g. if it's a private repo)
    if (!tools.inputs.disable_repo_link) {
      content += "\n\n" + release.html_url;
    }

    // Any prereleases go in to a beta category
    if (release.prerelease) {
      labels.push("Beta");
    }

    let draft = false;
    if (tools.inputs.draft) {
      draft = true;
    }

    // Reformat labels to the format Noticeable needs them
    labels = labels.map((l) => {
      return { name: l };
    });

    // Now let's create the release
    await createChangelogEntry(process.env.NOTICEABLE_API_KEY, {
      project: process.env.NOTICEABLE_PROJECT_ID,
      title,
      content,
      draft,
      created: new Date(release.published_at).toISOString(),
      labels,
    });

    return tools.exit.success("Changelog entry created");
  },
  {
    event: "release",
  }
);

async function createChangelogEntry(auth, variables) {
  const endpoint = `https://api.noticeable.io/graphql`;

  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      authorization: `Apikey ${auth}`,
    },
  });

  const mutation = gql`
    mutation AddEntry(
      $project: ID!
      $title: String!
      $content: String!
      $draft: Boolean!
      $created: DateTime!
      $labels: [LabelInput]
    ) {
      createPost(
        input: {
          projectId: $project
          author: { fullName: "Vonage" }
          content: $content
          isDraft: $draft
          labels: $labels
          publicationTime: $created
          title: $title
        }
      ) {
        post {
          id
          permalink
        }
      }
    }
  `;

  return await graphQLClient.request(mutation, variables);
}
