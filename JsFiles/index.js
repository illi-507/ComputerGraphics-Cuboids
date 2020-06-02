"use strict";

var app = {};
app.canvas = document.getElementById("2dcanvas");
app.slider1 = document.getElementById("slider1");
app.slider2 = document.getElementById("slider2");
app.slider3 = document.getElementById("slider3");
//app.slider4 = document.getElementById("slider4");
app.box1 = document.getElementById("box1");
app.box2 = document.getElementById("box2");
app.box3 = document.getElementById("box3");

app.FRAMERATE = 1000 / 60; // Frames per millisecond

app.onload = function() {
  app.ctx = app.canvas.getContext("2d");
  if (app.ctx === null) {
    alert("ERROR: Unable to initalize Canvas 2D context.");
  }
  setInterval(app.loop, app.FRAMERATE);
}

app.loop = (function() {
  var camera_angle_x_z;
  var camera_angle_y;
  var camera_zoom;
  var is_perspective;
  var is_wireframe;
  var unsorted ;
  var angle_rotation = 0;
  
  /* Function assumes point is already transformed */
  var moveTo = function(v) {
    app.ctx.moveTo(v[0], v[1]);
  }
  
  /* Function assumes point is already transformed */
  var lineTo = function(v) {
    app.ctx.lineTo(v[0], v[1]);
  }

  var drawAxes = function(Tx, size, buffer) {
    for (var i = 0; i < 3; ++i) {
      var o = [0, 0, 0];
      var v = [0, 0, 0];
      v[i] = size;
      twgl.m4.transformPoint(Tx, o, o);
      twgl.m4.transformPoint(Tx, v, v);
      buffer.push([o, v, o, "#FFF"]);
    }
  }
  
  /* Function assumes triangle is already transformed */
  var drawTriangle = function(triangle) {
    var temp = app.ctx.fillStyle;
    app.ctx.fillStyle = triangle[3];
    app.ctx.beginPath();
    moveTo(triangle[0]);
    lineTo(triangle[1]);
    lineTo(triangle[2]);
    lineTo(triangle[0]);
    app.ctx.closePath();
    app.ctx.stroke();
    if (!is_wireframe) {
      app.ctx.fill();
    }
    app.ctx.fillStyle = temp;
  }

  var drawCube = (function() {
    var verts =   [[ 0.5,  0.5,  0.5],
                   [ 0.5,  0.5, -0.5],
                   [ 0.5, -0.5,  0.5],
                   [ 0.5, -0.5, -0.5],
                   [-0.5,  0.5,  0.5],
                   [-0.5,  0.5, -0.5],
                   [-0.5, -0.5,  0.5],
                   [-0.5, -0.5, -0.5]];

    var tuples =  [[0, 1, 3],   //East Side
                   [0, 2, 3],
                   
                   [0, 1, 5],   //Top Side
                   [0, 4, 5],
                   
                   [0, 2, 6],   //North Side
                   [0, 4, 6],
                   
                   [1, 3, 7],   //South Side
                   [1, 5, 7],   
                   
                   [2, 3, 7],   //Bottom Side
                   [2, 6, 7], 
                   
                   [4, 5, 7],   //West Side
                   [4, 6, 7]];
                   
    var colors =   ["#7FFFD4",
                    "#7FFFD4",
                    "#9932CC",
                    "#9932CC",
                    "#FF1493",
                    "#FF1493",
                    "#CCCC33",
                    "#CCCC33",
                    "#33CCCC",
                    "#33CCCC",
                    "#FF4500",
                    "#FF4500"];

    return (function(Tx, size, buffer) {
      var triangles = [];
      // Generate the triangles
      twgl.m4.scale(Tx, [size, size, size], Tx);
      for (var i = 0; i < tuples.length; i++) {
        triangles[i] = [];
        for (var j = 0; j < 3; j++) {
          triangles[i][j] = twgl.m4.transformPoint(Tx, verts[tuples[i][j]]);
        }
        triangles[i][3] = colors[i];
        buffer.push(triangles[i]);
      }
    });
  })();

  var painters = function(triangles) {
      // Sort the triangles on their z values.
      //app.quicksortVectors(triangles);
      triangles.sort(function(a, b) {
        
        var zsum = function(t) {
          return t[0][2] + t[1][2] + t[2][2];
        };
        if(!unsorted){
        if (zsum(a) > zsum(b)) {
          return 1;
        } else {
          return -1;
        }
      }
      else{return 1;}
      });

      // Draw the triangles in order.
      var discard = false;
      for (var i = 0; i < triangles.length; i++) {
        for (var j = 0; j < 3; j++) {
          for (var k = 0; k < 3; k++) {
            if (triangles[i][j][k] === Infinity) {
              discard = true;
            }
            if (triangles[i][j][k] === NaN) {
              discard = true;
            }
          }
        }
        if (!discard) {
          drawTriangle(triangles[i]);
        }
        discard = false;
      }
  }

  var update = (function() {
    var past = Date.now();
    return (function() {
      var present = Date.now();
      var deltaTime = present - past;
      past = present;

      camera_angle_x_z = app.slider1.value*0.01*2*Math.PI;
      camera_angle_y = app.slider2.value*0.01*Math.PI;
      camera_zoom = app.slider3.value*0.01;
     // camera_zoom = 20.0;
      is_perspective = app.box1.checked;
      is_wireframe = app.box2.checked;
      unsorted = app.box3.checked;
      
      angle_rotation += deltaTime / 500 * Math.PI;
      if (angle_rotation > 2 * Math.PI) {
        angle_rotation = 0;
      }
    });
  })();

  var draw = function() {
    var tstack = [twgl.m4.identity()];
    var tribuffer = [];
    
    //Hack to clear screen faster
    app.canvas.width = app.canvas.width;

    /* Camera Transform */
    //TODO: Convert to quaternion rotation.
    var eye = [1200,1200,1200];
    eye[0] *= camera_zoom*-Math.cos(camera_angle_x_z)*Math.sin(camera_angle_y);
    eye[1] *= camera_zoom*Math.cos(camera_angle_y);
    eye[2] *= camera_zoom*Math.sin(camera_angle_x_z)*Math.sin(camera_angle_y);
    var target = [0, 0, 0];
    var up = [0, 1, 0];
    var Tcamera = twgl.m4.inverse(twgl.m4.lookAt(eye, target, up));
    /**/

    /* Projection Transform */
    var field_of_view = Math.PI / 3;
    var aspect = 1;
    var xRight = 300, xLeft = -300;
    var yUp = 300, yDown = -300;
    var zNear = 300, zFar = -300;
    var Tprojection;
    
    if (is_perspective) {
      Tprojection = twgl.m4.perspective(field_of_view, aspect, zFar, zNear);
      Tprojection = twgl.m4.scale(Tprojection, [-1, -1, 1]);
    } else {
      Tprojection = twgl.m4.ortho(xRight, xLeft, yUp, yDown, zNear, zFar);
    }
    /**/

    /* Viewport Transform */
    var translationVector = [app.canvas.width/2, app.canvas.height/2, 0];
    var scalingVector = [600*camera_zoom, 600*camera_zoom, 600*camera_zoom];
    var Tviewport;
    
    //tag1
    Tviewport = twgl.m4.identity();
    //Tviewport = m4.multiply(Tviewport,m4.scaling([300 * camera_zoom, -300 * camera_zoom, 300 * camera_zoom]));
    Tviewport = twgl.m4.translate(Tviewport, translationVector);
    Tviewport = twgl.m4.scale(Tviewport, scalingVector);
    /**/
    
    // Put the transforms together
    tstack.unshift(twgl.m4.multiply(tstack[0], Tcamera));
    tstack.unshift(twgl.m4.multiply(tstack[0], Tprojection));
    tstack.unshift(twgl.m4.multiply(tstack[0], Tviewport));

    // Push stuff to the array buffer
    drawAxes(tstack[0], 100, tribuffer);
    
    tstack.unshift(twgl.m4.translate(tstack[0], [100, 100, 100]));
    drawCube(tstack[0], 100, tribuffer);
    tstack.shift();
    
    tstack.unshift(twgl.m4.translate(tstack[0], [-100, 100, 100]));
    tstack.unshift(twgl.m4.axisRotate(tstack[0], [0, 0, 1], angle_rotation));
    drawCube(tstack[0], 100, tribuffer);
    tstack.shift();
    tstack.shift();
    
    tstack.unshift(twgl.m4.translate(tstack[0], [100, 100, -100]));
    tstack.unshift(twgl.m4.axisRotate(tstack[0], [1, 0, 0], angle_rotation));
    drawCube(tstack[0], 100, tribuffer);
    tstack.shift();
    tstack.shift();
    
    tstack.unshift(twgl.m4.translate(tstack[0], [-100, 100, -100]));
    tstack.unshift(twgl.m4.axisRotate(tstack[0], [1, 0, 1], angle_rotation));
    drawCube(tstack[0], 100, tribuffer);
    tstack.shift();
    tstack.shift();
    
    tstack.unshift(twgl.m4.translate(tstack[0], [100, -100, 100]));
    tstack.unshift(twgl.m4.axisRotate(tstack[0], [0, 1, 0], angle_rotation));
    drawCube(tstack[0], 100, tribuffer);
    tstack.shift();
    tstack.shift();
    
    tstack.unshift(twgl.m4.translate(tstack[0], [-100, -100, 100]));
    tstack.unshift(twgl.m4.axisRotate(tstack[0], [0, 1, 1], angle_rotation));
    drawCube(tstack[0], 100, tribuffer);
    tstack.shift();
    tstack.shift();
    
    tstack.unshift(twgl.m4.translate(tstack[0], [100, -100, -100]));
    tstack.unshift(twgl.m4.axisRotate(tstack[0], [1, 1, 0], angle_rotation));
    drawCube(tstack[0], 100, tribuffer);
    tstack.shift();
    tstack.shift();
    
    tstack.unshift(twgl.m4.translate(tstack[0], [-100, -100, -100]));
    tstack.unshift(twgl.m4.axisRotate(tstack[0], [1, 1, 1], angle_rotation));
    drawCube(tstack[0], 100, tribuffer);
    tstack.shift();
    tstack.shift();

    // Send the array buffer to be drawn
    /*if(unsorted){
    
  }
  else{

  }*/
  painters(tribuffer);

  }

  return (function() {
    update();
    draw();
  });
})();