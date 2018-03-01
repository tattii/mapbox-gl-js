'use strict';

const st = require('st');
const http = require('http');
const path = require('path');

module.exports = function (implementation) {
    const integrationMount = st({path: path.join(__dirname, '..'), url: '/'});
    const nodeModulesPath = path.join(__dirname,
            implementation === 'native' ? '../../../../node_modules' : '../../../node_modules');
    const nodeModulesMount = st({path: nodeModulesPath, url: '/node_modules'});
    const server = http.createServer((req, res) => {
        return nodeModulesMount(req, res, () => { return integrationMount(req, res); });
    });

    return {
        listen: function (callback) {
            server.listen(2900, callback);
        },

        close: function (callback) {
            server.close(callback);
        },
    };
};
