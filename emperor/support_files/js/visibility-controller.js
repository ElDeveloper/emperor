define([
    'jquery',
    'underscore',
    'viewcontroller',
    'chroma',
    'slickformatters',
    'slickeditors',
    'slickcheckboxcolumn'
], function($, _, ViewControllers, chroma, slickformatters, slickeditors,
            slickcheckboxcolumn) {

  // we only use the base attribute class, no need to get the base class
  /** @private */
  var EmperorAttributeABC = ViewControllers.EmperorAttributeABC;
  /**
   * @class VisibilityController
   *
   * Manipulates and displays the visibility of objects on screen.
   *
   * @param {UIState} uiState The shared state
   * @param {Node} container Container node to create the controller in.
   * @param {Object} decompViewDict This object is keyed by unique
   * identifiers and the values are DecompositionView objects referring to a
   * set of objects presented on screen. This dictionary will usually be shared
   * by all the tabs in the application. This argument is passed by reference.
   *
   * @return {VisibilityController} An instance of VisibilityController
   * @constructs VisibilityController
   * @extends EmperorAttributeABC
   */
  function VisibilityController(uiState, container, decompViewDict) {
    var helpmenu = 'Change the visibility of the attributes on the plot, ' +
                   'such as spheres, vectors and ellipsoids.';
    var title = 'Visibility';

    // Constant for width in slick-grid
    var SLICK_WIDTH = 25, scope = this;

    console.log(Slick.CheckboxSelectColumn);

    var column = new Slick.CheckboxSelectColumn({
      id: 'title', name: '', field: 'value', cssClass: 'lolercoaster',
      hideSelectAllCheckbox: false
    });


    // Build the options dictionary
    var options = {'valueUpdatedCallback': function(e, args) {
      console.log(e, args);

      var visible = args.item.value;
      var group = args.item.plottables;
      var element = scope.getView();
      scope.setPlottableAttributes(element, visible, group);
    },
      'categorySelectionCallback': function(evt, params) {

        console.log(evt);

        var category = scope.$select.val();

        var decompViewDict = scope.getView();

        // getting all unique values per categories
        var uniqueVals = decompViewDict.decomp.getUniqueValuesByCategory(
          category);
        // getting color for each uniqueVals
        var attributes = {};
        _.each(uniqueVals, function(value) {
          attributes[value] = true;
        });
        // fetch the slickgrid-formatted data
        var data = decompViewDict.setCategory(
          attributes, scope.setPlottableAttributes, category);

        scope.setSlickGridDataset(data);
      },
      'slickGridColumn': column.getColumnDefinition()
    };

    EmperorAttributeABC.call(this, uiState, container, title, helpmenu,
        decompViewDict, options);

    $(function() {

      console.log(scope);
      scope.$body.find('.slick-header').css('display', 'inline-block');

      scope.bodyGrid.onSelectedRowsChanged.subscribe(function(event, args) {
        // figure out a way how to grab the selected items

        var visible = args.item.value;
        var group = args.item.plottables;
        var element = scope.getView();
        scope.setPlottableAttributes(element, visible, group);

      });

      scope.bodyGrid.setSelectionModel(new Slick.RowSelectionModel({selectActiveRow: false}));
      scope.bodyGrid.registerPlugin(column);
    });
    return this;
  }
  VisibilityController.prototype = Object.create(EmperorAttributeABC.prototype);
  VisibilityController.prototype.constructor = EmperorAttributeABC;

  /**
   *
   * Private method to reset all objects to be visible.
   *
   * @extends EmperorAttributeABC
   * @private
   *
   */
  VisibilityController.prototype._resetAttribute = function() {
    EmperorAttributeABC.prototype._resetAttribute.call(this);

    _.each(this.decompViewDict, function(view) {
      view.setVisibility(true);
      view.showEdgesForPlottables();
    });
  };

  /**
   * Helper function to set the visibility of plottable
   *
   * @param {Object} scope the scope where the plottables exist
   * @param {boolean} visible Visibility of the plottables
   * @param {Object[]} group Array of objects that should be changed in scope
   */
  VisibilityController.prototype.setPlottableAttributes =
      function(scope, visible, group) {
    scope.setVisibility(visible, group);
  };

  return VisibilityController;
});
