// public/workers/go.worker.js
// Go WASM execution in a Web Worker
// The API URL is passed from the main thread for correct routing

let goWasmInstance = null;
let apiBase = "http://localhost:8080";

// Go WASM glue code — shipped with Go distribution, served locally
importScripts("wasm_exec.js");

self.onmessage = async (event) => {
  const { type, code, apiUrl } = event.data;
  if (apiUrl) apiBase = apiUrl;

  if (type === "run") {
    try {
      // Compile Go to WASM via the backend
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

      // Execute WASM
      const go = new self.Go();
      go.importObject.gojs = { "syscall/js.finalizeRef": () => {} };

      try {
        const { instance } = await WebAssembly.instantiate(wasmBytes, go.importObject);
        goWasmInstance = instance;

        const fs = go.importObject["syscall/js"]?.fs || {};
        if (fs.writeSync) {
          const origWrite = fs.writeSync.bind(fs);
          fs.writeSync = (fd, buf) => {
            if (fd === 1 || fd === 2) {
              const text = new TextDecoder().decode(buf);
              self.postMessage({ type: "stdout", text });
              return buf.length;
            }
            return origWrite(fd, buf);
          };
        }

        await go.run(instance);
        self.postMessage({ type: "done" });
      } catch (error) {
        self.postMessage({ type: "stderr", text: `Runtime error: ${error.message}` });
        self.postMessage({ type: "done" });
      }
    } catch (error) {
      self.postMessage({ type: "stderr", text: `Error: ${error.message}` });
      self.postMessage({ type: "done" });
    }
  }
};
