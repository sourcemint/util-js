
const UTIL = require("sourcemint-util-js/lib/util");
const ERROR = require("sourcemint-util-js/lib/error");


exports.main = function(callback) {

	var diff = UTIL.deepDiff({
		version: "1.1.8",
		var2: "val2",
		var4: [ "val5", "val6", 6, 7 ]
	}, {
		version: "1.1.14",
		var1: "val1",
		var3: [ "val3", 4 ],
		var4: [ "val5", 6 ]
	});

	// { version: '1.1.8', var2: 'val2', var4: [ 'val6', 7 ] }
	console.log("diff", diff);

}


if (require.main === module) {
	exports.main(function(err) {
		if (err) return ERROR.exitProcessWithError(err);
		process.exit(0);
	});
}
