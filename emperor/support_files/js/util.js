<<<<<<< HEAD
/**
 *
 * @author Yoshiki Vazquez Baeza
 * @copyright Copyright 2013, The Emperor Project
 * @credits Yoshiki Vazquez Baeza
 * @license BSD
 * @version 0.9.61
 * @maintainer Yoshiki Vazquez Baeza
 * @email yoshiki89@gmail.com
 * @status Development
 *
 */


// http://colorbrewer2.org > qualitative > Number of Data Classes = 12
// colorbrewer will provide you with two lists of colors, those have been
// added here
var colorbrewerDiscrete = ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072",
    "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd",
    "#ccebc5", "#ffed6f", /*first list ends here*/
    "#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c",
    "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#ffff99", "#b15928"];
// taken from the qiime/colors.py module; a total of 24 colors
var qiimeDiscrete = [ "#ff0000", "#0000ff", "#f27304", "#008000", "#91278d",
    "#ffff00", "#7cecf4", "#f49ac2", "#5da09e", "#6b440b", "#808080",
    "#f79679", "#7da9d8", "#fcc688", "#80c99b", "#a287bf", "#fff899",
    "#c49c6b", "#c0c0c0", "#ed008a", "#00b6ff", "#a54700", "#808000",
    "#008080"];
var k_DiscreteColorMaps = {"discrete-coloring":colorbrewerDiscrete,
                           "discrete-coloring-qiime":qiimeDiscrete};

// these colors are included in chroma and are the only ones we should
// use to interpolate through whe coloring in a continuous mode
var k_CHROMABREWER_MAPS = ['discrete-coloring-qiime', 'discrete-coloring',
    'OrRd', 'PuBu', 'BuPu', 'Oranges', 'BuGn', 'YlOrBr', 'YlGn', 'Reds',
    'RdPu', 'Greens', 'YlGnBu', 'Purples', 'GnBu', 'Greys', 'YlOrRd', 'PuRd',
    'Blues', 'PuBuGn', 'Spectral', 'RdYlGn', 'RdBu', 'PiYG', 'PRGn', 'RdYlBu',
    'BrBG', 'RdGy', 'PuOr'];
var k_CHROMABREWER_MAPNAMES = ['Classic QIIME Colors',
    'Discrete Coloring (Colorbrewer)', 'Orange-Red', 'Purple-Blue',
    'Blue-Purple', 'Oranges', 'Blue-Green', 'Yellow-Orange-Brown',
    'Yellow-Green', 'Reds', 'Red-Purple', 'Greens', 'Yellow-Green-Blue',
    'Purples', 'Green-Blue', 'Greys', 'Yellow-Orange-Red', 'Purple-Red',
    'Blues', 'Purple-Blue-Green', 'Spectral', 'Red-Yellow-Green', 'Red-Blue',
    'Pink-Yellow-Green', 'Pink-Red-Green', 'Red-Yellow-Blue',
    'Brown-Blue-Green', 'Red-Grey', 'Purple-Orange'];

/**
 *
 * Sorting function that deals with alpha and numeric elements
 *
 * This function takes a list of strings, divides it into two new lists, one
 * that's alpha-only and one that's numeric only.
 *
 * @param {string}  string of taxonomies
 *
 * @return a truncated string of taxonomies
 *
 */
