var through = require('through');
var parse = require('level-assoc/parse');

module.exports = function (render, types) {
    var streams = {};
    var metaQueue = [];
    
    render.on('element', function (elem) {
        var key = elem.getAttribute('data-key');
        if (!streams[key]) streams[key] = {};
        Object.keys(types).forEach(function f (k) {
            if (!mkeys) return metaQueue.push(function () { f(k) });
            
            var subrender = streams[key][k] = types[k]();
            
            for (var i = 0; i < mkeys[k].length; i++) {
                var pkey = mkeys[k][i];
                for (var ckey in meta[pkey] || {}) {
                    if (k === meta[pkey][ckey][1]) {
                        var e = elem.querySelector('.' + ckey);
                        if (e) return subrender.appendTo(e);
                    }
                }
            }
            subrender.appendTo(elem);
        });
    });
    
    var p = parse();
    
    var mkeys = null, meta = null;
    p.on('meta', function (m) {
        mkeys = {}, meta = m;
        
        Object.keys(m).forEach(function (key) {
            Object.keys(m[key]).forEach(function (k) {
                var mk = m[key][k][1];
                if (!mkeys[mk]) mkeys[mk] = [];
                mkeys[mk].push(key);
            });
        });
        
        metaQueue.forEach(function (f) { f() });
    });
    p.on('augment', function (row, key, stream) {
        if (stream.startKeys && stream.endKeys) {
            var parts = [ stream.startKeys, stream.endKeys ];
            parts[1][4] = {}; // because undefined turns to null in stringify
            render.emit('data', JSON.stringify(parts) + '\n');
        }
    });
    
    p.pipe(through(function f (row) {
        var t = row && row.value && row.value.type;
        if (!mkeys) return metaQueue.push(function () { f(row) });
        
        var keys = t && mkeys[t];
        if (keys) {
            keys.forEach(function (key) {
                var s = streams[row.value[key]];
                if (s && s[t]) s[t].write(row);
            });
        }
        else render.write(row);
    }));
    return p;
};
