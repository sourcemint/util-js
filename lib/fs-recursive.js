
var WRENCH = require("wrench");
var EXEC = require("child_process").exec;
var Q = require("./q");


for (var key in WRENCH) {
    exports[key] = WRENCH[key];
}



exports.osCopyDirRecursive = function(fromPath, toPath) {
    
    var deferred = Q.defer();
    
    
    // TODO: Fix this for ubuntu.
    EXEC("cp -R " + fromPath + "/ " + toPath, function(err, stdout, stderr) {
        if (err) {
            deferred.reject(err);
            return;
        }
        deferred.resolve();
    });
    
    return deferred.promise;

}
