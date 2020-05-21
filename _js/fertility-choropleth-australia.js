(function() {

var REPL = {};
var aREPL = {};
var year = 2011; // I guess?
aREPL[year] = {};
var mydir = "/_data/fert-australia/";

var races = ['WHITE', 'BLACK', 'YELLOW', 'RED', 'BROWN', 'BRONZE'];

var data;
// var backgroundGeometries;
var SA3Geometries;
var SA4Geometries;
var GCCGeometries;
var STEGeometries;
var NATGeometries;

d3.queue()
  .defer(d3.json, mydir + "aus-quantize.topojson")
  .await(function(error, mydata, NUTS) {
    data = mydata;

    function groupGeometries(higherGeometries, codeFunction, nameFunction) {
      var Groups = {};
      var names = {}; // this line is extra compared to the British script
      higherGeometries.geometries.forEach(function(q) {
        code = codeFunction(q)
        if (!(code in Groups)) Groups[code] = [];
        Groups[code].push(q);
        if (!(code in names)) names[code] = nameFunction(q);
      });
      myGeometries = {type: "GeometryCollection", geometries: []};
      for (code in Groups) {
        newGroup = topojson.mergeArcs(data, Groups[code]);
        newGroup.properties = {};
        newGroup.properties.SACode = code;
        newGroup.properties.SAName = names[code];
        myGeometries.geometries.push(newGroup);
      };
      return myGeometries;
    };

    var localGeometries = data.objects.divisions;
    SA3Geometries = groupGeometries(localGeometries, q => q.properties.SA3_CODE16, q => q.properties.SA3_NAME16);
    SA4Geometries = groupGeometries(localGeometries, q => q.properties.SA4_CODE16, q => q.properties.SA4_NAME16);
    GCCGeometries = groupGeometries(localGeometries, q => q.properties.GCC_CODE16, q => q.properties.GCC_NAME16);
    STEGeometries = groupGeometries(localGeometries, q => q.properties.STE_CODE16, q => q.properties.STE_NAME16);
    NATGeometries = groupGeometries(localGeometries, q => 'X', q => 'Australia');
    SA3toGCC = {};
    localGeometries.geometries.forEach(q => {
      SA3toGCC[q.properties.SA3_CODE16] = q.properties.GCC_CODE16;
    });

    function getRates(race) {
      REPL[race] = {};
      aREPL[year][compressedRaces[race]] = {};
      myqueue.defer(d3.tsv, mydir + 'REPL/' + race + '.tsv', function(d) {
        var SA3 = d.id;
        var SA4 = d.id.slice(0,3);
        var GCC = SA3toGCC[d.id];
        var STE = d.id[0];
        var NAT = 'X'
        var array = [SA3, SA4, GCC, STE, NAT];
        for (index in array) {
          var el = array[index];
          if (!(el in REPL[race])) REPL[race][el] = {mothers:0, kids:0};
          REPL[race][el].mothers += +d.mothers;
          REPL[race][el].kids += +d.kids;
          aREPL[year][compressedRaces[race]][el] = 6*REPL[race][el].kids / REPL[race][el].mothers;
        };
      });
    }
    var myqueue = d3.queue();
    getRates(races[0]);
    myqueue.await(draw_svg);
    var myqueue = d3.queue();
    races.slice(1).forEach(race => getRates(race));

  } ) ;

function draw_svg(error) {
  var choro = new fertChoro('#choropleth-australia');

  SA3 = topojson.feature(data, SA3Geometries);
  SA4 = topojson.feature(data, SA4Geometries);
  GCC = topojson.feature(data, GCCGeometries);
  STE = topojson.feature(data, STEGeometries);
  NAT = topojson.feature(data, NATGeometries);
  [SA3, SA4, GCC, STE, NAT].forEach(function(FC) {
    FC.features.forEach(function(feature) {
      Object.assign(feature.properties, {
        code: feature.properties.SACode,
        name: feature.properties.SAName
      });
    });
  });

  var SA3Layer = choro.svg.insert("g", ".hoverOutline");
  var SA3Selection = SA3Layer.selectAll("path")
    .data(SA3.features);
  var SA4Layer = choro.svg.insert("g", ".hoverOutline");
  var SA4Selection = SA4Layer.selectAll("path")
    .data(SA4.features);
  var GCCLayer = choro.svg.insert("g", ".hoverOutline");
  var GCCSelection = GCCLayer.selectAll("path")
    .data(GCC.features);
  var STELayer = choro.svg.insert("g", ".hoverOutline");
  var STESelection = STELayer.selectAll("path")
    .data(STE.features);
  var NATLayer = choro.svg.insert("g", ".hoverOutline");
  var NATSelection = NATLayer.selectAll("path")
    .data(NAT.features);

  var SelectionNames = {
    "SA3": SA3Selection,
    "SA4": SA4Selection,
    "GCC": GCCSelection,
    "State": STESelection,
    "Nation": NATSelection
  };

  var regionButtonData = {
    "SA3": SA3Layer,
    "SA4": SA4Layer,
    "GCC": GCCLayer,
    "State": STELayer,
    "Nation": NATLayer
  };

  Object.values(regionButtonData).forEach(function(selection) {
    selection.attr("class", "division")
  });

  choro.setInputs(aREPL, SelectionNames);

  var widget = new fertWidget('#widget-australia', choro);
  widget.currentRace = "WHITE"; // temporary becasue the default is "EVERYONE" which hasn't been defined for Australia yet

  var raceButtonData = races;
  widget.populateButtons(regionButtonData, raceButtonData);
  widget.displayRegion("State");
};

} )();
