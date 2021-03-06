global.TextDecoder = require("text-encoding").TextDecoder;
const fs = require("fs");
const loader = require("@assemblyscript/loader/umd/index");

const Benchmark = require("benchmark");
const suite = new Benchmark.Suite();

wasmModule = loader.instantiateSync(fs.readFileSync("./build/untouched.wasm"), {
  env: {
    log: () => {
      const { __getString, __release } = wasmModule.exports;
      str = __getString(strPtr);
      console.log(str);
      __release(strPtr);
    },
  },
});

// the executeRegExp exported function is ex
function executeRegex(regexStr, valueStr, untilNull = false) {
  const {
    executeRegExp,
    __newString,
    __retain,
    __release,
  } = wasmModule.exports;

  // create the regexp
  const regexPtr = __retain(__newString(regexStr));
  const strPtr = __retain(__newString(valueStr));
  executeRegExp(regexPtr, strPtr, untilNull ? -1 : 5);
  __release(regexPtr);
  __release(strPtr);
}

// add tests
suite
  .add("baseline", () => {
    // this test primarily measures the overhead in the wasm / JS interop
    executeRegex("", "");
  })
  .add("character class", () => {
    executeRegex("[a-zA-C0-9J]", "J"); // match char
    executeRegex("[a-zA-C0-9J]", "a"); // match char in range
  })
  .add("concatenation", () => {
    executeRegex("this is a long string", "this is a long string");
  })
  .add("quantifiers", () => {
    executeRegex("a*", "aaaaa");
    executeRegex("a+", "aaaaa");
    executeRegex("a?", "a");
  })
  .add("range quantifiers", () => {
    executeRegex("a{20,30}", "a".repeat(25));
  })
  .add("alternation", () => {
    executeRegex("a|b|c|d|e|f|g", "d");
  })
  .add("multiple regex matches", () => {
    const text =
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
    executeRegex("[a-l]{3}", text, true);
  })
  // add listeners
  .on("cycle", (event) => {
    console.log(String(event.target));
  })
  // run async
  .run({ async: true });
