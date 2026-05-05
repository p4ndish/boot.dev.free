// public/workers/python.worker.js
// Pyodide-based Python execution in a Web Worker

let pyodide = null;
let ready = false;

// Load Pyodide from CDN
importScripts("https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.js");

async function init() {
  if (pyodide) return;
  pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/",
  });

  // Capture stdout/stderr
  pyodide.setStdout({ batched: (text) => self.postMessage({ type: "stdout", text }) });
  pyodide.setStderr({ batched: (text) => self.postMessage({ type: "stderr", text }) });

  ready = true;
  self.postMessage({ type: "ready" });
}

// Redirect Python's built-in print to our stdout capture
const redirectPrint = `
import sys
class _StdoutStream:
    def write(self, text):
        sys.__stdout__.write(text)
    def flush(self):
        sys.__stdout__.flush()
sys.stdout = _StdoutStream()

import builtins
_original_print = builtins.print
def _captured_print(*args, **kwargs):
    import sys
    sep = kwargs.get('sep', ' ')
    end = kwargs.get('end', '\\n')
    text = sep.join(str(a) for a in args) + end
    sys.__stdout__.write(text)
builtins.print = _captured_print
`;

async function runCode(code, files) {
  if (!pyodide) await init();

  try {
    // Write files to Pyodide's virtual filesystem
    if (files) {
      for (const file of files) {
        if (!file.isHidden) {
          pyodide.FS.writeFile(`/${file.name}`, file.content);
        }
      }
    }

    // Check if code is async
    const isAsync = code.includes("async def ") || code.includes("await ");
    const fullCode = redirectPrint + "\n" + code;

    const result = isAsync
      ? await pyodide.runPythonAsync(fullCode)
      : pyodide.runPython(fullCode);

    // Print last expression result (REPL-like behavior)
    if (result !== undefined && result !== null) {
      try {
        const strResult = pyodide.runPython(`repr(${JSON.stringify(result)})`);
        self.postMessage({ type: "stdout", text: String(strResult) + "\n" });
      } catch {}
    }
  } catch (error) {
    self.postMessage({ type: "error", text: String(error.message || error) });
  } finally {
    self.postMessage({ type: "done" });
  }
}

self.onmessage = async (event) => {
  const { type, code, files } = event.data;
  if (type === "init") await init();
  if (type === "run") await runCode(code, files);
  if (type === "installPackage") {
    await pyodide.loadPackage(event.data.package);
    self.postMessage({ type: "packageReady", package: event.data.package });
  }
};
