This package provides a tool to parse MNI OBJ mesh/surface files. Those are generally generated by [CIVET](https://mcin-cnim.ca/technology/civet/) as an output of extracting the white/grey matter from MRI data.  
Both CIVET and this package are being developed and maintained by [MCIN lab](http://mcin.ca).  

[DEMO](http://www.pixpipe.io/mniobjparser/examples/shapes3D.html), see the `examples` folder of the repo.

# How to

**In a npm project**
```bash
$ npm install --save Pixpipe/mniobjparser
```

Then use *import* (e.g. in a Rollup project):  
```javascript
import { MniObjParser } from 'mniobjparser';
...
var myParser = new MniObjParser();
```

**In a stand alone webpage**
```html
<script src="mniobjparser/dist/mniobjparser.umd.js"></script>
<!-- OR the minified version -->
<script src="mniobjparser/dist/mniobjparser.umd.min.js"></script>
```

Then use it with a reference to its module:  
```javascript
var myParser = new mniobjparser.MniObjParser();
```

Then, no matter in what context you are using it, the following is the same.
A MNI OBJ file is a (potentially very long) text file, and depending on your project you may waht to open such files from the local machine using a *open file* dialog or from a distant server with an AJAX request. This is your choice and this quick *how to* will not cover this part, so in the following we assume that your Javascript code already has access to the very long *String* content of a MNI OBJ file.  

```javascript
// parse the string content or the MNI OBJ file:
myParser.parse( largeMniObjString )

// Check if the parsing went ok:
if( !parser.isValid() ){
  alert("Invalid MNI OBJ file.\n" + "ERROR: " + parser.getErrorMessage());
  return;
}

// get the position of all the vertices as [x, y, z, x, y, z, ... ]
var positions = parser.getRawVertices();  // Float32Array

// get the index of the vertices involved in faces. These are the index from the "positions" array
// [index0, index1, index2, index0, index1, index2, ... ] , each are triangles
var indices = parser.getShapeRawIndices(); // Uint32Array

// get the list of normal vectors (unit) as [x, y, z, x, y, z, ... ]
var normals = parser.getRawNormals(); // Float32Array

// get all the colors per vertex as [r, g, b, a, r, g, b, a, ... ]
var colors = parser.getRawColors(); // Uint8Array

// get some material information, not mandatory to reconstruct the mesh
var surfaceProperties = parser.getSurfaceProperties(); // object

```

Then, using ThreeJS (or other) you can rebuild the mesh, just like in this [example](examples/shapes3D.html).
