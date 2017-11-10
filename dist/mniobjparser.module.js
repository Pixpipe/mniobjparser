var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();





var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

/**
* MniObjParser is a parser of mniobj surface files. This version is an atempt of
* making a free from dependency independant module. It is based on the code witten
* by Nicolas Kassis and Tarek Sherif for BrainBrowser
* (https://brainbrowser.cbrain.mcgill.ca).
*
* Since mniobj file can be huge, it may be a good idea to call that froma worker.
*
* @author: Jonathan Lurie (github.com/jonathanlurie)
* @author: Nicolas Kassis
* @author: Tarek Sherif
*/

var MniObjParser = function () {

  /**
  * Constructor of the MniObjParser.
  */
  function MniObjParser() {
    classCallCheck(this, MniObjParser);

    this._stack = null;
    this._stackIndex = null;
    this._tempResult = null;
    this._shapeData = null;
  }

  /**
  * Copy an existing MniObjParser instance.
  * This is particularly usefull in the context of a worker, if an MniObjParser
  * is returned, it is using a JSON format to transfer, meaning all the methods
  * are lost and only remains the data. This is to rebuild a proper MniObjParser.
  * @param {MniObjParser} MniObjParserInstance - the instance to copy the data from.
  */


  createClass(MniObjParser, [{
    key: "copy",
    value: function copy(MniObjParserInstance) {
      this._stack = MniObjParserInstance._stack;
      this._stackIndex = MniObjParserInstance._stackIndex;
      this._tempResult = MniObjParserInstance._tempResult;
      this._shapeData = MniObjParserInstance._shapeData;
    }

    /**
    * Parse the nmiobj string.
    * @param {String} objString - This string is obviously taken out of a obj file
    */

  }, {
    key: "parse",
    value: function parse(objString) {
      try {
        this._parseRawData(objString);
        this._arrangeData();
      } catch (e) {
        console.warn("MNI OBJ file is invalid.");
        console.warn(e);
      }
    }

    /**
    * Parse a obj string
    * @param {String} objString - content of the obj file
    */

  }, {
    key: "_parseRawData",
    value: function _parseRawData(objString) {
      this._stack = objString.trim().split(/\s+/).reverse();
      this._stackIndex = this._stack.length - 1;
      this._tempResult = {};

      var objectClass = this._popStack();
      var start, end, nitems;
      var indices, endIndices;
      var lineIndices = null;
      var lineIndexSize, lineIndexCounter;

      this._tempResult.type = objectClass === "P" ? "polygon" : objectClass === "L" ? "line" : objectClass;

      if (this._tempResult.type === "polygon") {
        this._parseSurfProp();
        this._tempResult.numVertices = parseInt(this._popStack(), 10);
        this._parseVertices();
        this._parseNormals();
        this._tempResult.nitems = parseInt(this._popStack(), 10);
      } else if (this._tempResult.type === "line") {
        this._parseSurfProp();
        this._tempResult.numVertices = parseInt(this._popStack(), 10);
        this._parseVertices();
        this._tempResult.nitems = parseInt(this._popStack(), 10);
      } else {
        this._tempResult.error = true;
        this._tempResult.errorMessage = 'Invalid MNI Object class: must be "polygon" or "line"';
        return;
      }

      this._parseColors();
      this._parseEndIndices();
      this._parseIndices();

      if (this._tempResult.type === "polygon") {} else if (this._tempResult.type === "line") {
        indices = this._tempResult.indices;
        endIndices = this._tempResult.endIndices;
        nitems = this._tempResult.nitems;
        lineIndexSize = lineIndexCounter = 0;

        for (var i = 0; i < nitems; i++) {
          if (i === 0) {
            start = 0;
          } else {
            start = endIndices[i - 1];
          }

          end = endIndices[i];
          lineIndexSize += (end - start - 1) * 2;
        }

        lineIndices = new Uint32Array(lineIndexSize);

        for (var i = 0; i < nitems; i++) {
          if (i === 0) {
            start = 0;
          } else {
            start = endIndices[i - 1];
          }

          lineIndices[lineIndexCounter++] = indices[start];
          end = endIndices[i];

          for (var j = start + 1; j < end - 1; j++) {
            lineIndices[lineIndexCounter++] = indices[j];
            lineIndices[lineIndexCounter++] = indices[j];
          }

          lineIndices[lineIndexCounter++] = indices[end - 1];
        }

        this._tempResult.indices = lineIndices;
      }
    }

    /**
    * [PRIVATE]
    * Rearange the data from _tempResult to _shapeData
    */

  }, {
    key: "_arrangeData",
    value: function _arrangeData() {

      this._shapeData = {
        type: this._tempResult.type,
        vertices: this._tempResult.vertices,
        normals: this._tempResult.normals,
        colors: this._tempResult.colors,
        surfaceProperties: this._tempResult.surfaceProperties,
        error: this._tempResult.error,
        errorMessage: this._tempResult.errorMessage
      };

      var transfer = [this._shapeData.vertices.buffer, this._shapeData.colors.buffer];

      if (this._shapeData.normals) {
        transfer.push(this._shapeData.normals.buffer);
      }

      this._shapeData.shapes = this._tempResult.indices;

      transfer.push(this._tempResult.indices.buffer);

      // unroll colors if necessary
      if (this._shapeData.colors.length === 4) {
        this._unrollColors();
      }
    }

    /**
    * [PRIVATE]
    * From a single color, make a typed array (Uint8) of colors.
    */

  }, {
    key: "_unrollColors",
    value: function _unrollColors() {
      var dataColor0, dataColor1, dataColor2, dataColor3;
      var nbTriangles = this._shapeData.vertices.length / 3;
      var arraySize = nbTriangles * 4;
      var unrolledColors = new Uint8Array(arraySize);

      dataColor0 = this._shapeData.colors[0];
      dataColor1 = this._shapeData.colors[1];
      dataColor2 = this._shapeData.colors[2];
      dataColor3 = this._shapeData.colors[3];

      for (var i = 0; i < arraySize; i += 4) {
        unrolledColors[i] = dataColor0 * 255;
        unrolledColors[i + 1] = dataColor1 * 255;
        unrolledColors[i + 2] = dataColor2 * 255;
        unrolledColors[i + 3] = dataColor3 * 255;
      }

      this._shapeData.colors = unrolledColors;
    }

    /**
    * [PRIVATE]
    * Parse surface properties from the raw data.
    */

  }, {
    key: "_parseSurfProp",
    value: function _parseSurfProp() {
      if (this._tempResult.type === "polygon") {
        this._tempResult.surfaceProperties = {
          ambient: parseFloat(this._popStack()),
          diffuse: parseFloat(this._popStack()),
          specularReflectance: parseFloat(this._popStack()),
          specularScattering: parseFloat(this._popStack()),
          transparency: parseFloat(this._popStack())
        };
      } else if (this._tempResult.type === "line") {
        this._tempResult.surfaceProperties = {
          width: this._popStack()
        };
      }
    }

    /**
    * [PRIVATE]
    * Parse the vertices from the raw data.
    */

  }, {
    key: "_parseVertices",
    value: function _parseVertices() {
      var count = this._tempResult.numVertices * 3;
      var vertices = new Float32Array(count);
      for (var i = 0; i < count; i++) {
        vertices[i] = parseFloat(this._popStack());
      }

      this._tempResult.vertices = vertices;
    }

    /**
    * [PRIVATE]
    * Parse the normal vector from the raw data.
    */

  }, {
    key: "_parseNormals",
    value: function _parseNormals() {
      var count = this._tempResult.numVertices * 3;
      var normals = new Float32Array(count);

      for (var i = 0; i < count; i++) {
        normals[i] = parseFloat(this._popStack());
      }

      this._tempResult.normals = normals;
    }

    /**
    * [PRIVATE]
    * Parse the color from the raw data.
    */

  }, {
    key: "_parseColors",
    value: function _parseColors() {
      var colorFlag = parseInt(this._popStack(), 10);
      var colors;
      var count;

      if (colorFlag === 0) {
        colors = new Float32Array(4);
        for (var i = 0; i < 4; i++) {
          colors[i] = parseFloat(this._popStack());
        }
      } else if (colorFlag === 1) {
        count = this._tempResult.num_polygons * 4;
        colors = new Float32Array(count);
        for (var i = 0; i < count; i++) {
          colors[i] = parseFloat(this._popStack());
        }
      } else if (colorFlag === 2) {
        count = this._tempResult.numVertices * 4;
        colors = new Float32Array(count);
        for (var i = 0; i < count; i++) {
          colors[i] = parseFloat(this._popStack());
        }
      } else {
        this._tempResult.error = true;
        this._tempResult.errorMessage = "Invalid color flag: " + colorFlag;
      }

      this._tempResult.colorFlag = colorFlag;
      this._tempResult.colors = colors;
    }

    /**
    * [PRIVATE]
    * Not sure how useful endIndices are, it was used in BrainBrowser so I kept them.
    * (is that useful?)
    */

  }, {
    key: "_parseEndIndices",
    value: function _parseEndIndices() {
      var count = this._tempResult.nitems;
      var endIndices = new Uint32Array(count);

      for (var i = 0; i < count; i++) {
        endIndices[i] = parseInt(this._popStack(), 10);
      }

      this._tempResult.endIndices = endIndices;
    }

    /**
    * [PRIVATE]
    * Reads the vertices indices to use to make triangles.
    */

  }, {
    key: "_parseIndices",
    value: function _parseIndices() {
      var count = this._stackIndex + 1;
      var indices = new Uint32Array(count);

      for (var i = 0; i < count; i++) {
        indices[i] = parseInt(this._popStack(), 10);
      }

      this._tempResult.indices = indices;
    }

    /**
    * [PRIVATE]
    * pop the raw data (big string file)
    * @return {String}
    */

  }, {
    key: "_popStack",
    value: function _popStack() {
      return this._stack[this._stackIndex--];
    }

    /**
    * Get if the file is valid, after an atempt of parsing
    * @return {Boolean} true if valid, false if invalid
    */

  }, {
    key: "isValid",
    value: function isValid() {
      return !this._shapeData.error;
    }

    /**
    * Get the error message if any
    * @return {String} the error message, or null if any
    */

  }, {
    key: "getErrorMessage",
    value: function getErrorMessage() {
      return this._shapeData.errorMessage;
    }

    /**
    * [DEBUGGING]
    * @return {Object} the entire shapeData object.
    */

  }, {
    key: "getShapeData",
    value: function getShapeData() {
      return this._shapeData;
    }

    /**
    * Returns the index of vertices to be used to make triangles, as a typed array.
    * @return {Uint32Array} Since triangles have 3 vertices, the array contains index such as
    * [i0, i1, i2, i0, i1, i2, ...].
    */

  }, {
    key: "getShapeRawIndices",
    value: function getShapeRawIndices() {
      if (this._shapeData.error) {
        console.warn("ERROR while parsing: " + this._shapeData.errorMessage);
        return null;
      }

      return this._shapeData.shapes;
    }

    /**
    * Returns the vertice position as a typed array.
    * @return {Float32Array} of points encoded like [x, y, z, x, y, z, ...]
    */

  }, {
    key: "getRawVertices",
    value: function getRawVertices() {
      if (this._shapeData.error) {
        console.warn("ERROR while parsing: " + this._shapeData.errorMessage);
        return null;
      }

      return this._shapeData.vertices;
    }

    /**
    * Returns the normal vectors as a typed array.
    * @return {Float32Array} of normal vector encoded like [x, y, z, x, y, z, ...]
    */

  }, {
    key: "getRawNormals",
    value: function getRawNormals() {
      if (this._shapeData.error) {
        console.warn("ERROR while parsing: " + this._shapeData.errorMessage);
        return null;
      }

      return this._shapeData.normals;
    }

    /**
    * Get the colors encoded like [r, g, b, a, r, g, b, a, ...]
    * @return {Float32Array} of size 4 or of size 4xnumOfVertices
    */

  }, {
    key: "getRawColors",
    value: function getRawColors() {
      if (this._shapeData.error) {
        console.warn("ERROR while parsing: " + this._shapeData.errorMessage);
        return null;
      }

      return this._shapeData.colors;
    }

    /**
    * The surface properties contains transparency info about specularity transparency
    * and other nice light-related behaviour thingies.
    * May be used when building a material, but this is not mandatory.
    * @return {Object}
    */

  }, {
    key: "getSurfaceProperties",
    value: function getSurfaceProperties() {
      if (this._shapeData.error) {
        console.warn("ERROR while parsing: " + this._shapeData.errorMessage);
        return null;
      }

      return this._shapeData.surfaceProperties;
    }

    /**
    * Get the type of mesh.
    * @return {String} "polygon" or "line"
    */

  }, {
    key: "getType",
    value: function getType() {
      return this._shapeData.type;
    }

    /**
    * Get wether of not the output is a 3D polygon  type
    * @return {Boolean}
    */

  }, {
    key: "isPolygon",
    value: function isPolygon() {
      return this._shapeData.type === "polygon";
    }

    /**
    * Get wether of not the output is a line  type
    * @return {Boolean}
    */

  }, {
    key: "isLine",
    value: function isLine() {
      return this._shapeData.type === "line";
    }
  }]);
  return MniObjParser;
}(); /* END of class MniObjParser */

// if we wanted to use foo here:

// but we just want to make it accessible:

export { MniObjParser };
