
const PATH = require("path");
const FS = require("fs");
const WRENCH = require("wrench");
const EXEC = require("child_process").exec;
const Q = require("./q");


for (var key in WRENCH) {
    exports[key] = WRENCH[key];
}


exports.osCopyDirRecursive = function(fromPath, toPath) {

    var deferred = Q.defer();

    if (!PATH.existsSync(toPath)) {
        FS.mkdirSync(toPath);
    }

    // NOTE: This does not copy dir on Ubuntu as it does on OSX: `"cp -R " + fromPath + "/ " + toPath`
    // @see http://superuser.com/questions/215514/in-ubuntu-how-to-copy-all-contents-of-a-folder-to-another-folder
    EXEC('tar pcf - .| (cd "' + toPath + '"; tar pxf -)', {
        cwd: fromPath
    }, function(error, stdout, stderr) {
        if (error || stderr) {
            deferred.reject(new Error(stderr));
            return;
        }
        deferred.resolve();
    });

    return deferred.promise;
}


exports.rmSyncRecursive = function(path) {
    if (FS.statSync(path).isDirectory()) {
        exports.rmdirSyncRecursive(path);
    } else {
        FS.unlinkSync(path);
    }
}

