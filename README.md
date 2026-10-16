# acryl-quick-notes

A Cordis plugin for ACRYL and DeepSeek Harness: a small notebook icon in the top bar opens a Quick Notes list. Each note is saved as its own `.txt` file in the plugin's data folder on the host, so Web and Desktop share the same notes.

- Host half: `index.js` (stores the notes behind authenticated RPC routes under `/api`).
- Client half: `client.js` (the top bar button and the notes list).
- Permissions: `fs.write` (its own plugin data only), `ui`.

## Needs

The app it is loaded into must provide these Cordis services (each comes from a plugin of that app; they are listed in `package.json` as `acryl.requires`, generated from the code):

- Host: `connection`, `dshHomePath`.
- Client: `connection`, `slots`.

ACRYL and stock DeepSeek Harness (Web and Desktop) provide all of them; since 0.3.0 it runs in both (0.2.x needed ACRYL: its RPC channel relied on a `webServer` declaration stock DSH does not make). In an app without one of the services it waits and stays inactive; it never guesses a folder.

## Install

- ACRYL: type `/plugin pull github:inboxxobni/acryl-quick-notes` in a chat, or run `acryl plugin pull github:inboxxobni/acryl-quick-notes`, or paste `github:inboxxobni/acryl-quick-notes` into the Plugins page's "Add plugin" box. Each installs the latest release, checked by its sha512.
- Stock DeepSeek Harness: paste the `.tgz` URL of the latest release into the Plugins page's "Add plugin" box, or run `dsh plugin --profile web add <that URL>`.

## Discovery

This repository carries the GitHub topics `acryl-package`, `cordis-plugin` and `dsh-plugin`, and `package.json` carries the same keywords. Catalogs that index those topics list it without a submission step.

## License

MIT
