// public/workers/go.worker.js
// Go WASM execution in a Web Worker

let apiBase = "http://localhost:8080";

// Go WASM glue code — distributed with Go, served locally
importScripts("wasm_exec.js");

// Set up stdout/stderr capture before Go runs
let capturedOutput = "";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Polyfills needed by Go's wasm_exec.js
globalThis.process = {
  getuid: () => -1,
  getgid: () => -1,
  cwd: () => "/",
  env: {},
  pid: 1,
};
globalThis.crypto = globalThis.crypto || {};
if (!globalThis.crypto.getRandomValues) {
  globalThis.crypto.getRandomValues = (arr) => {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
    return arr;
  };
}

// stdout/stderr capture via Go's fs.write callback
globalThis.fs = {
  constants: { O_WRONLY: -1, O_RDWR: -1, O_CREAT: -1, O_TRUNC: -1, O_APPEND: -1, O_EXCL: -1 },
  writeSync: (fd, buf) => {
    const text = decoder.decode(buf);
    capturedOutput += text;
    self.postMessage({ type: "stdout", text });
    return buf.length;
  },
  write: (fd, buf, offset, length, position, callback) => {
    const data = buf.subarray(offset, offset + length);
    const text = decoder.decode(data);
    capturedOutput += text;
    self.postMessage({ type: "stdout", text });
    callback(null, length);
  },
  open: (path, flags, mode, callback) => { callback(new Error("file system disabled")); },
  close: (fd, callback) => { callback(null); },
  read: (fd, buf, offset, length, position, callback) => { callback(new Error("not implemented")); },
  stat: (path, callback) => { callback(new Error("not implemented")); },
  lstat: (path, callback) => { callback(new Error("not implemented")); },
  fstat: (fd, callback) => { callback(new Error("not implemented")); },
  mkdir: (path, perm, callback) => { callback(null); },
  readdir: (path, callback) => { callback(null, []); },
  rmdir: (path, callback) => { callback(new Error("not implemented")); },
  unlink: (path, callback) => { callback(new Error("not implemented")); },
  utimes: (path, atime, mtime, callback) => { callback(null); },
  chmod: (path, mode, callback) => { callback(null); },
};

self.onmessage = async (event) => {
  const { type, code, apiUrl } = event.data;
  if (apiUrl) apiBase = apiUrl;

  if (type === "run") {
    capturedOutput = "";

    try {
      // Step 1: Compile Go to WASM via the backend
      const compileResp = await fetch(`${apiBase}/api/v1/compile/go`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: code }),
      });

      if (!compileResp.ok) {
        const err = await compileResp.text();
        self.postMessage({ type: "stderr", text: `Compilation error:\n${err}` });
        self.postMessage({ type: "done" });
        return;
      }

      const wasmBytes = await compileResp.arrayBuffer();

      // Step 2: Run WASM using the standard Go pattern from wasm_exec.js
      const go = new self.Go();

      const result = await WebAssembly.instantiate(wasmBytes, go.importObject);
      go.run(result.instance);

      // Go program exited normally
      self.postMessage({ type: "done" });
    } catch (error) {
      const msg = error.message || String(error);
      if (msg !== "unreachable executed" && msg !== "exit" && !msg.includes("exit status")) {
        self.postMessage({ type: "stderr", text: `Runtime error: ${msg}` });
      }
      self.postMessage({ type: "done" });
    }
  }
};
