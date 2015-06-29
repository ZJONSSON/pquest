var Promise = require('bluebird'),
    request = require('request'),
    prequest = Promise.promisify(request),
    tough = require('request/node_modules/tough-cookie');

var defaultHeaders = {
  'accept':'application/json, text/javascript, */*; q=0.01',
  'accept-encoding':'gzip',
  'accept-language:en-US':'en;q=0.8,is;q=0.6',
  'cache-control':'no-cache',
  'pragma':'no-cache',
  'user-agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36'
};

module.exports = function(key,cache) {
  var jar = Promise.resolve(request.jar());
  cache = cache || {};

  var headers = cache.headers || defaultHeaders;

  if (cache.cache) {
    jar = cache.cache.get(key)
      .then(function(d) {
        d = JSON.parse(d.data);
  
        var j = request.jar();
        j._jar.store.idx = d;
    
        Object.keys(d).forEach(function(a) {
          Object.keys(d[a] || {}).forEach(function(b) {
            Object.keys(d[a][b]).forEach(function(c) {
              var g = d[a][b][c];
              g.creation = (g.creation && new Date(g.creation)) || new Date();
              g.lastAccessed = new Date(d.lastAccessed || new Date());
              g.expires = (g.expires && new Date(g.expires)) || new Date(2100,1,1);
              g.__proto__ = tough.Cookie.prototype;
            });
          });
        });
        return j;
      })
      .catch(function() {
        return request.jar();
      });
  }

  function pquest(req) {
    if (typeof req === 'string')
      req = {url:req};

    function retry() {
      req.retries = (req.retries || 0) +1;
      if (req.retries > (req.maxRetries || 2)) throw 'maximum retries';
      return pquest(req);
    }

    return jar.then(function(j) {
      req.jar = j;
      req.gzip = true;
      req.followRedirects = true;
      req.method = req.method || 'GET';

      // Apply default headers      
      req.headers = req.headers || {};
      for (var key in headers)
        req.headers[key] = req.headers[key] || headers[key];

      req.headers = headers;
      return prequest(req);
    })
    .spread(function(res,d) {
      return (req.fn) ? req.fn(res,retry) : d;
    })
    .then(function(d) {
      if (cache.cache)
        cache.cache.set(key,JSON.stringify(req.jar._jar.store.idx));
      return d;
    });
  }

  return pquest;
};

