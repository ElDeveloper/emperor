define([
    'jquery',
    'underscore',
    'contextmenu',
    'three',
    'view',
    'scene3d',
    'colorviewcontroller',
    'visibilitycontroller',
    'shapecontroller',
    'axescontroller',
    'scaleviewcontroller',
    'animationscontroller',
    'filesaver',
    'viewcontroller',
    'svgrenderer',
    'draw',
    'canvasrenderer',
    'canvastoblob',
    'util'
], function($, _, contextMenu, THREE, DecompositionView, ScenePlotView3D,
            ColorViewController, VisibilityController, ShapeController,
            AxesController, ScaleViewController, AnimationsController,
            FileSaver, viewcontroller, SVGRenderer, Draw, CanvasRenderer,
            canvasToBlob, util) {

  /**
   *
   * @class EmperorController
   *       This is the application controller
   *
   * The application controller, contains all the information on how the model
   * is being presented to the user.
   *
   * @param {DecompositionModel} dm An object that will be represented on
   * screen.
   * @param {string} divId The element id where the controller should
   * instantiate itself.
   * @param {node} [webglcanvas = undefined] the canvas to use to render the
   * information. This parameter is optional, and should rarely be set. But is
   * useful for external applications like SAGE2.
   *
   * @return {EmperorController}
   * @constructs EmperorController
   *
   */
  function EmperorController(dm, divId, webglcanvas) {
    var scope = this;

    /**
     * Scaling constant for grid dimensions (read only).
     * @type {float}
     */
    this.GRID_SCALE = 0.97;

    /**
     * Scaling constant for scene plot view dimensions
     * @type {float}
     */
    this.SCENE_VIEW_SCALE = 0.5;
    /**
     * jQuery object where the object lives in.
     * @type {node}
     */
    this.$divId = $('#' + divId);
    /**
     * Width of the object.
     * @type {float}
     */
    this.width = this.$divId.width();
    /**
     * Height of the object.
     * @type {float}
     */
    this.height = this.$divId.height();

    /**
     * Ordination data being plotted.
     * @type {DecompositionModel}
     */
    this.dm = dm;
    /**
     * List of the scene plots views being rendered.
     * @type {ScenePlotView3D[]}
     */
    this.sceneViews = [];

    /**
     * Internal div where the menus live in (jQuery object).
     * @type {node}
     */
    this.$plotSpace = $("<div class='emperor-plot-wrapper'></div>");
    /**
     * Internal div where the plots live in (jQuery object).
     * @type {node}
     */
    this.$plotMenu = $("<div class='emperor-plot-menu'></div>");

    this.$divId.append(this.$plotSpace);
    this.$divId.append(this.$plotMenu);

    /**
     * @type {Function}
     * Callback to execute when all the view controllers have been successfully
     * loaded.
     */
    this.ready = null;

    /**
     * Holds a reference to all the tabs (view controllers) in the `$plotMenu`.
     * @type {object}
     */
    this.controllers = {};

    /**
     * Background color of the scene.
     * @type {THREE.Color}
     * @default 0x00000000
     */
    this.rendererBackgroundColor = new THREE.Color();
    this.rendererBackgroundColor.setHex('0x000000');

    /**
     * Object in charge of doing the rendering of the scenes.
     * @type {THREE.Renderer}
     */
    this.renderer = null;
    if (webglcanvas !== undefined) {
        this.renderer = new THREE.WebGLRenderer({canvas: webglcanvas,
                                                 antialias: true});
    }
    else {
        this.renderer = new THREE.WebGLRenderer({antialias: true});
    }

    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(this.rendererBackgroundColor);
    this.renderer.autoClear = false;
    this.renderer.sortObjects = true;
    this.$plotSpace.append(this.renderer.domElement);

    /**
     * Menu tabs containers, note that we need them in this format to have
     * jQuery's UI tabs work properly. All the view controllers will be added
     * to this container, see the addTab method
     * @see EmperorController.addTab
     * @type {node}
     * @private
     */
    this._$tabsContainer = $("<div name='emperor-tabs-container'></div>");
    this._$tabsContainer.css('background-color', '#EEEEEE');
    /**
     * List of available tabs, lives inside `_$tabsContainer`.
     * @type {node}
     * @private
     */
    this._$tabsList = $("<ul name='emperor-tabs-list'></ul>");

    // These will both live in the menu space. As of the writing of this code
    // there's nothing else but tabs on the menu, but this may change in the
    // future, that's why we are creating the extra "tabsContainer" div
    this.$plotMenu.append(this._$tabsContainer);
    this._$tabsContainer.append(this._$tabsList);

    /**
     * Object with all the available decomposition views.
     *
     * FIXME: This is a hack to go around the fact that the constructor takes
     * a single decomposition model instead of a dictionary
     *
     * @type {object}
     */
    this.decViews = {'scatter': new DecompositionView(this.dm)};

    // default decomposition view uses the full window
    this.addSceneView();

    $(function() {
      scope._buildUI();
      // Hide the loading splashscreen
      scope.$divId.find('.loading').hide();
    });

    // once the object finishes loading, resize the contents so everything fits
    // nicely
    $(this).ready(function() {
      scope.resize(scope.$divId.width(), scope.$divId.height());
    });

    // Custom animations
    this._hideAndShowIsRunning = false;
    this._dropOpacityIsRunning = false;
  };

  /**
   *
   * Add a new decomposition view
   *
   * @param {String} key New name for the decomposition view.
   * @param {DecompositionView} value The decomposition view that will be
   * added.
   *
   * @throws Error if `key` already exists, or if `value` is not a
   * decomposition view.
   *
   */
  EmperorController.prototype.addDecompositionView = function(key, value) {
    if (!(value instanceof DecompositionView)) {
      console.error('The value is not a decomposition view');
    }

    if (_.contains(_.keys(this.decViews), key)) {
      throw Error('A decomposition view named "' + key + '" already exists,' +
                  'cannot add an already existing decomposition.');
    }

    this.decViews[key] = value;

    _.each(this.controllers, function(controller) {
      if (controller instanceof EmperorAttributeABC) {
        controller.refreshMetadata();
      }
    });

    _.each(this.sceneViews, function(sv) {
      sv.addDecompositionsToScene();
    });
  };

  /**
   *
   * Helper method to add additional ScenePlotViews (i.e. another plot)
   *
   */
  EmperorController.prototype.addSceneView = function() {
    if (this.sceneViews.length > 4) {
      throw Error('Cannot add another scene plot view');
    }

    var spv = new ScenePlotView3D(this.renderer, this.decViews,
                                  this.$plotSpace, 0, 0, 0, 0);
    this.sceneViews.push(spv);

    // this will setup the appropriate sizes and widths
    this.resize(this.width, this.height);
  };

  /**
   *
   * Helper method to resize the plots
   *
   * @param {width} the width of the entire plotting space
   * @param {height} the height of the entire plotting space
   *
   */
  EmperorController.prototype.resize = function(width, height) {
    // update the available space we have
    this.width = width;
    this.height = height;

    this.$plotSpace.height(height);
    this.$plotMenu.height(height);

    this._$tabsContainer.height(height);

    // the area we have to present the plot is smaller than the total
    var plotWidth = this.$plotSpace.width();

    // TODO: The below will need refactoring
    // This is addressed in issue #405
    if (this.sceneViews.length === 1) {
      this.sceneViews[0].resize(0, 0, plotWidth, this.height);
    }
    else if (this.sceneViews.length === 2) {
      this.sceneViews[0].resize(0, 0, this.SCENE_VIEW_SCALE * plotWidth,
          this.height);
      this.sceneViews[1].resize(this.SCENE_VIEW_SCALE * plotWidth, 0,
          this.SCENE_VIEW_SCALE * plotWidth, this.height);
    }
    else if (this.sceneViews.length === 3) {
      this.sceneViews[0].resize(0, 0,
          this.SCENE_VIEW_SCALE * plotWidth,
          this.SCENE_VIEW_SCALE * this.height);
      this.sceneViews[1].resize(this.SCENE_VIEW_SCALE * plotWidth, 0,
          this.SCENE_VIEW_SCALE * plotWidth,
          this.SCENE_VIEW_SCALE * this.height);
      this.sceneViews[2].resize(0, this.SCENE_VIEW_SCALE * this.height,
          plotWidth, this.SCENE_VIEW_SCALE * this.height);
    }
    else if (this.sceneViews.length === 4) {
      this.sceneViews[0].resize(0, 0, this.SCENE_VIEW_SCALE * plotWidth,
          this.SCENE_VIEW_SCALE * this.height);
      this.sceneViews[1].resize(this.SCENE_VIEW_SCALE * plotWidth, 0,
          this.SCENE_VIEW_SCALE * plotWidth,
          this.SCENE_VIEW_SCALE * this.height);
      this.sceneViews[2].resize(0, this.SCENE_VIEW_SCALE * this.height,
          this.SCENE_VIEW_SCALE * plotWidth,
          this.SCENE_VIEW_SCALE * this.height);
      this.sceneViews[3].resize(this.SCENE_VIEW_SCALE * plotWidth,
          this.SCENE_VIEW_SCALE * this.height,
          this.SCENE_VIEW_SCALE * plotWidth,
          this.SCENE_VIEW_SCALE * this.height);
    }
    else {
      throw Error('More than four views are currently not supported');
    }

    this.renderer.setSize(plotWidth, this.height);

    /* Resizing the tabs (view controllers) */

    // resize the grid according to the size of the container, since we are
    // inside the tabs we have to account for that lost space.
    var tabHeight = this.$plotMenu.height() * this.GRID_SCALE;

    // the tab list at the top takes up a variable amount of space and
    // without this, the table displayed below will have an odd scrolling
    // behaviour
    tabHeight -= this._$tabsList.height();

    // for each controller, we need to (1) trigger the resize method, and (2)
    // resize the height of the containing DIV tag (we don't need to resize the
    // width as this is already taken care of since it just has to fit the
    // available space).
    _.each(this.controllers, function(controller, index) {
      if (controller !== undefined) {
        $('#' + controller.identifier).height(tabHeight);

        var w = $('#' + controller.identifier).width(),
            h = $('#' + controller.identifier).height();

        controller.resize(w, h);
      }
    });

    //Set all scenes to needing update
    for (var i = 0; i < this.sceneViews.length; i++) {
      this.sceneViews[i].needsUpdate = true;
    }
  };

  /**
   *
   * Helper method to render sceneViews, gets called every time the browser
   * indicates we can render a new frame, however it only triggers the
   * appropriate rendering functions if something has changed since the last
   * frame.
   *
   */
  EmperorController.prototype.render = function() {
    var scope = this;

    if (this.controllers.animations !== undefined) {
      this.controllers.animations.drawFrame();
    }

    if (this.run !== undefined) {
      this.runAssembly();
    }

    this.hideAndShowDrawFrame();
    this.dropOpacityFrame();

    $.each(this.sceneViews, function(i, sv) {
      if (sv.checkUpdate()) {
        scope.renderer.setViewport(0, 0, scope.width, scope.height);
        scope.renderer.clear();
        sv.render();
      }
    });

  };

  /**
   *
   * Helper method to check if all the view controllers have finished loading.
   * Relies on the fact that each view controller announces when it is ready.
   *
   * @private
   *
   */
  EmperorController.prototype._controllerHasFinishedLoading = function() {
    this._seen += 1;

    if (this._seen >= this._expected) {
      if (this.ready !== null) {
        this.ready();
      }
    }
  };

  /**
   *
   * Helper method to assemble UI, completely independent of HTML template.
   * This method is called when the object is constructed.
   *
   * @private
   *
   */
  EmperorController.prototype._buildUI = function() {
    var scope = this;

    // this is the number of expected view controllers that will announce that
    // all view controllers have been successfully loaded.
    this._expected = 4;
    this._seen = 0;

    //FIXME: This only works for 1 scene plot view
    this.controllers.color = this.addTab(this.sceneViews[0].decViews,
                                         ColorViewController);
    this.controllers.visibility = this.addTab(this.sceneViews[0].decViews,
                                              VisibilityController);
    this.controllers.shape = this.addTab(this.sceneViews[0].decViews,
                                         ShapeController);
    this.controllers.axes = this.addTab(this.sceneViews[0].decViews,
                                        AxesController);
    this.controllers.scale = this.addTab(this.sceneViews[0].decViews,
                                         ScaleViewController);
    this.controllers.animations = this.addTab(this.sceneViews[0].decViews,
                                              AnimationsController);

    // We are tabifying this div, I don't know man.
    this._$tabsContainer.tabs({heightStyle: 'fill',
                               // The tabs on the plot space only get resized
                               // when they are visible, thus we subscribe to
                               // the event that's fired after a user selects a
                               // tab.  If you don't do this, the width and
                               // height of each of the view controllers will
                               // be wrong.  We also found that subscribing to
                               // document.ready() wouldn't work either as the
                               // resize callback couldn't be executed on a tab
                               // that didn't exist yet.
                               activate: function(event, ui) {
                                 scope.resize(scope.$divId.width(),
                                              scope.$divId.height());
                               }});

    // Set up the context menu
    this.$contextMenu = $.contextMenu({
      // only tie this selector to our own container div, otherwise with
      // multiple plots on the same screen, this callback gets confused
      selector: '#' + scope.$divId.attr('id') + ' .emperor-plot-wrapper',
      trigger: 'none',
      items: {
        'recenterCamera': {
          name: 'Recenter camera',
          icon: 'home',
          callback: function(key, opts) {
            _.each(scope.sceneViews, function(scene) {
              scene.recenterCamera();
            });
          }
        },
        'toggleAutorotate': {
          name: 'Toggle autorotation',
          icon: 'rotate-left',
          callback: function(key, opts) {
            _.each(scope.sceneViews, function(scene) {
              scene.control.autoRotate = scene.control.autoRotate ^ true;
            });
          }
        },
        'sep0': '----------------',
        'saveState': {
          name: 'Save current settings',
          icon: 'save',
          callback: function(key, opts) {
            scope.saveConfig();
          }
        },
        'loadState': {
          name: 'Load saved settings',
          icon: 'folder-open-o',
          callback: function(key, opts) {
            if (!FileReader) {
              alert('Your browser does not support file loading. We ' +
                    'recommend using Google Chrome for full functionality.');
              return;
            }
            var file = $('<input type="file">');
            file.on('change', function(evt) {
              var f = evt.target.files[0];
              // With help from
              // http://www.htmlgoodies.com/beyond/javascript/read-text-files-using-the-javascript-filereader.html
              var r = new FileReader();
              r.onload = function(e) {
                try {
                  var json = JSON.parse(e.target.result);
                } catch (err) {
                  alert('File given is not a JSON parsable file.');
                  return;
                }
                try {
                  scope.loadConfig(json);
                } catch (err) {
                  alert('Error loading settings from file: ' + err.message);
                  return;
                }
              };
              r.readAsText(f);
            });
            file.click();
          }
        },
        'sep1': '---------',
        'fold1': {
            'name': 'Save Image',
            icon: 'file-picture-o',
            'items': {
              'saveImagePNG': {
                name: 'PNG (high resolution)',
                callback: function(key, opts) {
                  scope.screenshot('png');
                }
              },
              'saveImageSVG': {
                name: 'SVG + labels',
                callback: function(key, opts) {
                  scope.screenshot('svg');
                }
              }
            }
        }
      }
    });

    // The context menu is only shown if there's a single right click. We
    // intercept the clicking event and if it's followed by mouseup event then
    // the context menu is shown, otherwise the event is sent to the THREE.js
    // orbit controls callback. See: http://stackoverflow.com/a/20831728
    this.$plotSpace.on('mousedown', function(evt) {
      scope.$plotSpace.on('mouseup mousemove', function handler(evt) {
        if (evt.type === 'mouseup') {
          // 3 is the right click
          if (evt.which === 3) {
            var contextDiv = $('#' + scope.$divId.attr('id') +
                               ' .emperor-plot-wrapper');
            contextDiv.contextMenu({x: evt.pageX, y: evt.pageY});
          }
        }
        scope.$plotSpace.off('mouseup mousemove', handler);
      });
    });
  };

  /**
   *
   * Save the current canvas view to a new window
   *
   * @param {string} [type = png] Format to save the file as: ('png', 'svg')
   *
   */
  EmperorController.prototype.screenshot = function(type) {
    var img, renderer, factor = 5;
    type = type || 'png';

    if (type === 'png') {
      var pngRenderer = new THREE.CanvasRenderer({antialias: true,
                                                  preserveDrawingBuffer: true});
      pngRenderer.autoClear = true;
      pngRenderer.sortObjects = true;
      pngRenderer.setSize(this.$plotSpace.width() * factor,
                          this.$plotSpace.height() * factor);
      pngRenderer.setClearColor(this.renderer.getClearColor(), 1);
      pngRenderer.setPixelRatio(window.devicePixelRatio);
      pngRenderer.render(this.sceneViews[0].scene, this.sceneViews[0].camera);

      // toBlob is only available in some browsers, that's why we use
      // canvas-toBlob
      pngRenderer.domElement.toBlob(function(blob) {
        saveAs(blob, 'emperor.png');
      });
    }
    else if (type === 'svg') {
      // confirm box based on number of samples: better safe than sorry
      if (this.dm.length >= 9000) {
        if (confirm('This number of samples could take a long time and in ' +
           'some computers the browser will crash. If this happens we ' +
           'suggest to use the png implementation. Do you want to ' +
           'continue?') === false) {
          return;
        }
      }

      // generating SVG image
      var svgRenderer = new THREE.SVGRenderer({antialias: true,
                                               preserveDrawingBuffer: true});
      svgRenderer.setSize(this.$plotSpace.width(), this.$plotSpace.height());
      svgRenderer.setClearColor(this.renderer.getClearColor(), 1);
      svgRenderer.render(this.sceneViews[0].scene, this.sceneViews[0].camera);
      svgRenderer.sortObjects = true;

      // converting svgRenderer to string: http://stackoverflow.com/a/17415624
      var XMLS = new XMLSerializer();
      var svgfile = XMLS.serializeToString(svgRenderer.domElement);

      // some browsers (Chrome) will add the namespace, some won't. Make sure
      // that if it's not there, you add it to make sure the file can be opened
      // in tools like Adobe Illustrator or in browsers like Safari or FireFox
      if (svgfile.indexOf('xmlns="http://www.w3.org/2000/svg"') === -1) {
        // adding xmlns header to open in the browser
        svgfile = svgfile.replace('viewBox=',
                                  'xmlns="http://www.w3.org/2000/svg" ' +
                                  'viewBox=');
      }

      // hacking the background color by adding a rectangle
      var index = svgfile.indexOf('viewBox="') + 9;
      var viewBox = svgfile.substring(index,
                                      svgfile.indexOf('"', index)).split(' ');
      var background = '<rect id="background" height="' + viewBox[3] +
                       '" width="' + viewBox[2] + '" y="' + viewBox[1] +
                       '" x="' + viewBox[0] +
                       '" stroke-width="0" stroke="#000000" fill="#' +
                       this.renderer.getClearColor().getHexString() + '"/>';
      index = svgfile.indexOf('>', index) + 1;
      svgfile = svgfile.substr(0, index) + background + svgfile.substr(index);

      var blob = new Blob([svgfile], {type: 'image/svg+xml'});
      saveAs(blob, 'emperor-image.svg');

      // generating legend
      var names = [], colors = [];
      _.each(this.controllers.color.bodyGrid.getData(), function(element) {
        names.push(element.category);
        colors.push(element.value);
      });
      blob = new Blob([Draw.formatSVGLegend(names, colors)],
                      {type: 'image/svg+xml'});
      saveAs(blob, 'emperor-image-labels.svg');
    } else {
      console.error('Screenshot type not implemented');
    }

    // re-render everything, sometimes after saving objects, the colors change
    this.sceneViews.forEach(function(view) {
      view.needsUpdate = true;
    });
  };

  /**
   *
   * Write settings file for the current controller settings
   *
   * The format is as follows: a javascript object with the camera position
   * stored in the 'cameraPosition' key and the quaternion in the
   * 'cameraQuaternion' key. Each controller in this.controllers is then saved
   * by calling toJSON on them, and the resulting object saved under the same
   * key as the controllers object.
   *
   */
   EmperorController.prototype.saveConfig = function() {
    var saveinfo = {};
    // Assuming single sceneview for now
    sceneview = this.sceneViews[0];
    saveinfo.cameraPosition = sceneview.camera.position;
    saveinfo.cameraQuaternion = sceneview.camera.quaternion;
    // Save settings for each controller in the view
     _.each(this.controllers, function(controller, index) {
      if (controller !== undefined) {
        saveinfo[index] = controller.toJSON();
      }
    });

    // Save the file
    var blob = new Blob([JSON.stringify(saveinfo)], {type: 'text/json'});
    saveAs(blob, 'emperor-settings.json');
   };

  /**
   *
   * Load a settings file and set all controller variables.
   *
   * This method will trigger a rendering callback.
   *
   * @param {object} json Information about the emperor session to load.
   *
   */
  EmperorController.prototype.loadConfig = function(json) {
    //still assuming one sceneview for now
    var sceneview = this.sceneViews[0];

    if (json.cameraPosition !== undefined) {
      sceneview.camera.position.set(json.cameraPosition.x,
                                    json.cameraPosition.y,
                                    json.cameraPosition.z);
    }
    if (json.cameraQuaternion !== undefined) {
      sceneview.camera.quaternion.set(json.cameraQuaternion._x,
                                      json.cameraQuaternion._y,
                                      json.cameraQuaternion._z,
                                      json.cameraQuaternion._w);
    }

    //must call updates to reset for camera move
    sceneview.camera.updateProjectionMatrix();
    sceneview.control.update();

    //load the rest of the controller settings
    _.each(this.controllers, function(controller, index) {
      if (controller !== undefined && json[index] !== undefined) {
        controller.fromJSON(json[index]);
      }
    });

    sceneview.needsUpdate = true;
   };

  /**
   *
   * Helper method to resize the plots.
   *
   * @param {DecompositionView[]} dvdict Dictionary of DecompositionViews.
   * @param {EmperorViewControllerABC} viewConstructor Constructor of the view
   * controller.
   *
   */
  EmperorController.prototype.addTab = function(dvdict, viewConstructor) {
    var scope = this;

    // nothing but a temporary id
    var id = (Math.round(1000000 * Math.random())).toString();

    this._$tabsContainer.append("<div id='" + id +
                                "' class='emperor-tab-div' ></div>");
    $('#' + id).height(this.$plotMenu.height() - this._$tabsList.height());

    // dynamically instantiate the controller, see:
    // http://stackoverflow.com/a/8843181
    var params = [null, '#' + id, dvdict];
    var obj = new (Function.prototype.bind.apply(viewConstructor, params));

    obj.ready = function() {
      scope._controllerHasFinishedLoading();
    };

    // set the identifier of the div to the one defined by the object
    $('#' + id).attr('id', obj.identifier);

    // now add the list element linking to the container div with the proper
    // title
    this._$tabsList.append("<li><a href='#" + obj.identifier + "'>" +
                           obj.title + '</a></li>');

    return obj;
  };

  EmperorController.prototype.prepRunAssembly = function() {
    var decView = this.decViews.scatter;
    var decomp = decView.decomp;
    var runs = decomp.getUniqueValuesByCategory('run_number');

    // hide everything
    decomp.apply(function(plottable) {
      decView.markers[plottable.idx].material.transparent = true;
      decView.markers[plottable.idx].material.opacity = 0.2;
    });
    decomp.apply(function(plottable) {
      decView.markers[plottable.idx].visible = false;
    });

    // we introduce the ICU in a different color
    plts = decomp.getPlottablesByMetadataCategoryValue('run_number', 'ICU');
    plts.forEach(function(x) {
      decView.markers[x.idx].material.color = new THREE.Color('#ff028d');
    });

    // split the runs between AG runs and everything else, we rely on the
    // last run being ICU in the nonNumeric for this to look right
    runs = util.splitNumericValues(runs);
    this.runs = util.naturalSort(runs.numeric);
    this.runs = this.runs.concat(util.naturalSort(runs.nonNumeric));

    this.run = this.runs[0];
    decView.needsUpdate = true;
    this.previous = -1;
    this.runName = undefined;
  }

  EmperorController.prototype.runAssembly =  function() {
    var decView = this.decViews.scatter;
    var decomp = decView.decomp, value, plts, opacity, runName;

    if (this.previous !== this.run) {
      this.sceneViews[0].scene.remove(this.runName);

      // only show a label for the run numbers, not for ICU, FMT or ITS
      if (!isNaN(parseFloat(this.run))) {
        runName = 'Sequencing Batch ' + this.run;
        this.runName = Draw.makeLabel([0, -0.7, 0], runName, 'black', 3.2);
        this.sceneViews[0].scene.add(this.runName);
      }

      this.previous = this.run;
    }

    value = this.run;

    plts = decomp.getPlottablesByMetadataCategoryValue('run_number', value);
    plts.forEach(function(x) {
      decView.markers[x.idx].visible = true;
      decView.markers[x.idx].material.opacity += 0.1;
      opacity = decView.markers[x.idx].material.opacity;
    });

    if (opacity >= 0.7) {
      var index = this.runs.indexOf(value);

      if (index !== -1) {
        this.run = this.runs[index + 1];
      }
      else {
        this.run = null;
      }
    }

    decView.needsUpdate = true;

    // done with the animation
    if (this.run === null) {
      this.run = undefined;
      this.runs = undefined;
      this.sceneViews[0].scene.remove(this.runName);
    }
  }

  EmperorController.prototype.changeOpacityAndColor = function(opacity, color) {
    opacity = opacity || 0.2;
    color = color || 'white';

    var decView = this.decViews.scatter;
    var decomp = decView.decomp;

    // hide everything
    decomp.apply(function(plottable) {
      decView.markers[plottable.idx].material.transparent = true;
      decView.markers[plottable.idx].material.opacity = opacity;
      decView.markers[plottable.idx].material.color = new THREE.Color(color);
    });

    decView.needsUpdate = true;
  }

  EmperorController.prototype.hideAndShowByCountry = function() {
    var colors = {
      'Other': 'grey',
      'Australia': '#008751',
      'United Kingdom': '#003399',
      'USA': '#E0162B'
    };
    this.hideAndShowByValue('country_animation', colors);
  }

  EmperorController.prototype.hideAndShowByBodySite = function() {
    var colors = {
      'Fecal': '#b15928',
      'Oral': '#1f78b4',
      'Skin': '#33a02c',
    };
    this.hideAndShowByValue('body_product_animation', colors);
  }

  EmperorController.prototype.hideAndShowByValue = function(category, colors) {
    this.changeOpacityAndColor(0.2, 'white');

    this._hideAndShowIsRunning = true;
    this._hideAndShowNewValue = true;
    this._hideAndShowCategory = category;

    this._hideAndShowCategoryIndex = 0;
    this._hideAndShowColors = _.pairs(colors);
  }

  EmperorController.prototype.hideAndShowDrawFrame = function() {
    if (this._hideAndShowIsRunning) {
      if (this._hideAndShowNewValue) {
        this._hideAndShowStartFrame();
      }
      else {
        this._hideAndShowFrame();
      }
    }
  }

  EmperorController.prototype._hideAndShowStartFrame = function() {
    var decView = this.decViews.scatter;
    var decomp = decView.decomp;

    var category = this._hideAndShowCategory;
    var value = this._hideAndShowColors[this._hideAndShowCategoryIndex][0];
    var color = this._hideAndShowColors[this._hideAndShowCategoryIndex][1];

    plts = decomp.getPlottablesByMetadataCategoryValue(category, value);
    plts.forEach(function(x) {
      decView.markers[x.idx].visible = false;
      decView.markers[x.idx].material.color = new THREE.Color(color);
    });

    decView.needsUpdate = true;
    this._hideAndShowNewValue = false;
  }

  EmperorController.prototype._hideAndShowFrame = function() {
    var decView = this.decViews.scatter, decomp = decView.decomp, opacity;

    var category = this._hideAndShowCategory;
    var value = this._hideAndShowColors[this._hideAndShowCategoryIndex][0];
    var color = this._hideAndShowColors[this._hideAndShowCategoryIndex][1];

    plts = decomp.getPlottablesByMetadataCategoryValue(category, value);
    plts.forEach(function(x) {
      decView.markers[x.idx].visible = true;
      decView.markers[x.idx].material.opacity += 0.1;
      opacity = decView.markers[x.idx].material.opacity;
    });
    decView.needsUpdate = true;

    if (opacity >= 0.8) {
      this._hideAndShowCategoryIndex += 1;
      this._hideAndShowNewValue = true;
    }

    if (this._hideAndShowCategoryIndex >= this._hideAndShowColors.length) {
      this._hideAndShowCategoryIndex = 0;
      this._hideAndShowIsRunning = false;
      this._hideAndShowNewValue = false;
      this._hideAndShowColors = undefined;
    }
  }

  EmperorController.prototype.resetToBodySite = function() {
    var lcolors = {
      'category': 'body_product_animation',
      'continuous': false,
      'colormap': 'discrete-coloring-qiime',
      'data': {'Fecal': '#b15928', 'Oral': '#1f78b4', 'Skin': '#33a02c'}
    };
    this.controllers.color.fromJSON(lcolors);
  }

  EmperorController.prototype.dropOpacity = function() {
    this._dropOpacityIsRunning = true;
    console.log('something');
  }

  EmperorController.prototype.dropOpacityFrame = function() {
    if (this._dropOpacityIsRunning) {
      console.log('changing opacity');
      var decView = this.decViews.scatter;
      var decomp = decView.decomp, opacity;

      // hide everything
      decomp.apply(function(plottable) {
        decView.markers[plottable.idx].material.opacity -= 0.05;
        decView.markers[plottable.idx].material.transparent = true;
        opacity = decView.markers[plottable.idx].material.opacity;
      });
      decView.needsUpdate = true;

      if (opacity <= 0.2) {
        this._dropOpacityIsRunning = false;
      }
    }
  }

  EmperorController.prototype.startFMT = function() {
    var sphereColors = {
      '1924.Sadowsky.15r': 'green',       // CD4
      '1924.Sadowsky.67': 'orange',       // CD3
      '1924.Sadowsky.14r': 'yellow',      // CD1
      '1924.Sadowsky.40': 'red',          // CD2
      '1924.Sadowsky.4r': '#b15928',  // Donor
    };
    var lineColors = {
      'CD4': 'green',                // CD4
      'CD3': 'orange',               // CD3
      'CD1': 'yellow',               // CD1
      'CD2': 'red',                  // CD2,
      'Donor': '#b15928',        // Donor
    };
    this._prepareAnimation('animations_gradient', 'animations_subject',
                           sphereColors, lineColors);
  }

  EmperorController.prototype._resetAnimation = function(samples, color) {
    var decView = this.decViews.scatter;
    var decomp = decView.decomp;
    // hide everything
    var plts = decomp.getPlottableByIDs(samples);
    plts.forEach(function(plottable){
      decView.markers[plottable.idx].scale.set(0.5, 0.5, 0.5);
      decView.markers[plottable.idx].material.color = new THREE.Color(color);
      decView.markers[plottable.idx].material.opacity = 0.2;
    });
  }

  EmperorController.prototype.finishFMT = function() {
    var samples = ['1924.Sadowsky.15r', '1924.Sadowsky.67',
                   '1924.Sadowsky.14r', '1924.Sadowsky.40',
                   '1924.Sadowsky.4r'];
    this._resetAnimation(samples, '#b15928');
    this.controllers.animations._rewindButtonClicked();
  }

  EmperorController.prototype.finishITS = function() {
    var samples = ['101.4'];
    this._resetAnimation(samples, '#b15928');
    this.controllers.animations._rewindButtonClicked();
  }


  EmperorController.prototype.startITS = function() {
    var sphereColors = {
      '101.4': 'orange'
    };
    var lineColors = {
      'Child': 'orange'
    };
    this._prepareAnimation('animations_gradient_its',
                           'animations_trajectory_its',
                           sphereColors, lineColors);
  }

  EmperorController.prototype._prepareAnimation = function(gradient, trajectory,
                                                           sphereColors, lineColors) {
    var decView = this.decViews.scatter;
    var decomp = decView.decomp;

    // hide everything
    var plts = decomp.getPlottableByIDs(_.keys(sphereColors)), color;

    plts.forEach(function(plottable){
      color = sphereColors[plottable.name];
      decView.markers[plottable.idx].material.color = new THREE.Color(color);
      decView.markers[plottable.idx].scale.set(2, 2, 2);
      decView.markers[plottable.idx].material.opacity = 1;
    });

    decView.needsUpdate = true;

    this.controllers.animations.setColors(lineColors);

    this.controllers.animations.setGradientCategory(gradient);
    this.controllers.animations.setTrajectoryCategory(trajectory);
    this.controllers.animations._playButtonClicked();
  }

  return EmperorController;
});
