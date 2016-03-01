'use strict';

function HermitePolinomial(interpolationPoints) {
  if (!Array.isArray(interpolationPoints)) {
    return new Error('Invalid argument. Must provide an array of points.');
  }

  if (interpolationPoints.length < 1) {
    return new Error('Invalid argument. Must provide at least a point.');
  }

  this._coefficients = interpolationPoints.map(point => {
    return [parseFloat(point[0], 10), parseFloat(point[1], 10)];
  });

  this._coefficients.sort((a,b) => {
    return (a[0] - b[0]);
  });

  function factorial(n) {
    let res = 1;
    if (n <= 1) {
      return res;
    }

    for (let i = 1; i <= n; i += 1) {
      res *= i;
    }
    return res;
  }

  for (let i = 1, ln = this._coefficients.length; i < ln; i += 1) {
    for (let j = ln - 1; j >= i; j -= 1) {
      if (this._coefficients[j][0] === this._coefficients[j - i][0]) {
        this._coefficients[j][1] = this._coefficients[j][1] / factorial(1 + j - i);
      } else {
        const dx = this._coefficients[j][0] - this._coefficients[j - i][0];
        this._coefficients[j][1] = (this._coefficients[j][1] - this._coefficients[j - 1][1]) / dx;
      }
    }
  }
}

HermitePolinomial.prototype.evaluate = function (x) {
  const n = this._coefficients.length;
  let res = this._coefficients[n - 1][1];

  for(let i = n -2; i >= 0; i -= 1)  {
    res = res * (x - this._coefficients[i][0]) + this._coefficients[i][1];
  }

  return res;
}

HermitePolinomial.prototype.derivative = function (x) {
  const n = this._coefficients.length;

  let Pn = this._coefficients[n - 1][1];
  let dPn = 0;

  for (let i = n -2; i >= 0; i -= 1) {
    dPn = dPn = dPn*(x - this._coefficients[i][0]) + Pn;
    Pn = Pn*(x - this._coefficients[i][0]) + this._coefficients[i][1];
  }

  return [Pn, dPn];
}

HermitePolinomial.prototype.findRoot = function (seed, tolerance, iterations) {
  tolerance = tolerance || 1e-6;
  iterations = (Number.isInteger(iterations) && iterations > 1 ? iterations : 10);

  let Px = this.derivative(seed);
  if (Math.abs(Px[0]) < tolerance) {
    return seed;
  }

  let x1 = seed, x0;
  for (var i = 0, diff = Math.abs(Px[0]); i < iterations && diff > tolerance; i += 1) {
    x0 = x1;
    Px = this.derivative(x0);

    x1 = x0 - Px[0] / Px[1];
    diff = Math.abs(x1 - x0);
  }

  if (i === iterations) {
    return null;
  }
  return x1;
}

module.exports = HermitePolinomial;
