# render-assoc

render associative data from
[level-assoc](https://npmjs.org/package/level-assoc)
with [hyperkey](https://npmjs.org/package/hyperkey)
for live server+client rendering of associative data

# example

In the browser, just load [hyperkey](https://npmjs.org/package/hyperkey)
render modules and specify nested rendering sub-components. In this case,
each hackerspace has a nested collection of hackers:

``` js
var shoe = require('shoe');
var sock = shoe('/sock');
var rassoc = require('render-assoc');

var render = require('./render/hackerspace.js')();

render.pipe(sock).pipe(rassoc(render, {
    hacker: require('./render/hacker.js')
}));

render.appendTo('#hackerspaces');
```

The [associations](https://npmjs.org/package/level-assoc) on the server
server-side are:

``` js
var level = require('level-test')();
var sub = require('level-sublevel');
var db = sub(level('hyperkey-example.db', { valueEncoding: 'json' }));
var assoc = require('level-assoc')(db);

assoc.add('hackerspace')
    .hasMany('hackers', [ 'type', 'hacker' ])
    .hasMany('tools', [ 'type', 'tool' ])
;
assoc.add('hacker')
    .hasMany('projects', [ 'type', 'project' ])
    .hasMany('usage', [ 'type', 'usage' ])
;
assoc.add('tool')
    .hasMany('usage', [ 'type', 'usage' ])
;

module.exports = assoc;
```

we can write a simple server that uses `assoc.track()` to plumb up reactive live
updates over websockets:

``` js
var http = require('http');
var ecstatic = require('ecstatic')(__dirname + '/static');
var trumpet = require('trumpet');
var fs = require('fs');

var assoc = require('./data.js');
var render = require('./render/hackerspace.js');

var server = http.createServer(function (req, res) {
    if (req.url === '/') {
        var tr = trumpet();
        var q = assoc.list('hackerspace');
        
        var elem = tr.select('#hackerspaces');
        elem.setAttribute('data-start', q.startKey);
        elem.setAttribute('data-end', q.endKey);
        
        q.pipe(render()).pipe(elem.createWriteStream());
        readStream('index.html').pipe(tr).pipe(res);
    }
    else ecstatic(req, res);
});
server.listen(5000);

var shoe = require('shoe');
var sock = shoe(function (stream) {
    stream.pipe(assoc.track()).pipe(stream);
});
sock.install(server, '/sock');

function readStream (file) {
    return fs.createReadStream(__dirname + '/static/' + file);
}
```

And the shared [hyperkey](https://npmjs.org/package/hyperkey) rendering code and
html looks like:

``` html
<div class="hacker">
  <i class="name"></i>
</div>
```

``` js
var hyperkey = require('hyperkey');
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/hacker.html');

module.exports = function () {
    return hyperkey(html, function (row) {
        return { '.name': row.name };
    });
};
```

``` html
<div class="hackerspace">
  <h1 class="name"></h1>
  <div class="hackers"></div>
</div>
```

``` js
var hyperkey = require('hyperkey');
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/hackerspace.html');
var hacker = require('./hacker.js');

module.exports = function () {
    return hyperkey(html, function (row) {
        return {
            '.name': row.name,
            '.hackers': (function (stream) {
                return {
                    'data-start': stream.startKey,
                    'data-end': stream.endKey,
                    _html: stream.pipe(hacker())
                };
            })(row.hackers())
        };
    });
};
```

Compile the browser code with [browserify](http://browserify.org)
and [brfs](https://npmjs.org/package/brfs) and then your nested collections will
automatically update as the data changes on the server while preserving
server-side rendering!

# methods

``` js
var rassoc = require('render-assoc');
```

## rassoc(render, subRenderers)

Create a writable stream for `assoc.track()` data to be written to across a
websocket from a
[hyperkey](https://npmjs.org/package/hyperkey) `render` function and an object
of `subRenders` mapping assocation types to sub-collection render functions.

In a later release this will be more generalized to account for multiple render
targets through the same stream.

# install

With [npm](https://npmjs.org) do:

```
npm install render-assoc
```

# license

MIT
