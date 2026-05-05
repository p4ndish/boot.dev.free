// public/workers/javascript.worker.js
// JavaScript execution in a Web Worker

let suiteResults = [];

self.onmessage = async (event) => {
  const { type, code, files } = event.data;

  if (type === "run") {
    suiteResults = [];
    const output = [];

    // Set up a synthetic console for capturing
    const consoleProxy = {
      log: (...args) => output.push(args.map(a => String(a)).join(" ") + "\n"),
      error: (...args) => output.push("[error] " + args.map(a => String(a)).join(" ") + "\n"),
      warn: (...args) => output.push("[warn] " + args.map(a => String(a)).join(" ") + "\n"),
      info: (...args) => output.push("[info] " + args.map(a => String(a)).join(" ") + "\n"),
    };

    try {
      // Execute user code in a sandboxed Function scope
      const userFn = new Function("console", code);
      userFn(consoleProxy);

      self.postMessage({ type: "stdout", text: output.join("") });
    } catch (error) {
      self.postMessage({ type: "error", text: String(error.message || error) });
    } finally {
      self.postMessage({ type: "done" });
    }
  }

  if (type === "runWithTests") {
    const output = [];
    const consoleProxy = {
      log: (...args) => output.push(args.map(a => String(a)).join(" ") + "\n"),
      error: (...args) => output.push("[error] " + args.map(a => String(a)).join(" ") + "\n"),
      warn: (...args) => output.push("[warn] " + args.map(a => String(a)).join(" ") + "\n"),
      info: (...args) => output.push("[info] " + args.map(a => String(a)).join(" ") + "\n"),
    };

    suiteResults = [];
    const testSuite = {
      _assert: (condition, message) => {
        if (!condition) throw new Error("Assertion failed: " + (message || ""));
      },
      assertEqual: (actual, expected, msg) => {
        if (actual !== expected) throw new Error(
          `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${msg ? " - " + msg : ""}`
        );
      },
      _results: suiteResults,
    };

    try {
      // Execute code with test helper
      const fullCode = `
const suite = ${JSON.stringify(testSuite)};
const assertEqual = suite.assertEqual;

${code}

if (typeof test_solution === 'function') {
  try {
    test_solution();
    suite._results.push({ passed: true, name: "All tests passed" });
  } catch (e) {
    suite._results.push({ passed: false, name: e.message });
  }
}

self.postMessage({ type: "testResults", results: suite._results });
`;

      const userFn = new Function("console", fullCode);
      userFn(consoleProxy);

      self.postMessage({ type: "stdout", text: output.join("") });
    } catch (error) {
      self.postMessage({ type: "error", text: String(error.message || error) });
    } finally {
      self.postMessage({ type: "done" });
    }
  }
};
