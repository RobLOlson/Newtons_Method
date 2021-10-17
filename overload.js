/* 
It is a melancholy object-oriented language to those who walk through
this great town or travel in the country, when they see the JavaScript
programs crowded with method calls begging for more succinct syntax.
I think it is agreed by all parties, that whoever could find out a
fair, cheap and easy method of making these operators sound and useful
members of the language, would deserve so well of the publick, as
to have his statue set up for a preserver of the nation. I do therefore
humbly offer to publick consideration a pure JS library I've written
for overloading operators, which permits computations like these:

Complex numbers:
>> Complex()({r: 2, i: 0} / {r: 1, i: 1} + {r: -3, i: 2}))
<- {r: -2, i: 1}

Automatic differentiation:
Let f(x) = x^3 - 5x:
>> var f = x => Dual()(x * x * x - {x:5, dx:0} * x);

Now map it over some values:
>> [-2,-1,0,1,2].map(a=>({x:a,dx:1})).map(f).map(a=>a.dx)
<- [ 7, -2, -5, -2, 7 ]
i.e. f'(x) = 3x^2 - 5.

Polynoomials:
>> Poly()([1,-2,3,-4]*[5,-6]).map((c,p)=>''+c+'x^'+p).join(' + ')
<- "5x^0 + -16x^1 + 27x^2 + -38x^3 + 24x^4"

Big rational numbers (with concise syntax!):
// 112341324242 / 22341234124 + 334123124 / 5242342
// > with(Rat){Rat()(n112341324242d22341234124 + n334123124d5242342).join(' / ')}
// "2013413645483934535 / 29280097495019602"

The implementation is only mildly worse than eating babies.
*/

((global) => {
  // Increase for more complicated fancier expressions
  var numVars = 5;
  
  
  
  var vars = Array.from(Array(numVars)).map((_,i)=>i);
  var randoms = vars.map(() => Math.random());
  var table = {};

  // n is number of internal nodes
  // f is a function to process each result
  var trees = (n, f) => {
  　　// h is the "height", thinking of 1 as a step up and 0 as a step down
  　　// s is the current state
  　　var enumerate = (n, h, s, f) => {
  　　　　if (n === 0 && h === 0) {
  　　　　　　f(s + '0');
  　　　　} else {
  　　　　　　if (h > 0) {
  　　　　　　　　enumerate(n, h - 1, s + '0', f)
  　　　　　　}
  　　　　　　if (n > 0) {
  　　　　　　　　enumerate(n - 1, h + 1, s + '1', f)
  　　　　　　}
  　　　　}
  　　};

  　 enumerate(n, 0, '', f);
  };
  
  var toFunction = (s, pos, opCount, varCount) => {
    if (s[pos] == '0') {
      return [`x[${varCount}]`, pos + 1, opCount, varCount + 1];
    }
    var left, right, op;
    pos++;
    op = `ops[${opCount}]`;
    [left, pos, opCount, varCount] = toFunction(s, pos, opCount + 1, varCount);
    [right, pos, opCount, varCount] = toFunction(s, pos, opCount, varCount);
    return [`${op}(${left},${right})`, pos, opCount, varCount];
  };

  var add = (x,y) => x+y; add.toString = ()=>'+';
  var sub = (x,y) => x-y; sub.toString = ()=>'-';
  var mul = (x,y) => x*y; mul.toString = ()=>'*';
  var div = (x,y) => x/y; div.toString = ()=>'/';

  var round = (x) => {
    var million = Math.pow(2,20);
    return Math.floor(x * million) / million;
  };

  var populate = (expr, ops, opCount) => {
    if (ops.length == opCount) {
      var result;
      var order=[];
      var x = vars.map(y => ({
        valueOf:()=>{
          order.push(y); 
          return randoms[order.length - 1]; 
        }
      }));
      with ({ops, x}) { result = round(eval(expr)); }
      table[result] = {ops: ops.map(x => '' + x), expr, order};
    } else {
      populate(expr, ops.concat(add), opCount);
      populate(expr, ops.concat(sub), opCount);
      populate(expr, ops.concat(mul), opCount);
      populate(expr, ops.concat(div), opCount);
    }
  };

  var allExprs = (s) => {
    var [expr, , opCount, ] = toFunction(s, 0, 0, 0);
    populate(expr, [], opCount);
  };
  
  vars.forEach(x=>trees(x, allExprs));

  var makeContext = (constr, opTable) => () => {
    // Set up values array
    var V = [];
    // Install temporary valueOf
    var valueOf = constr.prototype.valueOf;
    constr.prototype.valueOf = function () {
      return randoms[V.push(this) - 1]; 
    };
    // Return function expecting key
    return (key) => {
      var {ops, expr, order} = table[round(+key)];
      constr.prototype.valueOf = valueOf;
      var result;
      var index = 0;
      var W = [];
      V.forEach((v, i) => W[order[i]] = V[i]);
      with ({ops: ops.map(x => opTable[x]), x: W}) { result = eval(expr); }
      V = [];
      return result;
    };
  };
  global.makeContext = makeContext;
})(this);

