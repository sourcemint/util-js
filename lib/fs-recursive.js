
var WRENCH = require("wrench");

for (var key in WRENCH) {
    exports[key] = WRENCH[key];
}
