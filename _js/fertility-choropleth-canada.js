(function() {

var REPL = {};
var races = ['WHITE', 'BLACK', 'YELLOW', 'RED', 'BROWN'];
var year = 2011; // I guess?
REPL[year] = {};
var temp = REPL[year];
var mydir = "/_data/fert-canada/";

var data;
d3.queue()
  .defer(d3.json, mydir + "can-quantize.topojson")
  .await(function(error, mydata) {
    data = mydata;
    function getRates(race) {
      let REPL = temp;
      var r = race;
      var race = compressedRaces[race];
      REPL[race] = {};
      myqueue.defer(d3.tsv, mydir + 'REPL/' + r + '.tsv', function(d) {
        if (d.id.length === 5)      REPL[race][d.id.slice(2)] = +d.rate;
        else if (d.id.length === 2) REPL[race][parseInt(d.id)] = +d.rate;
        else if (d.id.length === 3) REPL[race][d.id] = +d.rate;
      } ); // rural data points
    }
    var myqueue = d3.queue();
    getRates(races[0]);
    myqueue.await(draw_svg);
    var myqueue = d3.queue();
    races.slice(1).forEach(race => getRates(race));
  } );

function draw_svg(error) {
  var choro = new fertChoro('#choropleth-canada');

  var myGeometries = data.objects.divisions.geometries

  var backgroundGeometries = {type: "GeometryCollection", geometries: myGeometries.filter(function(q) {return q.properties.name_1 === "BACKGROUND" || q.provnum_ne !== null;} ) };
  var provinceGeometries = {type: "GeometryCollection", geometries: myGeometries.filter(function(q) {return q.properties.provnum_ne !== null;} ) };
  var CMAGeometries = {type: "GeometryCollection", geometries: myGeometries.filter(function(q) { return q.properties.CMAUID !== null;} ) };

  NationGeometry = {type: "GeometryCollection", geometries: [topojson.mergeArcs(data, Object.values(provinceGeometries.geometries))]};

  var background = topojson.feature(data, backgroundGeometries);
  var provinces = topojson.feature(data, provinceGeometries);
  provinces.features.forEach(function(feature) {
    feature.properties = {
      code: feature.properties.provnum_ne,
      name: feature.properties.name_1};
  } );
  var r_provinces = topojson.feature(data, provinceGeometries); // "Rural" provinces
  r_provinces.features.forEach(function(feature) {
    feature.properties = {
      code: 'R' + feature.properties.provnum_ne,
      name: '"Rural" ' + feature.properties.name_1};
  } );
  var CMAs = topojson.feature(data, CMAGeometries);
  CMAs.features.forEach(function(feature) {
    feature.properties.code = feature.properties.CMAUID;
    feature.properties.name = feature.properties.CMANAME;
  })
  var nation = topojson.feature(data, NationGeometry);
  Object.assign(nation.features[0].properties, {code: '1', name: 'Canada'});

  var backgroundCountries = choro.svg.insert("path", ".hoverOutline")
    .datum(background)
    .attr("class", "background")
    .attr("d", path);

  var CMALayer = choro.svg.insert("g", ".hoverOutline") // necessary ? //
  var RuralLayer = CMALayer.insert("g", ".hoverOutline");
  var RuralSelection = RuralLayer
    .attr("class", "division")
    .style("fill-opacity", "0.5")
    .selectAll("path")
    .data(r_provinces.features)

  var CMAAlone = CMALayer.append("g", ".hoverOutline");
  var CMASelection = CMAAlone
    .attr("class", "division")
    .selectAll("path")
    .data(CMAs.features)

  var ProvinceLayer = choro.svg.insert("g", ".hoverOutline")
  var ProvinceSelection = ProvinceLayer
    .attr("class", "division")
    .selectAll("path")
    .data(provinces.features)

  var NationLayer = choro.svg.insert("g", ".hoverOutline")
  var NationSelection = NationLayer
    .attr("class", "division")
    .selectAll("path")
    .data(nation.features)

  var SelectionNames = {
    "Rural": RuralSelection,
    "CMA": CMASelection,
    "Province": ProvinceSelection,
    "Nation": NationSelection
  };

  choro.setInputs(REPL, SelectionNames);

  var widget = new fertWidget("#widget-canada", choro);
  widget.currentRace = "WHITE"; // temporary becasue the default is "EVERYONE" which hasn't been defined for Canada yet

  var regionButtonData = {
    'CMAs': CMALayer,
    'Provinces': ProvinceLayer,
    'Nation': NationLayer
  };
  var raceButtonData = races;
  widget.populateButtons(regionButtonData, raceButtonData);

  widget.displayRegion("Provinces");
};

} )();
