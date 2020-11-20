const { Toolkit } = require("actions-toolkit");

// Run your GitHub Action!
Toolkit.run(
  async (tools) => {
    return tools.exit.success("We did it!");
  },
  {
    event: "release",
  }
);
