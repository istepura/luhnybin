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
    enter : function(ctx, char){
        ctx.state = this
        this.consumeChar(ctx, char);
    },
    consumeChar :function(ctx, char){
        var isnum = /^[0-9]+$/i.test(char);

        if (isnum) {
            ctx.enterState('gather', char);
        }
        else {
            ctx.push(char);
        }
    }
};

var gatherstate = {
    buf : '', 
    enter : function(ctx, char){
        ctx.state = this
        this.consumeChar(ctx, char);
    },
    consumeChar: function(ctx, char){
        var isnum = /^[0-9]+$/i.test(char);

        if (isnum) {
            this.buf += char;
        }
        else {
            ctx.push(this.buf);
            this.buf = '';
            ctx.enterState('init', char)
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
LuhnFilter.prototype.enterState = function(statename, char){
    var tbl = { 'init' : initstate,
                'gather' : gatherstate,
                };

    tbl[statename].enter(this, char);
}


var lf = new LuhnFilter();
process.stdin.setEncoding('utf8');
process.stdin.pipe(lf).pipe(process.stdout);
