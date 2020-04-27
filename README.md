# Jolt Server

A development server supporting live reloading, single page applications, and static file serving.

![Actions](https://github.com/outwalk-studios/jolt-server/workflows/build/badge.svg)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/outwalk-studios/jolt-server/blob/master/LICENSE)
[![Chat Server](https://img.shields.io/badge/chat-on%20discord-7289da.svg)](https://discord.gg/2wDcVGg)

---

## Installation

You can install jolt-server using [npm](https://www.npmjs.com/package/jolt-server).

Install using [npm](https://www.npmjs.com/package/jolt-server):
```bash
npm install --save-dev jolt-server
```
---

## Command Line Usage

To launch the dev server, just run the command `jolt-server`. </br>
By default this will put it into a bare bones web server.

You can add additonal functionality by using cli options.

CLI Options:
- `-p, --port` - sets the port the server will run on. (default: `3000`)
- `-r, --root` - sets the folder that files will be served from. (default: `/`)
- `-f, --file` - sets the fallback file to serve. (default: `index.html`)
- `-l, --live` - sets the server to reload the page when a file is saved.
- `-s, --spa` - sets the server to respond to all routes with the fallback file.

---

## JavaScript Usage

You can use jolt-server in your JavaScript file and pass it the same options as the cli.

**Example:**
```js
import server from "jolt-server";

server({
    port: 3000,
    root: process.cwd(),
    file: "index.html",
    live: true,
    spa: true
});
```

---

## Why?

Jolt Server was developed to provide a easy setup for developing web apps.
Most alternatives use a bunch of dependencies to achieve the desired functionality and as for the case with single page applications, they often dont work for complex routes. Jolt Server solves these problems by not using any dependencies, and making sure that single page applications that utilize push state routing will have no problems being run on this server.

---

## Reporting Issues

If you are having trouble getting something to work with Jolt Server, you can ask in our [discord](https://discord.gg/2wDcVGg) or create a new [Issue](https://github.com/outwalk-studios/jolt-server/issues).

If you find a bug or if something is not working properly, you can report it by creating a new [Issue](https://github.com/outwalk-studios/jolt-server/issues).

If Jolt Server does not fit your needs or is missing a feature you would like to see, let us know! We would greatly appreciate your feedback on it.

You can contact Outwalk Studios directly using `support@outwalkstudios.com`

---

## License
Jolt Server is licensed under the terms of the [**MIT**](https://github.com/outwalk-studios/jolt-server/blob/master/LICENSE) license.