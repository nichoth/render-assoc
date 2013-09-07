var through = require('through');
var parse = require('level-assoc/parse');

module.exports = function (render, types) {
    var streams = {};
    
    render.on('element', function (elem) {
        var key = elem.getAttribute('data-key');
        if (!streams[key]) streams[key] = {};
        Object.keys(types).forEach(function (k) {
            streams[key][k] = types[k]().appendTo(elem);
        });
    });
    
    var p = parse();
    
    var meta = {}, mkeys = {};
    p.on('meta', function (m) {
        meta = m;
        Object.keys(m).forEach(function (key) {
            Object.keys(m[key]).forEach(function (k) {
                var mk = m[key][k][1];
                if (!mkeys[mk]) mkeys[mk] = [];
                mkeys[mk].push(key);
            });
        });
    });
    p.on('augment', function (row, key, stream) {
        if (stream.startKeys && stream.endKeys) {
            var parts = [ stream.startKeys, stream.endKeys ];
            parts[1][4] = {}; // because undefined turns to null in stringify
            render.emit('data', JSON.stringify(parts) + '\n');
        }
    });
    
    p.pipe(through(function (row) {
        var t = row && row.value && row.value.type;
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
