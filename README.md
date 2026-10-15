# acryl-quick-notes

A Cordis plugin for ACRYL and DeepSeek Harness: a small notebook icon in the top bar opens a Quick Notes list. Each note is saved as its own `.txt` file in the plugin's data folder on the host, so Web and Desktop share the same notes.

- Host half: `index.js` (stores the notes behind an authenticated RPC channel).
- Client half: `client.js` (the top bar button and the notes list).
- Permissions: `fs.write` (its own plugin data only), `ui`.

## Needs

The app it is loaded into must provide these Cordis services (each comes from a plugin of that app; they are listed in `package.json` as `acryl.requires`, generated from the code):

- Host: `connection`, `dshHomePath`, `webServer`.
- Client: `connection`, `slots`.

ACRYL and DeepSeek Harness (Web and Desktop) provide all of them. In an app without one of them the plugin waits and stays inactive; it never guesses a folder.

## Install

In ACRYL: Plugins, then "Add from...", then this repository's URL, or install the `.tgz` attached to the latest release.

## Discovery

This repository carries the GitHub topics `acryl-package`, `cordis-plugin` and `dsh-plugin`, and `package.json` carries the same keywords. Catalogs that index those topics list it without a submission step.

## License

MIT
