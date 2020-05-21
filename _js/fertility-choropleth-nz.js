(function() {

var REPL = {};
var races = ['WHITE', 'BLACK', 'YELLOW', 'RED', 'BROWN'];
var year = 2013; // I guess?
REPL[year] = {};
var mydir = "/_data/fert-nz/";

var data;
// var backgroundGeometries;
var REGGeometries;
var NATGeometries;

d3.queue()
  .defer(d3.json, mydir + "nz-quantize.topojson")
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
        newGroup.properties.Code = code;
        newGroup.properties.Name = names[code];
        myGeometries.geometries.push(newGroup);
      };
      return myGeometries;
    };

    REGGeometries = data.objects.divisions;
    REGGeometries.geometries.forEach(q => {
      q.properties.Name = q.properties.REGION;
      q.properties.Code = q.properties.REGION;
    });
    NATGeometries = groupGeometries(REGGeometries, q => 'Total, Regional Council Areas', q => 'New Zealand');

    function getRates(race) {
      var r = compressedRaces[race]
      REPL[year][r] = {};
      myqueue.defer(d3.tsv, mydir + 'REPL/' + race + '.tsv', function(d) {
        REPL[year][r][d.id] = +d.rate;
      });
    }
    var myqueue = d3.queue();
    getRates(races[0]);
    myqueue.await(draw_svg);
    var myqueue = d3.queue();
    races.slice(1).forEach(race => getRates(race));

  } ) ;

function draw_svg(error) {
  var choro = new fertChoro('#choropleth-nz')

  var REG = topojson.feature(data, REGGeometries);
  var NAT = topojson.feature(data, NATGeometries);
  [REG, NAT].forEach(function(FC) {
    FC.features.forEach(function(feature) {
      Object.assign(feature.properties, {
        code: feature.properties.Code,
        name: feature.properties.Name
      });
    });
  });

  var REGLayer = choro.svg.insert("g", ".hoverOutline");
  var REGSelection = REGLayer.selectAll("path")
    .data(REG.features);
  var NATLayer = choro.svg.insert("g", ".hoverOutline");
  var NATSelection = NATLayer.selectAll("path")
    .data(NAT.features);

  var SelectionNames = {
    "Region": REGSelection,
    "Nation": NATSelection
  };

  var regionButtonData = {
    "Region": REGLayer,
    "Nation": NATLayer
  };

  Object.values(regionButtonData).forEach(function(selection) {
    selection.attr("class", "division")
  });

  choro.setInputs(REPL, SelectionNames);

  var widget = new fertWidget('#widget-nz', choro);
  widget.currentRace = "WHITE"; // temporary becasue the default is "EVERYONE" which hasn't been defined for New Zealand yet

  var raceButtonData = races;
  widget.populateButtons(regionButtonData, raceButtonData);
  widget.displayRegion("Region");

};

} )();
