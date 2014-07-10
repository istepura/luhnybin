var LuhnFilter = require('./filter.js').LuhnFilter;

var lf = new LuhnFilter();
process.stdin.setEncoding('utf8');
process.stdin.pipe(lf).pipe(process.stdout);
