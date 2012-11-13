
const WAITFOR = require("waitfor");

for (var key in WAITFOR) {
    exports[key] = WAITFOR[key];
}

// TODO: Deprecate.
exports.makeSerial = exports.makeSerialWaitFor = exports.serial;
exports.makeParallel = exports.makeParallelWaitFor = exports.parallel;
