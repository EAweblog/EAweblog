(function() {

var LSADsuffixes = {'00':'', '03':' City and Borough', '04':' Borough', '05':' Census Area', '06':' County', '07':' District', '10':' Island', '12':' Municipality', '13':' Municipio', '15':' Parish', '20':' barrio', '21':' borough', '22':' CCD', '23':' census subarea', '24':' census subdistrict', '25':' city'};
var FIPSstateCodes = {'01':'Alabama', '02':'Alaska', '04':'Arizona', '05':'Arkansas', '06':'California', '08':'Colorado', '09':'Connecticut', '10':'Delaware', '11':'District of Columbia', '12':'Florida', '13':'Geogia', '15':'Hawaii', '16':'Idaho', '17':'Illinois', '18':'Indiana', '19':'Iowa', '20':'Kansas', '21':'Kentucky', '22':'Louisiana', '23':'Maine', '24':'Maryland', '25':'Massachusetts', '26':'Michigan', '27':'Minnesota', '28':'Mississippi', '29':'Missouri', '30':'Montana', '31':'Nebraska', '32':'Nevada', '33':'New Hampshire', '34':'New Jersey', '35':'New Mexico', '36':'New York', '37':'North Carolina', '38':'North Dakota', '39':'Ohio', '40':'Oklahoma', '41':'Oregon', '42':'Pennsylvania', '44':'Rhode Island', '45':'South Carolina', '46':'South Dakota', '47':'Tennessee', '48':'Texas', '49':'Utah', '50':'Vermont', '51':'Virginia', '53':'Washington', '54':'West Virginia', '55':'Wisconsin', '56':'Wyoming'};

var CRR = {};
var ACE  = {};
var races = ['E', 'W', 'B', 'R', 'Y'];
var years = d3.range(2000, 2021).map(y => String(y));
var mydir = "/_data/fert-USA/"

var data;
var backgroundGeometries;
var countyGeometries;
var stateGeometries;
var CBSAGeometries;
var CSAGeometries;
var NationGeometry;
d3.queue()
  .defer(d3.json, mydir + "USA-quantize.topojson")
  .defer(d3.csv, mydir + "PSA-delineations.csv")
  .await(function(error, mydata, Delineations) {
    data = mydata;
    var FIPStoCBSA = {};
    var FIPStoCSA = {};
    Delineations.forEach(function(line) {
      FIPS = line.FIPS;
      M = 'M' + line.CBSACode;
      FIPStoCBSA[FIPS] = {code: M, name: line.CBSATitle};
      if (!(line.CSACode === "nan")) {
        P = 'P' + line.CSACode;
        FIPStoCSA[FIPS] = {code: P, name: line.CSATitle};
      };
    });
    var myGeometries = data.objects.divisions.geometries
    backgroundGeometries = {type: "GeometryCollection", geometries: myGeometries.filter(function(q) {return q.properties.NAME === null;} ) };
    countyGeometries = {type: "GeometryCollection", geometries: myGeometries.filter(function(q) {return q.properties.GEOID !== null;} ) };

    var stateCounties = {};
    var CBSACounties = {};
    var CSACounties = {};
    countyGeometries.geometries.forEach(function(q) {
      q.properties.code = q.properties.GEOID;
      q.properties.name = q.properties.NAME + LSADsuffixes[q.properties.LSAD] + ', ' + FIPSstateCodes[q.properties.STATEFP];
      if (!(q.properties.STATEFP in stateCounties)) stateCounties[q.properties.STATEFP] = [];
      stateCounties[q.properties.STATEFP].push(q);
      FIPS = q.properties.STATEFP + q.properties.COUNTYFP;
      if (FIPS in FIPStoCBSA) {
        var CBSA = FIPStoCBSA[FIPS];
        if (!(CBSA.code in CBSACounties)) CBSACounties[CBSA.code] = {name: CBSA.name, counties: []};
        CBSACounties[CBSA.code].counties.push(q);
      };
      if (FIPS in FIPStoCSA) {
        var CSA = FIPStoCSA[FIPS];
        if (!(CSA.code in CSACounties)) CSACounties[CSA.code] = {name: CSA.name, counties: []};
        CSACounties[CSA.code].counties.push(q);
      };
    });

    stateGeometries = {type: "GeometryCollection", geometries: []};
    for (k in stateCounties) {
      newState = topojson.mergeArcs(data, stateCounties[k]);
      newState.properties = {code: k, name: FIPSstateCodes[k]};
      stateGeometries.geometries.push(newState);
    };

    CBSAGeometries = {type: "GeometryCollection", geometries: []};
    for (k in CBSACounties) {
      newCBSA = topojson.mergeArcs(data, CBSACounties[k].counties);
      newCBSA.properties = {code: k, name: CBSACounties[k].name + ' MSA'};
      CBSAGeometries.geometries.push(newCBSA);
    }

    CSAGeometries = {type: "GeometryCollection", geometries: []};
    for (k in CSACounties) {
      newCSA = topojson.mergeArcs(data, CSACounties[k].counties);
      newCSA.properties = {code: k, name: CSACounties[k].name + ' CSA'};
      CSAGeometries.geometries.push(newCSA);
    }

    NationGeometry = {type: "GeometryCollection", geometries: [topojson.mergeArcs(data, Object.values(stateGeometries.geometries))]};
    NationGeometry.geometries[0].properties = {code: '0', name: 'United States of America'};

    function getData(year) {
      CRR[year] = {};
      ACE[year]  = {};
      races.forEach(function(r) {
        CRR[year][r] = {};
        ACE[year][r] = {};
      });
      myqueue.defer(d3.tsv, mydir + 'DATA/' + year + '.tsv', function (d) {
        races.forEach(function(r) {
          CRR[year][r][d.GEO] = +d[r+'_CRR'];
          ACE[year][r][d.GEO] = parseInt(d[r+'_ACE']);
        });
      });
    }
    //var myqueue = d3.queue();
    //getData(years[0]);
    //myqueue.await(draw_svg);
    //var myqueue = d3.queue();
    //years.slice(1).forEach(year => getData(year));
    var myqueue = d3.queue();
    years.forEach(year => getData(year));
    myqueue.await(draw_svg);

  } ) ;

function draw_svg(error) {
  var choro = new fertChoro('#choropleth-usa');

  var background = topojson.feature(data, backgroundGeometries);
  var counties = topojson.feature(data, countyGeometries);
  var states = topojson.feature(data, stateGeometries);
  var CBSAs = topojson.feature(data, CBSAGeometries);
  var CSAs = topojson.feature(data, CSAGeometries);
  var nation = topojson.feature(data, NationGeometry);

  var backgroundCountries = choro.svg.insert("path", ".hoverOutline")
    .datum(background)
    .attr("class", "background")
    .attr("d", path);

  var CountyLayer = choro.svg.insert("g", ".hoverOutline")
    .attr("fill-opacity", .2);
  var CountySelection = CountyLayer.selectAll("path")
    .data(counties.features);

  var StateMesh = CountyLayer.append("path")
    .attr("class", "division")
    .datum(topojson.mesh(data, stateGeometries))
    .attr("d", path)
    .style("fill", "none");

  var CBSALayer = choro.svg.insert("g", ".hoverOutline");
  var CBSASelection = CBSALayer
    .attr("class", "division")
    .style("stroke", "silver")
    .selectAll("path")
    .data(CBSAs.features);

  var CSALayer = choro.svg.insert("g", ".hoverOutline");
  var CSASelection = CSALayer
    .attr("class", "division")
    .style("stroke", "gray")
    .selectAll("path")
    .data(CSAs.features);

  var StateLayer = choro.svg.insert("g", ".hoverOutline");
  var StateSelection = StateLayer
    .attr("class", "division")
    .selectAll("path")
    .data(states.features);

  var NationLayer = choro.svg.insert("g", ".hoverOutline");
  var NationSelection = NationLayer.selectAll("path")
    .attr("class", "division")
    .data(nation.features);

  var SelectionNames = {
    "County": CountySelection,
    "CBSA": CBSASelection,
    "CSAS": CSASelection,
    "State": StateSelection,
    "Nation": NationSelection
  };

  choro.displayLayer = function(layer) {
    if (layer === CSALayer) {
      this.displayLayer(CBSALayer);
      CSALayer.attr("display", "inline");
      return;
    }
    this.hideLayers();
    if (layer === CBSALayer) {
      CountyLayer.attr("display", "inline");
      CBSALayer.attr("display", "inline");
    }
    else layer.attr("display", "inline");
  }

  choro.setInputs(CRR, SelectionNames, ACE);
  var widget = new fertWidget("#widget-usa", choro);

  var regionButtonData = {
    'Counties': CountyLayer,
    'CBSAs': CBSALayer,
    'PSAs': CSALayer,
    'States': StateLayer,
    'Nation': NationLayer
  };

  var raceButtonData = races.map(r => expandedRaces[r])
  widget.populateButtons(regionButtonData, raceButtonData);
  d3.selectAll(".tick text").each(function(_,i){
    if(i%3 !== 0) d3.select(this).remove();
  });

  widget.displayRegion("States");
}

} )();
