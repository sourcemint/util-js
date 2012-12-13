
const ASSERT = require("assert");
const EXEC = require("child_process").exec;
const SPAWN = require("child_process").spawn;
const TERM = require("./term");
const NETUTIL = require("netutil");
const Q = require("./q");
const UTIL = require("./util");


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
		// TODO: See why `sm *` writes `\[0m` to stderr.
	    if (error || (stderr && !(stderr.length === 4 && stderr.charAt(1) === "["))) {
	    	TERM.stderr.writenl("\0red(" + stderr + "\0)");
	        return deferred.reject(new Error("Error running os command: " + command));
	    }
	    return deferred.resolve(stdout);
	});
	return deferred.promise;
}

exports.getEnvPath = function(extra) {
	if (!UTIL.isArrayLike(extra)) extra = [ extra ];
	// TODO: Use different delimiters for different `process.platform`.
	return extra.concat(process.env.PATH.split(":")).join(":");
}

exports.spawnInline = function(command, args, options) {
    options = options || {};
    var deferred = Q.defer();
    try {
	    ASSERT(typeof options.cwd !== "undefined");

	    options.logger.debug("Running: " + command + " " + args.join(" ") + " (cwd: " + options.cwd + ")");

	    var opts = {
	        cwd: options.cwd,
	        env: process.env
	    };
	    if (options.env) {
	    	UTIL.update(opts.env, options.env);
	    }
	    opts.stdio = "inherit";    // NodeJS 0.8+

        var proc = SPAWN(command, args, opts);
        proc.on("error", function(err) {
            return deferred.reject(err);
        });
        proc.on("exit", function(code) {
	        if (code !== 0) {
	            return deferred.reject(new Error("Error running: " + command + " " + args.join(" ") + " (cwd: " + options.cwd + ")"));
	        }
            return deferred.resolve();
        });
        // NodeJS 0.6
        if (/^v0\.6\./.test(process.version)) {
	    	options.logger.warn("For best results use NodeJS 0.8");
            proc.stdout.on("data", function(data) {
                process.stdout.write(data);
            });
            proc.stderr.on("data", function(data) {
                process.stderr.write(data);
            });
            process.stdin.resume();
            process.stdin.on("data", function (chunk) {
                // TODO: For some reason this input gets printed to process.stdout after hitting return.
                proc.stdin.write(chunk);
            });
        }
	} catch(err) {
		return deferred.reject(err);
	}
    return deferred.promise;
}

exports.getTmpPort = function(callback) {
    // @see http://en.wikipedia.org/wiki/Ephemeral_port
    var start = 50000;
    var end = 65000;
    // TODO: Adjust port range based on `process.platform`.
    return NETUTIL.findFreePort(start, end, "localhost", callback);
}
