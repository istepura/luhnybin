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

exports.LuhnFilter = LuhnFilter;


var FilterState = function(){
};
var isnum =  function(char){
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
        if (isnum(char)) {
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
    this.sums = [[0], [0]];
    this.bufpos = [];
    this.sumflag = 0;
};

FilterStateGather.prototype = new FilterState();

var isgood = function(char){
    return isnum(char) || (/^[\ -]/.test(char));
};
/* 
 * The idea is to store sequential digits in a buffer 
 * and keep track of ranges {l:r} which need to be 'X'-ed out.
 */
FilterStateGather.prototype.consumeChar= function(ctx, char){
    var ranges = this.ranges;
    if (isgood(char)) {
        this.buf += char;

        var doublesums = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9];
        var sumflag = this.sumflag;
        var thisright = this.buf.length - 1;
        var sumarray = this.sums[sumflag];
        if (isnum(char)){
            var val = parseInt(char);

            sumarray.push(sumarray[this.digitcnt] + val);
            this.sums[sumflag ^ 1].push(this.sums[sumflag ^ 1][this.digitcnt] + doublesums[val]);

            this.digitcnt += 1;
            this.bufpos.push(thisright);
            this.sumflag ^= 1;
        }

        if (this.digitcnt >= 14){

            var digcount = this.digitcnt;

            [14, 15, 16].forEach(function(codelen){
                if (digcount >= codelen){
                    sum = sumarray[digcount] - sumarray[digcount - codelen];
                    //console.log(codelen, this.ranges, thisright, sum, sum % 10, this.sums, thisleft, this.bufpos);
                    if (sum % 10 == 0){
                        var thisleft = this.bufpos[digcount - codelen];
                        var lastrange = ranges.length - 1;

                        //Join the ranges if overlap
                        if ( (lastrange >= 0) && (ranges[lastrange].r >= thisleft)){
                            ranges[lastrange].r = thisright;
                            ranges[lastrange].l = Math.min(ranges[lastrange].l, thisleft);
                        }else{
                            ranges.push({l: thisleft, r : thisright});
                        }
                    }
                }
            }, this);
        }
    }
    else {
        /*
         * Dump everything we had in buffer, masking ranges
         */
       ranges.forEach(function(val){
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
        this.sumflag = 0;
        this.sums = [[0], [0]];
        this.bufpos = [];
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


