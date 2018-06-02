const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const mime = require('mime');
const {transform} = require('sucrase');

fileCache = {};

function serveFile(filename, res) {
    res.setHeader('Content-Type', mime.getType(path.extname(filename)));
    res.writeHead(200);

    if (filename in fileCache) {
        res.end(fileCache[filename]);
        return;
    }

    if (path.extname(filename) === '.js') {
        const now = Date.now();
        const src = fs.readFileSync(filename, 'utf8');

        // rewrite imports of node modules to be imports from /node_modules/<module_name>
        const code = src.replace(/from\s+\"([^\"\.\/][^\"]+)\"/g, (match, group1, offset, string) => {
            return `from "/node_modules/${group1}"`;
        });

        const compiledCode =  transform(code, {transforms: ["flow", "jsx"]});
        const elapsed = Date.now() - now;
        res.end(compiledCode);
        fileCache[filename] = compiledCode;
        console.log(filename + ` [${elapsed}ms]`);
    } else {
        const data = fs.readFileSync(filename);
        res.end(data);
        console.log(filename);
    }
}

nodeModulesCache = {};

function getCode(modName) {
    // modules are bundled in the following way
    // ./node_modules/.bin/browserify --node --standalone require --debug ./node_modules/react/index.js > react.js
    if (modName in nodeModulesCache) {
        console.log(`loading ${modName} from cache`);
        return nodeModulesCache[modName];
    } else {
        const start = Date.now();
        const code = fs.readFileSync(path.join(__dirname, modName + ".js"), "utf8");

        // run the module so we know what it's exporting
        const func = new Function("module", "exports", code);
        const _module = {exports: {}};
        func(_module, _module.exports);
        const _exports = Object.keys(_module.exports);

        const tranformedCode = [
            // define variables that commonjs modules expect
            "const process = {env: {}};",
            "const exports = {};",
            "const module = {exports};",

            // the module itself
            code,

            // ES6 style export
            ..._exports.map(name => `const ${name} = module.exports.${name};`),
            `export {${_exports.join(",")}};`,
        ].join("\n");

        const elapsed = Date.now() - start;
        console.log(`loading ${modName} [${elapsed}ms]`);

        nodeModulesCache[modName] = tranformedCode;
        return tranformedCode;
    }
}

http.createServer((req, res) => {
    const pathname = url.parse(req.url).pathname;
    const filename = path.join(__dirname, 'public', pathname);

    if (filename in fileCache) {
        res.setHeader('Content-Type', mime.getType(path.extname(filename)));
        res.writeHead(200);
        res.end(fileCache[filename]);
        return;
    } else if (filename + '.js' in fileCache) {
        res.setHeader('Content-Type', mime.getType('js'));
        res.writeHead(200);
        res.end(fileCache[filename + '.js']);
        return;
    }

    if (fs.existsSync(filename)) {
        serveFile(filename, res);
    } else if (path.extname(filename) === '' && fs.existsSync(filename + '.js')) {
        serveFile(filename + '.js', res);
    } else if (pathname.startsWith('/node_modules')) {
        const modName = path.basename(pathname);

        res.setHeader('Content-Type', mime.getType("js"));
        res.writeHead(200);
        res.end(getCode(modName));
    } else {
        res.writeHead(404);
        res.end();
    }
}).listen(8080);

console.log('Listening on :8080');
