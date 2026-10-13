# acryl-quick-notes

A Cordis plugin for ACRYL and DeepSeek Harness: a small notebook icon in the top bar opens a Quick Notes list. Each note is saved as its own `.txt` file in the plugin's data folder on the host, so Web and Desktop share the same notes.

- Host half: `index.js` (stores the notes behind an authenticated RPC channel).
- Client half: `client.js` (the top bar button and the notes list).
- Permissions: `fs.write` (its own plugin data only), `ui`.

## Install

In ACRYL: Plugins, then "Add from...", then this repository's URL, or install the `.tgz` attached to the latest release.

## Discovery

This repository carries the GitHub topics `acryl-package`, `cordis-plugin` and `dsh-plugin`, and `package.json` carries the same keywords. Catalogs that index those topics list it without a submission step.

## License

MIT
