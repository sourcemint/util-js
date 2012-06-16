
var PATH = require("path");
var FS = require("fs");
var WRENCH = require("wrench");
var EXEC = require("child_process").exec;
var Q = require("./q");


for (var key in WRENCH) {
    exports[key] = WRENCH[key];
}



exports.osCopyDirRecursive = function(fromPath, toPath) {
    var deferred = Q.defer();

    if (!PATH.existsSync(toPath)) {
        FS.mkdirSync(toPath);
    }

    if (process.platform == "win32") {
        WRENCH.copyDirRecursive(fromPath, toPath, function(err) {
            if (err) {
                deferred.reject(err);
                return;
            }
            deferred.resolve();
        });
    } else {
        // NOTE: This does not copy dir on Ubuntu as it does on OSX: `"cp -R " + fromPath + "/ " + toPath`
        // @see http://superuser.com/questions/215514/in-ubuntu-how-to-copy-all-contents-of-a-folder-to-another-folder
        EXEC("tar pcf - .| (cd " + toPath + "; tar pxf -)", {
            cwd: fromPath
        }, function(err, stdout, stderr) {
            if (err) {
                deferred.reject(err);
                return;
            }
            deferred.resolve();
        });
    }
    
    return deferred.promise;

}

