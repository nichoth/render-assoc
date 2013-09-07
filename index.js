var through = require('through');
var parse = require('level-assoc/parse');

module.exports = function (render, types) {
    var streams = {};
    
    render.on('element', function (elem) {
        var key = elem.getAttribute('data-key');
        streams[key] = {};
        Object.keys(types).forEach(function (k) {
            streams[key][k] = types[k]().appendTo(elem);
        });
    });
    
    var p = parse();
    var meta = {};
    p.on('meta', function (m) {
        Object.keys(m).forEach(function (key) {
            Object.keys(m[key]).forEach(function (k) {
                var mk = m[key][k][1];
                if (!meta[mk]) meta[mk] = [];
                meta[mk].push(key);
            });
        });
    });
    
    p.pipe(through(function (row) {
        var t = row && row.value && row.value.type;
        var keys = t && types[t] && meta[t];
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