function naturalSort(list){
  var numericPart = [], alphaPart = [], result = [];

  // separate the numeric and the alpha elements of the array
  for(var index = 0; index < list.length; index++){
    if(isNaN(parseFloat(list[index]))){
      alphaPart.push(list[index])
    }
    else{
      numericPart.push(list[index])
=======
/** @module utility-functions */
define(['underscore'], function(_) {
  /**
   *
   * Sorting function that deals with alpha and numeric elements.
   *
   * @param {String[]} list A list of strings to sort
   *
   * @return {String[]} The sorted list of strings
   * @function naturalSort
   */
  function naturalSort(list) {
    var numericPart = [], alphaPart = [], result = [];

    // separate the numeric and the alpha elements of the array
    for (var index = 0; index < list.length; index++) {
      if (isNaN(parseFloat(list[index]))) {
        alphaPart.push(list[index]);
      }
      else {
        numericPart.push(list[index]);
      }
>>>>>>> new-api
    }

    // ignore casing of the strings, taken from:
    // http://stackoverflow.com/a/9645447/379593
    alphaPart.sort(function(a, b) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    // sort in ascending order
    numericPart.sort(function(a, b) {return parseFloat(a) - parseFloat(b)});

      return result.concat(alphaPart, numericPart);
  }


  /**
   *
   * Utility function that splits the lineage into taxonomic levels
   * and returns the taxonomic level specified
   *
   * @param {String} lineage The taxonomic string, with levels seperated by
   * semicolons.
   * @param {Integer} levelIndex The taxonomic level to truncate to.
   * 1 = Kingdom, 2 = Phylum, etc.
   *
   * @return {String} The taxonomic string truncated to desired level.
   * @function truncateLevel
   */
  function truncateLevel(lineage, levelIndex) {
    if (levelIndex === 0) {
      return lineage;
    }
    var levels = lineage.split(';');
    var taxaLabel = '';
    for (var i = 0; (i < levelIndex && i < levels.length); i++) {
      var level = levels[i];
      if (level[level.length - 1] == '_') {
        taxaLabel += ';' + level;
      }else {
        taxaLabel = level;
      }
    }
    return taxaLabel;
  }

  /**
   *
   * Utility function to convert an XML DOM documents to a string useful for
   * unit testing. This code is based on
   * [this SO answer]{@link http://stackoverflow.com/a/1750890}
   *
   * @param {Node} node XML DOM object, usually as created by the document
   * object.
   *
   * @return {String} Representation of the node object.
   * @function convertXMLToString
   */
  function convertXMLToString(node) {
    if (typeof(XMLSerializer) !== 'undefined') {
      var serializer = new XMLSerializer();
      return serializer.serializeToString(node);
    }
    else if (node.xml) {
      return node.xml;
    }
  }

  /**
   *
   * Split list of string values into numeric and non-numeric values
   *
   * @param {String[]} values The values to check
   * @return {Object} Object with two keys, `numeric` and `nonNumeric`.
   * `numeric` holds an array of all numeric values found. `nonNumeric` holds
   * an array of the remaining values.
   */
   function splitNumericValues(values) {
    var numeric = [];
    var nonNumeric = [];
    _.each(values, function(element) {
        // http://stackoverflow.com/a/9716488
        if (!isNaN(parseFloat(element)) && isFinite(element)) {
          numeric.push(element);
        }
        else {
          nonNumeric.push(element);
        }
      });
    return {numeric: numeric, nonNumeric: nonNumeric};
   }

  /**
   *
   * Escape special characters in a string for use in a regular expression.
   * Credits go to [this SO answer]{@link http://stackoverflow.com/a/5306111}
   *
   * @param {String} regex string to escape for use in a regular expression.
   *
   * @return {String} String with escaped characters for use in a regular
   * expression.
   * @function escapeRegularExpression
   */
  function escapeRegularExpression(regex) {
    return regex.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }

  /**
   *
   * Clean a string in HTML formatted strings that get created with the
   * namespace tag in some browsers and not in others. Intended to facilitate
   * testing.
   *
   * @param {String} htmlString string to remove namespace from.
   *
   * @return {String} String without namespace.
   * @function cleanHTML
   */
  function cleanHTML(htmlString) {
    return htmlString.replace(' xmlns="http://www.w3.org/1999/xhtml"', '');
  }

  return {'truncateLevel': truncateLevel, 'naturalSort': naturalSort,
          'convertXMLToString': convertXMLToString,
          'escapeRegularExpression': escapeRegularExpression,
          'cleanHTML': cleanHTML, 'splitNumericValues': splitNumericValues};
});
