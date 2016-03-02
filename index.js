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

  this._interpolPts = interpolationPoints;

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

  const normalizedPoints = this._unrollArrayPoints(interpolPts);

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
  "_getIndexOfPoint" : {
    enumerable : false,
    value : function (x) {
      if (this.outOfBounds(x)) {
        return null;
      }
      var index = 0;
      for ( ; x > this._interpolPts[index + 1][0]; index += 1) {
        // Empy block. Seek index;
      }
      return index;
    }
  },
  "_updateCoefficients" : {
    enumerable : false,
    value : function (index) {
      const pointsArguments = [];

      [index, index + 1].forEach(i => {
        for (let j = 1, ln = this._interpolPts[i].length; i < ln; i += 1) {
          pointsArguments.push([this._interpolPts[i][0], this._interpolPts[i][j]]);
        }
      });

      this._interpolationPolynomials[index] = new HermitePolynomial(pointsArguments);

    }
  },
  "_unrollArrayPoints" : {
    enumerable : false,
    value : function (points) {
      return points.reduce((acum, point) => {
        const expandedPoint = [];
        for (let i = 1, ln = point.length; i < ln; i += 1) {
          expandedPoint.push([point[0], point[i]]);
        }
        acum.push(expandedPoint);
        return acum;
      }, []);
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

        const unrolledPoints = (point[0] < this._interpolPts[0][0] ?
          this._unrollArrayPoints([
            point,
            this._interpolPts[0]
          ]) :
          this._unrollArrayPoints([
            this._interpolPts[ln - 1],
            point
          ])
        );
        const newPoly = new HermitePolynomial(unrolledPoints[0].concat(unrolledPoints[1]));

        if (point[0] < this._interpolPts[0][0]) {
          this._interpolationPolynomials.splice(0, 0, newPoly);
          this._interpolPts.splice(0,0, point.slice(0));
        } else {
          this._interpolationPolynomials.push(newPoly);
          this._interpolPts.push(point.slice(0));
        }
      } else {
        const insertIndex = this._getIndexOfPoint(point[0]);
        this._interpolPts.splice(insertIndex + 1, 0, point.slice(0));

        const unrolledPoints = this._unrollArrayPoints([
          this._interpolPts[insertIndex],
          this._interpolPts[insertIndex + 1]
        ]);

        this._interpolationPolynomials.splice(insertIndex, 0, new HermitePolynomial(
          unrolledPoints[0].concat(unrolledPoints[1])
        ));

        this._updateCoefficients(insertIndex + 1);
      }
    }
  },
  "deletePoint" : {
    enumerable : true,
    value : function (indexOrPoint) {
      if (!Number.isInteger(indexOrPoint)) {

      }
    }
  },
  "evaluate" : {
    enumerable : true,
    value : function (x) {
      const index = this._getIndexOfSegment(x);
      return (index === null ? null : this._interpolationPolynomials[index].evaluate(x));
    }
  }
});


module.exports = {
  HermitePolynomial : HermitePolynomial,
  HermiteSpline : HermiteSpline
};
