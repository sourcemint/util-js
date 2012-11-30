
const EXEC = require("child_process").exec;
const TERM = require("./term");
const NETUTIL = require("netutil");
const Q = require("./q");


exports.isSudo = function() {
	if (
		typeof process.env.SUDO_USER === "string" ||
	    typeof process.env.SUDO_UID === "string" ||
	    typeof process.env.SUDO_GID === "string"
	) {
		return true;
	}
	return false;
}

exports.which = function(commandName) {
    var deferred = Q.defer();
    var command = "which " + commandName;
    EXEC(command, function(error, stdout, stderr) {
        if (error || stderr) {
            return deferred.resolve(false);
        }
		var m = stdout.match(/^(.*)\n$/);
		if (!m) {
			return deferred.reject(new Error("Error parsing command path from `which` result [" + stdout + "]"));
		}
        deferred.resolve(m[1]);
    });
    return deferred.promise;
}

exports.exec = function(command) {
	var deferred = Q.defer();
	EXEC(command, function(error, stdout, stderr) {
	    if (error || stderr) {
	    	TERM.stderr.writenl("\0red(" + stderr + "\0)");
	        return deferred.reject(new Error("Error running os command: " + command));
	    }
	    return deferred.resolve(stdout);
	});
	return deferred.promise;
}

exports.getTmpPort = function(callback) {
    // @see http://en.wikipedia.org/wiki/Ephemeral_port
    var start = 50000;
    var end = 65000;
    // TODO: Adjust port range based on `process.platform`.
    return NETUTIL.findFreePort(start, end, "localhost", callback);
}