var Complex = makeContext(Object, {
  '+': (x, y) => ({r: x.r + y.r, i: x.i + y.i}),
  '-': (x, y) => ({r: x.r - y.r, i: x.i - y.i}),
  '*': (x, y) => ({r: x.r * y.r - x.i * y.i, i: x.r * y.i + x.i * y.r}),
  '/': (x, y) => {
    const norm = y.r**2 + y.i**2;
    return {r: (x.r * y.r + x.i * y.i) / norm, i: (x.i * y.r - x.r * y.i) / norm};
  }
});

var Dual = makeContext(Object, {
  '+': (a, b) => ({x: a.x + b.x, dx: a.dx + b.dx}),
  '-': (a, b) => ({x: a.x - b.x, dx: a.dx - b.dx}),
  '*': (a, b) => ({x: a.x * b.x, dx: a.x * b.dx + a.dx * b.x}),
  '/': (a, b) => ({x: a.x / b.x, dx: (a.dx * b.x - a.x * b.dx) / (b.x ** 2)})
});

var Poly = makeContext(Array, {
  '+': (a, b) => (a.length >= b.length ? a.map((x,i) => x + (b[i]?b[i]:0)) : b.map((x,i) => x + (a[i]?a[i]:0))),
  '-': (a, b) => (a.length >= b.length ? a.map((x,i) => x - (b[i]?b[i]:0)) : b.map((x,i) => x - (a[i]?a[i]:0))),
  '*': (a, b) => {
    var result = [];
    for (var i = 0; i < a.length; ++i) {
      for (var j = 0; j < b.length; ++j) {
        result[i+j] = result[i+j] ? result[i+j] : 0;
        result[i+j] += a[i] * b[j];
      }
    }
    return result;
  },
  '/': (a, b) => { throw new Error('Not implemented'); }
});

var Str = new Proxy(makeContext(Array, {
  '+':(a,b) => [a[0]+b[0]],
  '*':(a,b) => [Array.from(Array(b[0])).map(x=>a[0]).join('')]
}), {
  has (target, key) { return key.match(/^[a-z0-9A-Z_]+$/) && key !== 'Str'; },
  get(target, prop, receiver) {
    if (typeof prop == 'string') {
      return [prop]; 
    } else {
      return target[prop];
    }
  }
});

function reduce(numerator,denominator) {
  var gcd = function gcd(a,b){
    return b ? gcd(b, a%b) : a;
  };
  gcd = gcd(numerator,denominator);
  return [numerator/gcd, denominator/gcd];
}

var numDenom = /^n([0-9]+)d([0-9]+)$/;

var Rat = new Proxy(makeContext(Array, {
  '+':(a,b) => reduce(a[0]*b[1] + a[1]*b[0], a[1]*b[1]),
  '-':(a,b) => reduce(a[0]*b[1] - a[1]*b[0], a[1]*b[1]),
  '*':(a,b) => reduce(a[0]*b[0], a[1]*b[1]),
  '/':(a,b) => reduce(a[0]*b[1], a[1]*b[0])
}), {
  has (target, key) { return !!key.match(numDenom); },
  get(target, prop, receiver) {
    if (typeof prop == 'string') {
      var m = prop.match(numDenom);
      return reduce(BigInt(m[1]), BigInt(m[2])); 
    } else {
      return target[prop];
    }
  }
});
