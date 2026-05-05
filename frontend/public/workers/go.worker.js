// public/workers/go.worker.js
// Go WASM execution in a Web Worker
// Requires: Go compilation endpoint to return WASM binary

let goWasmInstance = null;
let ready = false;

// The Go "wasm_exec.js" glue code is loaded from CDN
importScripts("https://cdn.jsdelivr.net/npm/golang-wasm-exec@latest/wasm_exec.js");

self.onmessage = async (event) => {
  const { type, code } = event.data;

  if (type === "run") {
    // Step 1: Send code to compilation endpoint
    try {
      const compileResp = await fetch("/api/v1/compile/go", {
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

      // Step 2: Execute WASM
      const go = new self.Go();

      // Capture stdout/stderr
      let stdoutBuffer = "";
      go.importObject.gojs = {
        "syscall/js.finalizeRef": () => {},
      };

      const stdoutWrite = (data) => {
        const text = new TextDecoder().decode(data);
        stdoutBuffer += text;
        self.postMessage({ type: "stdout", text });
      };

      try {
        const { instance } = await WebAssembly.instantiate(wasmBytes, go.importObject);
        goWasmInstance = instance;

        // Set up IO
        const fs = go.importObject["syscall/js"]?.fs || {};
        if (fs.writeSync) {
          const origWrite = fs.writeSync.bind(fs);
          fs.writeSync = (fd, buf) => {
            if (fd === 1 || fd === 2) {
              stdoutWrite(buf);
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
