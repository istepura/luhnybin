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


var FilterState = function(){ }
var isnum =  function(char){
        return /^[0-9]$/i.test(char);
}

FilterState.prototype.enter = function(ctx, char){
        ctx.state = this
        this.consumeChar(ctx, char);
}

FilterState.prototype.consumeChar = function(ctx, char){
        console.error('not implemented');
}


var FilterStateInit = function(){ }
FilterStateInit.prototype = new FilterState();
FilterStateInit.prototype.consumeChar = function(ctx, char){
    if (isnum(char)) {
        ctx.enterState('gather', char);
    }
    else {
        ctx.push(char);
    }
}

var FilterStateGather = function(){
    this.buf = [];
    this.ranges = [];
    this.digitcnt = 0;
    this.sums = [[0], [0]];
    this.bufpos = [];
    this.sumflag = 0;
}

FilterStateGather.prototype = new FilterState();

var isgood = function(char){
    return isnum(char) || (/^[\ -]/.test(char));
}
/*
 * The idea is to store sequential digits in a buffer
 * and keep track of ranges {l:r} which need to be 'X'-ed out.
 */
FilterStateGather.prototype.consumeChar= function(ctx, char){
    var ranges = this.ranges;

    if (isgood(char)) {
        this.buf.push(char);

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

            for (var codelen = 16; codelen > 13; codelen--){
                if (digcount >= codelen){
                    var sum = sumarray[digcount] - sumarray[digcount - codelen];
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
                        /* We can break the loop, since we're going 'greedy',
                         * trying to X-out 16-then-15-then-14. If we X-ed out 16-digin #
                         * there's no need to check if 15 & 14 are valid ones.
                         */
                        break;
                    }
                }
            }
        }
    }
    else {
        /*
         * Dump everything we had in buffer, masking ranges
         */
       var i = 0;
       var buf = this.buf;
       while (i < ranges.length){
           var val = ranges[i];

            for (var l = val.l; l <= val.r; l++){
                if (isnum(buf[l])){
                    buf[l] = 'X';
                }
            }
            i++;
        }
        ctx.push(buf.join(''));
        this.ranges = [];
        this.buf = [];
        this.digitcnt = 0;
        this.sumflag = 0;
        this.sums = [[0], [0]];
        this.bufpos = [];
        ctx.enterState('init', char);
    }
}

LuhnFilter.prototype._transform = function (chunk, enc, cb){

    var strchunk = chunk.toString();

    for (var i = 0; i < strchunk.length; i++){
        this.state.consumeChar(this, strchunk[i]);
    }
    cb();
}
LuhnFilter.prototype.enterState = function(statename, char){
    this._tbl[statename].enter(this, char);
}


