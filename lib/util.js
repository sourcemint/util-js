
var UTIL = require("n-util");

for (var key in UTIL) {
    exports[key] = UTIL[key];
}

exports.object.deepDiff = function () {
    var sources = Array.prototype.slice.call(arguments);
    var diff = exports.deepCopy(sources.shift());
    return variadicHelper([diff].concat(sources), function (diff, source) {
        var key;
        for (key in source) {
            if(exports.object.has(source, key)) {
                if(exports.object.has(diff, key)) {
                    if(exports.deepEqual(diff[key], source[key])) {
                        delete diff[key];
                    } else {
                        if(!exports.isArrayLike(diff[key])) {
                            diff[key] = exports.deepDiff(diff[key], source[key]);
                        }
                    }
                }
            }
        }
    });
};

exports.deepDiff = exports.operator('deepDiff', 2, function (target, source) {
    var args = Array.prototype.slice.call(arguments);
    return exports.object.deepDiff.apply(this, args);
});

exports.deepEqual = function(actual, expected) {
    
    // 7.1. All identical values are equivalent, as determined by ===.
    if (actual === expected) {
        return true;

    // 7.2. If the expected value is a Date object, the actual value is
    // equivalent if it is also a Date object that refers to the same time.
    } else if (actual instanceof Date && expected instanceof Date) {
        return actual.getTime() === expected.getTime();

    // 7.3. Other pairs that do not both pass typeof value == "object",
    // equivalence is determined by ==.
    } else if (typeof actual != 'object' && typeof expected != 'object') {
        return actual == expected;

    // XXX specification bug: this should be specified
    } else if (typeof expected == "string" || typeof actual == "string") {
        return expected == actual;

    // 7.4. For all other Object pairs, including Array objects, equivalence is
    // determined by having the same number of owned properties (as verified
    // with Object.prototype.hasOwnProperty.call), the same set of keys
    // (although not necessarily the same order), equivalent values for every
    // corresponding key, and an identical "prototype" property. Note: this
    // accounts for both named and indexed properties on Arrays.
    } else {
        return actual.prototype === expected.prototype && exports.object.eq(actual, expected);
    }
}

/**
 * @param args Arguments list of the calling function
 * First argument should be a callback that takes target and source parameters.
 * Second argument should be target.
 * Remaining arguments are treated a sources.
 *
 * @returns Target
 * @type Object
 */
var variadicHelper = function (args, callback) {
    var sources = Array.prototype.slice.call(args);
    var target = sources.shift();

    sources.forEach(function(source) {
        callback(target, source);
    });

    return target;
};
