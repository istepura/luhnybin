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
        return /^[0-9]$/i.test(char);
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
    this.ranges = [];
    this.digitcnt = 0;
};

FilterStateGather.prototype = new FilterState();
FilterStateGather.prototype.isgood = function(char){
    return this.isnum(char) || (/^[\ -]/.test(char));
};
FilterStateGather.prototype.consumeChar= function(ctx, char){
    if (this.isgood(char)) {
        this.buf += char;

        if (this.isnum(char)){
            this.digitcnt += 1;
        }

        if (this.digitcnt >= 14){

            var digcount = this.digitcnt;
            var thisright = this.buf.length - 1;
            [14, 15, 16].forEach(function(codelen){
                if (digcount >= codelen){
                    var flag = 0;
                    var sum = 0;
                    var len = 0;
                    var i = thisright;
                    while(len < codelen){

                        if (/\d/.test(this.buf[i])){
                            var val = parseInt(this.buf[i]);

                            val += (val * flag);

                            sum += Math.floor(val / 10);
                            sum += (val % 10);
                            flag ^= 1;
                            len++;
                        }
                        i--;
                    }
                    //console.log(codelen, this.ranges, thisright, i, sum, sum % 10);
                    if (sum % 10 == 0){
                        var thisleft = i +1;
                        var lastrange = this.ranges.length - 1;

                        //Join the ranges if overlap
                        if ( (lastrange >= 0) && (this.ranges[lastrange].r >= thisleft)){
                            this.ranges[lastrange].r = thisright;
                            this.ranges[lastrange].l = Math.min(this.ranges[lastrange].l, thisleft);
                        }else{
                            this.ranges.push({l: thisleft, r : thisright});
                        }
                    }
                }
            }, this);
        }
    }
    else {
       this.ranges.forEach(function(val){
            this.buf = this.buf.replace(/[0-9]/g, function(match, offset, string){
                if ((val.l <= offset) && (val.r >= offset)){
                    return 'X';
                }else return match;
            });

        }, this);
        ctx.push(this.buf);
        this.ranges = [];
        this.buf = '';
        this.digitcnt = 0;
        ctx.enterState('init', char)
    }
};

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
