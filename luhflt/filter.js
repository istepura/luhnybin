var util = require('util');
var Transform = require('stream').Transform;

util.inherits(LuhnFilter, Transform);

function LuhnFilter(options){
    if (!(this instanceof LuhnFilter)){
        return new LuhnFilter(options);
    }
    Transform.call(this, options);
    
    this._tbl = {
        'init' : new FilterStateInit(),
        'gather' : new FilterStateGather()
    };
    this.state = this._tbl['init'];
}


var FilterState = function(){
};
FilterState.prototype.isnum =  function(char){
        return /^[0-9]+$/i.test(char);
};

FilterState.prototype.enter = function(ctx, char){
        ctx.state = this
        this.consumeChar(ctx, char);
};

FilterState.prototype.consumeChar = function(ctx, char){
        console.error('not implemented');
};


var FilterStateInit = function(){
    this.consumeChar =function(ctx, char){
        if (this.isnum(char)) {
            ctx.enterState('gather', char);
        }
        else {
            ctx.push(char);
        }
    };
};
FilterStateInit.prototype = new FilterState();

var FilterStateGather = function(){
    this.buf = '';
    this.consumeChar= function(ctx, char){
        if (this.isnum(char)) {
            this.buf += char;
        }
        else {
            ctx.push(this.buf);
            this.buf = '';
            ctx.enterState('init', char)
        }
    };
};
FilterStateGather.prototype = new FilterState();

LuhnFilter.prototype._transform = function (chunk, enc, cb){
    for (var i = 0; i < chunk.length; i++){

        var strchunk = chunk.toString();
        this.state.consumeChar(this, strchunk[i]);
    }
    cb();
};
LuhnFilter.prototype.enterState = function(statename, char){
    this._tbl[statename].enter(this, char);
}


var lf = new LuhnFilter();
process.stdin.setEncoding('utf8');
process.stdin.pipe(lf).pipe(process.stdout);
