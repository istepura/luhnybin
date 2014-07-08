var util = require('util');
var Transform = require('stream').Transform;

util.inherits(LuhnFilter, Transform);


function LuhnFilter(options){
    if (!(this instanceof LuhnFilter)){
        return new LuhnFilter(options);
    }
    Transform.call(this, options);
    this._buffer  = '';
    this.state = initstate;
}

var initstate = {
    consumeChar :function(ctx, char){
        var isnum = /^[0-9]+$/i.test(char);

        if (isnum) {
            ctx.state = gatherstate;
            gatherstate.consumeChar(ctx, char);
        }
        else {
            ctx.push(char);
        }
    }
};

var gatherstate = {
    buf : '', 
    consumeChar: function(ctx, char){
        var isnum = /^[0-9]+$/i.test(char);

        if (isnum) {
            this.buf += char;
        }
        else {
            ctx.state = initstate;
            ctx.push(this.buf);
            this.buf = '';
            ctx.state.consumeChar(ctx, char);
        }
    }
};

LuhnFilter.prototype._transform = function (chunk, enc, cb){
    for (var i = 0; i < chunk.length; i++){

        var strchunk = chunk.toString();
        this.state.consumeChar(this, strchunk[i]);
        //console.log(this.state);
    }
    cb();
};


var lf = new LuhnFilter();
process.stdin.setEncoding('utf8');
process.stdin.pipe(lf).pipe(process.stdout);
