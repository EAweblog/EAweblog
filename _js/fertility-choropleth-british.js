(function() {

var REPL = {};
var aREPL = {}; // aggregate REPL
var year = 2011; // I guess?
aREPL[year] = {};
var races = ['WHITE', 'BLACK', 'YELLOW', 'RED', 'BROWN'];
var mydir = "/_data/fert-british/";

var data;
// var backgroundGeometries;
var NUTStoNames = {};
var NUTS3Geometries;
var NUTS2Geometries;
var NUTS1Geometries;
var CountryGeometries;
var NationGeometries;

d3.queue()
  .defer(d3.json, mydir + "brit-quantize.topojson")
  .defer(d3.tsv, mydir + "NUTSNAMES.tsv")
  .await(function(error, mydata, NUTS) {
    data = mydata;
    NUTS.forEach(function(line) {
      NUTStoNames[line.id] = line.name;
    });

    function groupGeometries(higherGeometries, codeFunction) {
      var Groups = {};
      higherGeometries.geometries.forEach(function(q) {
        code = codeFunction(q);
        if (!(code in Groups)) Groups[code] = [];
        Groups[code].push(q)
      });
      myGeometries = {type: "GeometryCollection", geometries: []};
      for (k in Groups) {
        newGroup = topojson.mergeArcs(data, Groups[k]);
        newGroup.properties = {};
        newGroup.properties.NUTS = k;
        myGeometries.geometries.push(newGroup);
      };
      return myGeometries;
    };

    var countryCodes = new Set(['UKM', 'UKL', 'UKN', 'IE0']); // except England
    function NUTStoCountry(NUTS) {
      code = NUTS.slice(0,3);
      if (countryCodes.has(code)) return code;
      else return 'UKZ'; // My NUTS code representing England, not official
    }

    var localGeometries = data.objects.divisions;
    NUTS3Geometries = groupGeometries(localGeometries, function(q) {return q.properties.NUTS});
    NUTS2Geometries = groupGeometries(NUTS3Geometries, function(q) {return q.properties.NUTS.slice(0,4)});
    NUTS1Geometries = groupGeometries(NUTS2Geometries, function(q) {return q.properties.NUTS.slice(0,3)});
    CountryGeometries = groupGeometries(NUTS1Geometries, function(q) {return NUTStoCountry(q.properties.NUTS)});
    NationGeometries = groupGeometries(CountryGeometries, function(q) {return q.properties.NUTS.slice(0,2)});

    var localIDtoNUTS = {};
    localGeometries.geometries.forEach(function(q) {
      localIDtoNUTS[q.properties.ID] = q.properties.NUTS;
    });

    function getRates(race) {
      REPL[race] = {};
      aREPL[year][compressedRaces[race]] = {};
      myqueue.defer(d3.tsv, mydir + 'REPL/' + race + '.tsv', function(d) {
        var NUTS3 = localIDtoNUTS[d.id];
        var NUTS2 = NUTS3.slice(0,4);
        var NUTS1 = NUTS2.slice(0,3);
        var Country = NUTStoCountry(NUTS1);
        var Nation = Country.slice(0,2);
        var array = [NUTS3, NUTS2, NUTS1, Nation];
        if (Country === 'UKZ') array.push(Country);
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
  var choro = new fertChoro('#choropleth-british');

  var NUTS3 = topojson.feature(data, NUTS3Geometries);
  var NUTS2 = topojson.feature(data, NUTS2Geometries);
  var NUTS1 = topojson.feature(data, NUTS1Geometries);
  var Countries = topojson.feature(data, CountryGeometries);
  var Nations = topojson.feature(data, NationGeometries);
  [NUTS3, NUTS2, NUTS1, Countries, Nations].forEach(function(FC) {
    FC.features.forEach(function(feature) {
      Object.assign(feature.properties, {
        code: feature.properties.NUTS,
        name: NUTStoNames[feature.properties.NUTS]
      });
    });
  });

  var NUTS3Layer = choro.svg.insert("g", ".hoverOutline");
  var NUTS3Selection = NUTS3Layer.selectAll("path")
    .data(NUTS3.features);
  var NUTS2Layer = choro.svg.insert("g", ".hoverOutline");
  var NUTS2Selection = NUTS2Layer.selectAll("path")
    .data(NUTS2.features);
  var NUTS1Layer = choro.svg.insert("g", ".hoverOutline");
  var NUTS1Selection = NUTS1Layer.selectAll("path")
    .data(NUTS1.features);
  var CountryLayer = choro.svg.insert("g", ".hoverOutline");
  var CountrySelection = CountryLayer.selectAll("path")
    .data(Countries.features);
  var NationLayer = choro.svg.insert("g", ".hoverOutline");
  var NationSelection = NationLayer.selectAll("path")
    .data(Nations.features);

  var SelectionNames = {
    "NUTS3": NUTS3Selection,
    "NUTS2": NUTS2Selection,
    "NUTS1": NUTS1Selection,
    "Country": CountrySelection,
    "Nation": NationSelection
  };

  var regionButtonData = {
    "NUTS3": NUTS3Layer,
    "NUTS2": NUTS2Layer,
    "NUTS1": NUTS1Layer,
    "Country": CountryLayer,
    "Nation": NationLayer
  };

  Object.values(regionButtonData).forEach(function(selection) {
    selection.attr("class", "division")
  });

  choro.setInputs(aREPL, SelectionNames);

  var widget = new fertWidget('#widget-british', choro);
  widget.currentRace = "WHITE"; // temporary becasue the default is "EVERYONE" which hasn't been defined for British Isles yet

  var raceButtonData = races;
  widget.populateButtons(regionButtonData, raceButtonData);
  widget.displayRegion("NUTS1");
};

} )();
