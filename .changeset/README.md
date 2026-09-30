# Changesets

For a change that should ship in a release, run `bun run changeset` and commit the generated Markdown file with the change. Choose a patch, minor, or major bump and describe the user-visible change.

After the change reaches `main`, the release workflow opens or updates a `chore: release` pull request with the new version and changelog. Merge that pull request to run checks, build a VSIX, and create a GitHub release with the VSIX attached. The release tag uses the version number without a `v` prefix. This workflow does not publish to npm or the VS Code Marketplace.

GitHub Actions must be allowed to create pull requests in the repository's Actions settings.
