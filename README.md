# release-to-noticeable-action

This GitHub Action pushes any published releases to https://noticeable.io/ using their API

## Usage

```yaml
name: Changelog
on:
  release:
    types: [published]
jobs:
  changelog:
    name: node12
    runs-on: ubuntu-latest
    steps:
      - name: Debug
        uses: nexmo/release-to-noticeable-action@main
        env:
          NOTICEABLE_API_KEY: ""
          NOTICEABLE_PROJECT_ID: ""
        with:
          draft: true
          tags: PHP,Server SDK
```

## Available configuration

### Environment variables

| Name                  | Description                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| NOTICEABLE_API_KEY    | The [API key](https://noticeable.io/api/tokens) to authenticate with                                   |
| NOTICEABLE_PROJECT_ID | The project ID to add an entry to. Take it from the URL - https://noticeable.io/projects/ID HERE/posts |

### Inputs

| Name              | Description                                                                                                  | Default |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | ------- |
| tags              | Comma separated list of tags to add for any releases in this repo                                            | `''`    |
| release_prefix    | Add a prefix to any releases. Useful when the release name is `v1.2.3` and you want to add the repo name too | `''`    |
| disable_repo_link | Set to `true` to hide the repo URL in the changelog entry. Useful when repos are private                     | `false` |
| draft             | Add the changelog entry as a draft                                                                           | `false` |
