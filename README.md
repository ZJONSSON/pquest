pre-release. 

pquest is a wrapper around the popular [request](https://www.npmjs.org/package/request) client that provides the following out-of-the-box:

#### Request Promisified
The pquest returns a promise on the results, using bluebird.  Streaming is not available and all results will be buffered resolve the promise once fully loaded.   The only way to get result back is to append a `.then(..)` function to the pquest object.

#### Caching
pquest can initialized with a unique key and caching object (both optional) to cache cookies across different instances of the pquest.  The caching object should supply the following promisified functions `.get(key)` and `.set(key,value)`.  The cache is only read upon initilization and a regular cookie jar is used to maintain the cookies after that.   After each request, the contents of the jar are saved into the cache.

Prequest is initiated by the following signature (only key is required):
```js
var pquest = require('pquest')([key],[cache])
```

#### Injector function
A custom function can be injected into the pquest options (as property `fn`) to validate the response (and possible take action) before the results are used to resolve the promise.  This function will be called with the `res` of request as a first variable and a `retry` function as a second variable, which can be called if/when the original request should be retried. A typical use-case would be to check if we are 'logged in' to the site before returning the results.  If the reply indicates we are not logged in, we can execute the requests necessary to log in and subsequently retry our original request - whose results will to resolve the original promise.

If retry fails, the injector function will be called again.  By default, retry will only be called twice in a row before erroring.   Custom value for `maxRetries` can be specified in the parameters passed to pquest.

Example:

```js
// We begin by defining the injected function
function validateLogin(res,retry) {
  // If we are not unauthorized, we simply pass on the results
  if (res.statusCode !== 401) return res;

  // otherwise we try to log-in
  return pquest({url: 'http://testsite/login', form: {username:'zjonsson',password:'abc123',method:'POST'})
    .then(retry);
}

// Now we can send a request knowing we will be logged in, if we aren't already
pquest({url:'http://testsite/myaccount',fn:validateLogin})
  .then(console.log);
```

