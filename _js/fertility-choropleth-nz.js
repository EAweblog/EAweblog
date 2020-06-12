(function() {

var CRR = {};
var ACE = {};
var races = ['E', 'W', 'B', 'R', 'Y', 'N', 'Z'];
var years = [2006, 2013, 2018];
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
    NATGeometries = groupGeometries(REGGeometries, q => 'Total - Regional Council Areas', q => 'New Zealand');

    function getData(year) {
      CRR[year] = {};
      ACE[year] = {};
      races.forEach(function(r) {
        CRR[year][r] = {};
        ACE[year][r] = {};
      });
      myqueue.defer(d3.tsv, mydir + 'DATA/' + year + '.tsv', function(d) {
        races.forEach(function(r) {
          CRR[year][r][d.GEO] = +d[r+'_CRR'];
          ACE[year][r][d.GEO] = parseInt(d[r+'_ACE']);
        });
      });
    }
    var myqueue = d3.queue();
    years.forEach(year => getData(year));
    myqueue.await(draw_svg);
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

  choro.setInputs(CRR, SelectionNames, ACE);

  var widget = new fertWidget('#widget-nz', choro);
  var raceButtonData = races.map(r => expandedRaces[r]);
  widget.populateButtons(regionButtonData, raceButtonData);
  widget.displayRegion("Region");

};

} )();
