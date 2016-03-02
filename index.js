'use strict';

function HermitePolynomial(interpolationPoints) {
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

  this._interpolationPoints = interpolationPoints;

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

HermitePolynomial.prototype.evaluate = function (x) {
  const n = this._coefficients.length;
  let res = this._coefficients[n - 1][1];

  for(let i = n -2; i >= 0; i -= 1)  {
    res = res * (x - this._coefficients[i][0]) + this._coefficients[i][1];
  }

  return res;
}

HermitePolynomial.prototype.derivative = function (x) {
  const n = this._coefficients.length;

  let Pn = this._coefficients[n - 1][1];
  let dPn = 0;

  for (let i = n -2; i >= 0; i -= 1) {
    dPn = dPn = dPn*(x - this._coefficients[i][0]) + Pn;
    Pn = Pn*(x - this._coefficients[i][0]) + this._coefficients[i][1];
  }

  return [Pn, dPn];
}

HermitePolynomial.prototype.findRoot = function (seed, tolerance, iterations) {
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


/**
 * Constructor for spline using Hermite Interpolation
 * @param {array[float[]]} interpolationPoints [[x, f(x), f'(x), ..., f^n(x)]];
 */
function HermiteSpline(interpolPts) {
  this._interpolPts = interpolPts;
  this._interpolationPolynomials = [];

  const normalizedPoints = interpolPts.reduce((acum, point) => {
    const expandedPoint = [];
    for (let i = 1, ln = point.length; i < ln; i += 1) {
      expandedPoint.push([point[0], point[i]]);
    }
    acum.push(expandedPoint);
    return acum;
  }, []);


  for (let i = 1, ln = normalizedPoints.length; i < ln; i += 1) {
    this._interpolationPolynomials.push(
      new HermitePolynomial(normalizedPoints[i - 1].concat(normalizedPoints[i]))
    );
  }
}

Object.defineProperties(HermiteSpline.prototype, {
  "_getIndexOfSegment" : {
    enumerable : false,
    value : function (x) {
      if (this.outOfBounds(x)) {
        return null;
      }
      var index = 0;
      for (let ln = this._interpolPts.length; index < ln && this._interpolPts[index][0] < x; index += 1) {
        // Empty block
      }

      return Math.max(0, index - 1);
    }
  },
  "outOfBounds" : {
    enumerable : true,
    value : function (x) {
      return (x < this._interpolPts[0][0] || x > this._interpolPts[this._interpolPts.length -1][0] ? true : false);
    }
  },
  "addPoint" : {
    enumerable : true,
    value : function (point, allowOutsideBounds) {
      if (point[0] < this._interpolPts[0][0] || point[0] > this._interpolPts[this._interpolPts.length - 1][0]) {
        if (!allowOutsideBounds) {
          return new Error('The point that you tried to add to the interpolation is outside of the initial range.');
        }
        if (point[0] < this._interpolPts[0][0]) {
          this._interpolationPolynomials.splice(0, 0, new HermitePolynomial([
            [point[0], point[1]],
            [point[0], point[2]],
            [this._interpolPts[0][0], this._interpolPts[0][1]],
            [this._interpolPts[0][0], this._interpolPts[0][2]]
          ]));

          this._interpolPts.splice(0,0, point.slice(0));

        } else {
          const ln = this._interpolPts.length;
          this._interpolationPolynomials.push(new HermitePolynomial([
            [this._interpolPts[ln - 1][0], this._interpolPts[ln - 1][1]],
            [this._interpolPts[ln - 1][0], this._interpolPts[ln - 1][2]],
            [point[0], point[1]],
            [point[0], point[2]]
          ]));
          this._interpolPts.push(point.slice(0));
        }
      } else {
        const insertIndex = this._getIndexOfPoint(point[0]);
      }

    }
  },
  "evaluate" : {
    enumerable : true,
    value : function (x) {
      const index = this._getIndexOfSegment(x);
      console.log(index);
      return (index === null ? null : this._interpolationPolynomials[index].evaluate(x));
    }
  }
});


module.exports = {
  HermitePolynomial : HermitePolynomial,
  HermiteSpline : HermiteSpline
};
