
const ASSERT = require("assert");
const PATH = require("path");
const FS = require("fs");
const URL = require("url");
const HTTP = require("http");
const HTTPS = require("https");
const Q = require("./q");
const WRENCH = require("wrench");


var UrlProxyCache = exports.UrlProxyCache = function(path, options) {
    this.path = path;
    this.options = options;
    ASSERT(typeof options.ttl !== "undefined", "'options.ttl' required!");
}

UrlProxyCache.prototype.get = function(url, options) {
    var self = this;

    options = options || {};

    var urlInfo = self.parseUrl(url);

    return ensureParentPathExists(urlInfo.cachePath).then(function() {
        
        function handleResponse(response) {
            
            response.cachePath = urlInfo.cachePath;
            
            if (response.status === 301 || response.status === 302) {
                // Redirect.
                return self.get(response.headers.location, options);
            } else {
                return response;
            }
        }

        var metaPath = urlInfo.cachePath + "~~meta";
        
        return getPathMtime(metaPath).then(function(mtime) {

            var ttl = self.options.ttl;
            if (typeof options.ttl !== "undefined" && options.ttl >= -1) {
                ttl = options.ttl;
            }
            if (mtime && ttl != -1 && (ttl === 0 || ((mtime + ttl) > new Date().getTime()))) {

                function loadCached() {
                    var deferred = Q.defer();
                    function fail(err) {
                        if (!deferred) {
                            console.error(err.stack);
                            return;
                        }
                        deferred.reject(err);
                        deferred = null;
                    }
                    
                    FS.readFile(metaPath, function(err, meta) {
                        if (err) {
                            fail(err);
                            return;
                        }
                        try {
                            meta = JSON.parse(meta);
                        } catch(err) {
                            fail(err);
                            return;
                        }
                        if (meta.status !== 200 && meta.status !== 304) {
                            deferred.resolve(meta);
                            deferred = null;
                            return;
                        }
                        if (options.loadBody === false) {
                            deferred.resolve(meta);
                            deferred = null;
                            return;
                        }
                        FS.readFile(urlInfo.cachePath, function(err, data) {
                            if (err) {
                                fail(err);
                                return;
                            }
                            meta.body = data;
                            deferred.resolve(meta);
                            deferred = null;
                        });
                    });
    
                    return deferred.promise;
                }
                
                return loadCached().then(function(response) {
                    return handleResponse(response);
                })
            }
            else {

                // TODO: If download already in progress attach to first download.

                var time = new Date().getTime();
                var tmpPath = urlInfo.cachePath + "~" + time;
                var metaTmpPath = metaPath + "~" + time;
                var meta = {};
                
                function writeMeta(callback) {
                    FS.writeFile(metaTmpPath, JSON.stringify(meta), function(err) {
                        if (err) {
                            callback(err);
                            return;
                        }
                        FS.rename(metaTmpPath, metaPath, function(err) {
                            if (err) {
                                callback(err);
                                return;
                            }
                            callback(null);
                        })
                    });
                }

                function makeRequest() {
                    var deferred = Q.defer();
                    function fail(err) {
                        if (!deferred) {
                            console.error(err.stack);
                            return;
                        }
                        deferred.reject(err);
                        deferred = null;
                    }

                    var done = Q.ref();
                    
                    var existingMeta = false;

                    // If we have meta data & file exists we send a HEAD request first to see if
                    // anything has changed.
                    done = Q.when(done, function() {
                        var wait = Q.defer();

                        PATH.exists(metaPath, function(exists) {
                            if (!exists) {
                                wait.resolve();
                                return;
                            }
                            
                            FS.readFile(metaPath, function(err, data) {
                                if (err) {
                                    fail(err);
                                    return;
                                }
                                existingMeta = JSON.parse(data);
                          
                                if (existingMeta.headers.etag) {
                                    // We have an Etag so we just send a 'If-None-Match' header below.
                                    wait.resolve();              
                                    return;
                                }

                                var request = ((urlInfo.protocol==="https:")?HTTPS:HTTP).request({
                                    host: urlInfo.host,
                                    port: urlInfo.port || ((urlInfo.protocol==="https:")?443:80),
                                    path: urlInfo.path,
                                    method: "HEAD"
                                }, function(res) {
                                    res.on("end", function() {
                                        if (res.statusCode === 200) {
                                            var same = true;
                                            if (typeof res.headers["content-length"] !== "undefined" && res.headers["content-length"] !== existingMeta.headers["content-length"]) {
                                                same = false;
                                            }
                                            if (typeof res.headers["content-disposition"] !== "undefined" && res.headers["content-disposition"] !== existingMeta.headers["content-disposition"]) {
                                                same = false;
                                            }
                                            // TODO: Check some other fields like 'Etag'?
                                            if (same) {
                                                existingMeta.status = 304;
                                                if (options.loadBody === false) {
                                                    deferred.resolve(existingMeta);
                                                    return;
                                                }
                                                FS.readFile(urlInfo.cachePath, function(err, data) {
                                                    if (err) {
                                                        fail(err);
                                                        return;
                                                    }
                                                    existingMeta.body = data;
                                                    deferred.resolve(existingMeta);
                                                    deferred = null;
                                                });
                                            } else {
                                                wait.resolve();
                                            }
                                        } else {
                                            wait.resolve();
                                        }
                                    });
                                });
                                request.on("error", function(err) {
                                    // May not want to fail here but try again or make GET request?
                                    fail(err);
                                });
                                request.end();
                            });
                        });
                        return wait.promise;
                    });

                    Q.when(done, function() {

                        var writeStream = FS.createWriteStream(tmpPath);
                        writeStream.on("error", fail);
                        writeStream.on("close", function() {
                            if (deferred) {
                                // Success.
                                writeMeta(function(err) {
                                    if (err) {
                                        fail(err);
                                        return;
                                    }
                                    FS.rename(tmpPath, urlInfo.cachePath, function(err) {
                                        if (err) {
                                            fail(err);
                                            return;
                                        }
                                        if (options.loadBody === false) {
                                            deferred.resolve(meta);
                                            deferred = null;
                                            return;
                                        }
                                        FS.readFile(urlInfo.cachePath, function(err, data) {
                                            if (err) {
                                                fail(err);
                                                return;
                                            }
                                            meta.body = data;
                                            deferred.resolve(meta);
                                            deferred = null;
                                        });
                                    });
                                });
                            } else {
                                // We had an error.
                                FS.unlink(tmpPath, function(err) {
                                    if (err) console.error(err.stack);
                                });
                            }
                        });
                        
                        var headers = {};
                        if (existingMeta && existingMeta.headers.etag) {
                            headers["If-None-Match"] = existingMeta.headers.etag;
                        }
                        var request = ((urlInfo.protocol==="https:")?HTTPS:HTTP).request({
                            host: urlInfo.host,
                            port: urlInfo.port || ((urlInfo.protocol==="https:")?443:80),
                            path: urlInfo.path,
                            method: "GET",
                            headers: headers
                        }, function(res) {

                            if (res.statusCode == 304) {
                                existingMeta.status = 304;
                                if (options.loadBody === false) {
                                    deferred.resolve(existingMeta);
                                    deferred = null;
                                    writeStream.end();
                                    return;
                                }
                                FS.readFile(urlInfo.cachePath, function(err, data) {
                                    if (err) {
                                        fail(err);
                                        return;
                                    }
                                    existingMeta.body = data;
                                    deferred.resolve(existingMeta);
                                    deferred = null;
                                    writeStream.end();
                                });
                                return;
                            }

                            meta.status = res.statusCode;
                            meta.headers = res.headers;
                            
                            if (res.statusCode !== 200) {
                                writeMeta(function(err) {
                                    if (err) {
                                        fail(err);
                                        return;
                                    }
                                    deferred.resolve(meta);
                                    deferred = null;
                                    writeStream.end();
                                });
                                return;
                            }
                            res.on("data", function(chunk) {
                                writeStream.write(chunk, "binary");
                            });
                            res.on("end", function() {
                                writeStream.end();
                            });
                        });
                        request.on("error", fail);
                        request.end();                        
                        
                    });
                    
                    return deferred.promise;
                }

                return makeRequest().then(function(response) {
                    return handleResponse(response);
                });
            }
        });
    });
}

UrlProxyCache.prototype.parseUrl = function(url) {
    var urlInfo = URL.parse(url);
    urlInfo.cachePath = PATH.join(this.path, urlInfo.protocol.replace(/:$/, ""), urlInfo.hostname, urlInfo.path);
    return urlInfo;
}


function ensureParentPathExists(path) {
    var deferred = Q.defer();
    PATH.exists(PATH.dirname(path), function(exists) {
        if (exists) {
            deferred.resolve();
            return;
        }
        try {
            WRENCH.mkdirSyncRecursive(PATH.dirname(path), 0755);
            deferred.resolve();
        } catch(err) {
            deferred.reject(err);
        }
    });
    return deferred.promise;
}

function getPathMtime(path) {
    var deferred = Q.defer();
    PATH.exists(path, function(exists) {
        if (!exists) {
            deferred.resolve(false);
            return;
        }
        FS.stat(path, function(err, stats) {
            deferred.resolve(stats.mtime.getTime());
        });
    });
    return deferred.promise;
}

