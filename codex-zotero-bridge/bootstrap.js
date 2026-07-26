/* global Zotero, Components */

var CodexZoteroBridge = {
  server: null,
  port: 23120,
  host: "127.0.0.1",
  version: "0.1.0",

  log(message) {
    try {
      const file = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      file.initWithPath("C:\\tmp\\codex-zotero-bridge.log");
      const stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
        .createInstance(Components.interfaces.nsIFileOutputStream);
      stream.init(file, 0x02 | 0x08 | 0x10, 0o644, 0);
      const line = `${new Date().toISOString()} ${message}\n`;
      stream.write(line, line.length);
      stream.close();
    } catch (err) {
      try {
        Zotero.debug(`Codex Zotero Bridge log failed: ${err}`);
      } catch (_) {}
    }
  },

  async startup() {
    this.log("startup called");
    await this.startServer();
  },

  async shutdown() {
    this.log("shutdown called");
    await this.stopServer();
  },

  async startServer() {
    if (this.server) {
      return;
    }
    this.log("startServer begin");
    const serverSocket = Components.classes["@mozilla.org/network/server-socket;1"]
      .createInstance(Components.interfaces.nsIServerSocket);
    serverSocket.init(this.port, true, -1);
    this.server = serverSocket;
    const listener = {
      onSocketAccepted: (socket, transport) => {
        this.handleConnection(transport).catch((err) => {
          Zotero.logError(err);
        });
      },
      onStopListening: () => {},
    };
    serverSocket.asyncListen(listener);
    this.log("server listening");
    Zotero.debug(`Codex Zotero Bridge listening on ${this.host}:${this.port}`);
  },

  async stopServer() {
    if (!this.server) {
      return;
    }
    this.server.close();
    this.server = null;
  },

  async handleConnection(transport) {
    const input = transport.openInputStream(0, 0, 0);
    const output = transport.openOutputStream(0, 0, 0);
    const requestText = await this.readRequest(input);
    const response = await this.route(requestText);
    output.write(response, response.length);
    output.close();
    input.close();
  },

  readRequest(input) {
    return new Promise((resolve) => {
      const sis = Components.classes["@mozilla.org/scriptableinputstream;1"]
        .createInstance(Components.interfaces.nsIScriptableInputStream);
      sis.init(input);
      let data = "";
      const readMore = () => {
        try {
          const available = sis.available();
          if (available > 0) {
            data += sis.read(available);
            if (data.includes("\r\n\r\n")) {
              const contentLength = this.contentLength(data);
              const body = data.split("\r\n\r\n", 2)[1] || "";
              if (body.length >= contentLength) {
                resolve(data);
                return;
              }
            }
          }
        } catch (_) {
          resolve(data);
          return;
        }
        Zotero.Promise.delay(10).then(readMore);
      };
      readMore();
    });
  },

  contentLength(requestText) {
    const match = requestText.match(/Content-Length:\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  },

  async route(requestText) {
    try {
      const [head, body = ""] = requestText.split("\r\n\r\n", 2);
      const requestLine = head.split("\r\n")[0] || "";
      const [method, path] = requestLine.split(" ");

      if (method === "GET" && path === "/status") {
        return this.jsonResponse(200, {
          ok: true,
          plugin: "codex-zotero-bridge",
          version: this.version,
        });
      }

      if (method === "OPTIONS") {
        return this.jsonResponse(200, { ok: true });
      }

      if (method === "POST" && path === "/get-item-collections") {
        const payload = JSON.parse(body || "{}");
        return this.jsonResponse(200, await this.getItemCollections(payload));
      }

      if (method === "POST" && path === "/add-items-to-collection") {
        const payload = JSON.parse(body || "{}");
        return this.jsonResponse(200, await this.addItemsToCollection(payload));
      }

      return this.jsonResponse(404, { ok: false, error: "not_found" });
    } catch (err) {
      Zotero.logError(err);
      return this.jsonResponse(500, { ok: false, error: String(err) });
    }
  },

  jsonResponse(status, payload) {
    const body = JSON.stringify(payload);
    const statusText = status === 200 ? "OK" : status === 404 ? "Not Found" : "Error";
    return [
      `HTTP/1.1 ${status} ${statusText}`,
      "Content-Type: application/json; charset=utf-8",
      "Access-Control-Allow-Origin: *",
      "Access-Control-Allow-Headers: Content-Type",
      "Access-Control-Allow-Methods: GET, POST, OPTIONS",
      `Content-Length: ${body.length}`,
      "Connection: close",
      "",
      body,
    ].join("\r\n");
  },

  async getItemByKey(itemKey) {
    return await Zotero.Items.getByLibraryAndKeyAsync(
      Zotero.Libraries.userLibraryID,
      itemKey
    );
  },

  async getCollectionByKey(collectionKey) {
    const collections = await Zotero.Collections.getByLibraryAndKeyAsync(
      Zotero.Libraries.userLibraryID,
      collectionKey
    );
    return collections || null;
  },

  itemCollectionKeys(item) {
    if (typeof item.getCollections === "function") {
      return item.getCollections().map((collectionID) => {
        const collection = Zotero.Collections.get(collectionID);
        return collection ? collection.key : null;
      }).filter(Boolean);
    }
    return [];
  },

  async getItemCollections(payload) {
    const itemKeys = Array.isArray(payload.itemKeys) ? payload.itemKeys : [];
    const items = [];
    const notFound = [];
    for (const itemKey of itemKeys) {
      const item = await this.getItemByKey(itemKey);
      if (!item) {
        notFound.push(itemKey);
        continue;
      }
      items.push({ itemKey, collections: this.itemCollectionKeys(item) });
    }
    return { ok: true, items, notFound };
  },

  async addItemsToCollection(payload) {
    const collectionKey = payload.collectionKey;
    const itemKeys = Array.isArray(payload.itemKeys) ? payload.itemKeys : [];
    const collection = await this.getCollectionByKey(collectionKey);
    if (!collection) {
      return { ok: false, collectionKey, added: [], alreadyPresent: [], notFound: [], errors: ["collection_not_found"] };
    }

    const added = [];
    const alreadyPresent = [];
    const notFound = [];
    const errors = [];

    for (const itemKey of itemKeys) {
      try {
        const item = await this.getItemByKey(itemKey);
        if (!item) {
          notFound.push(itemKey);
          continue;
        }
        const keys = this.itemCollectionKeys(item);
        if (keys.includes(collectionKey)) {
          alreadyPresent.push(itemKey);
          continue;
        }
        if (typeof item.addToCollection === "function") {
          item.addToCollection(collection.id);
        } else if (typeof collection.addItem === "function") {
          collection.addItem(item.id);
        } else {
          throw new Error("No supported Zotero collection-add method found");
        }
        await item.saveTx();
        added.push(itemKey);
      } catch (err) {
        Zotero.logError(err);
        errors.push({ itemKey, error: String(err) });
      }
    }

    return { ok: errors.length === 0, collectionKey, added, alreadyPresent, notFound, errors };
  },
};

function install() {}

async function startup(data, reason) {
  await CodexZoteroBridge.startup(data, reason);
}

async function shutdown(data, reason) {
  await CodexZoteroBridge.shutdown(data, reason);
}

function uninstall() {}
