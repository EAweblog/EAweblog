//Containing functions common to each fertility choropleth

var compressedRaces = {
  "EVERYONE": "E",
  "WHITE":    "W",
  "BLACK":    "B",
  "RED":      "R",
  "YELLOW":   "Y",
  "BROWN":    "N",
  "BRONZE":   "Z"
}

var expandedRaces = {
  "E": "EVERYONE",
  "W": "WHITE",
  "B": "BLACK",
  "R": "RED",
  "Y": "YELLOW",
  "N": "BROWN",
  "Z": "BRONZE"
}

var color1 = d3.scaleThreshold()
    .domain([0.73,0.79,0.85,0.91,0.97,1.03,1.09,1.15,1.21,1.27])
    .range(["#A50026", "#D73027", "#F46D43", "#FDAE61", "#FEE08B", "#FFFFBF", "#D9EF8B", "#A6D96A", "#66BD63", "#1A9850", "#006837"]);
var color2 = d3.scaleLinear()
    .domain([0.73, 1.00, 1.27])
    .range(["orange", "white", "blue"])
    .clamp(true);
var colorDefs = {
  'normal': color1,
  'colorblind': color2
}
function mycolor(r, colorScheme = color1) {
  return r === 0.0 ? "#fff" : colorScheme(r);
}

function myformat(r) {
  return r === 0.0 ? "N/A" : r.toFixed(2);
}

var path = d3.geoPath();

var hoverPathWidth = 2;

function getParentSVG(thiz) {
  while (thiz.tagName != "svg") {
    thiz = thiz.parentNode;
  }
  return d3.select(thiz);
}

function mouseOverEvent(d) {
  var thiz = d3.select(this);
  svg = getParentSVG(this);
  hoverPath = svg.select(".hoverPath");
  hoverPath.attr('d', thiz.attr('d'));

  var tooltip_div = document.getElementById('tooltip');
  tooltip_div.style.display = "inline";
  tooltip_div.style.background = d.fill
  if ((0.79 <= d.rate && d.rate <= 1.21) || d.rate === 0) {tooltip_div.style.color = "black";}
  else {tooltip_div.style.color = "white";}
  tooltip_div.innerHTML = d.title;

  window.onmousemove = function (e) {
    var x = e.clientX,
        y = e.clientY;
    tooltip_div.style.left = (x + 20) + 'px';
    tooltip_div.style.top = (y + 20) + 'px';
  };
};

function mouseLeaveEvent() {
  svg = getParentSVG(this);
  hoverPath = svg.select(".hoverPath");
  hoverPath.attr('d', "M0,0");
  document.getElementById('tooltip').style.display = "none";
};

function zoomed() {
  svg = getParentSVG(this)
  svg.selectAll("svg > g, svg > path")
    .attr("transform", d3.event.transform)
    .attr("stroke-width", 1/d3.event.transform.k);
  hoverPath = svg.select(".hoverPath")
  hoverPath.attr("stroke-width", hoverPathWidth/d3.event.transform.k);
};

function fertChoro(selector) { // fertility choropleth
  this.svg = d3.select(selector);
  this.setHoverPath();
  this.setZoom();
}
fertChoro.prototype = {
  constructor: fertChoro, // IS THIS NECESSARY?
  hoverPathWidth: 2,
  setHoverPath: function() {
    this.hoverPath = this.svg.append('path')
      .attr("stroke-width", this.hoverPathWidth)
      .attr("class", "hoverOutline hoverPath")
      .attr("d","M0,0");
  },
  setZoom: function () {
    var [width,height] = this.svg.attr("viewBox").split(' ').slice(2,4).map(x => parseInt(x));
    var zoom = d3.zoom()
      .scaleExtent([1, 8])
      .translateExtent([[0,0],[width,height]])
      .extent([[0,0],[width,height]])
      .on("zoom", zoomed);
    this.svg.call(zoom);
  },
  setInputs: function(REPL, SelectionNames, ACE) {
    this.REPL = REPL;
    this.ACE  = ACE;
    this.years = Object.keys(REPL);
    this.year = d3.max(this.years);
    this.SelectionNames = SelectionNames;
    this.Entrances = {}
    for (var key in this.SelectionNames) {
      var selection = this.SelectionNames[key];
      var entrance = selection.enter().append("path")
        .attr("d", path)
        .on('mouseover', mouseOverEvent)
        .on('mouseleave', mouseLeaveEvent)
      this.Entrances[key] = entrance; // need to cache the entrance for use in displayRace because the alternative is to use Selection.enter().selectAll("path") which takes fucking forever to execute
    }
  },
  hideLayers: function() {
    this.svg.selectAll("svg > g").attr("display", "none");
  },
  displayLayer: function(layer) {
    this.hideLayers();
    layer.attr("display", "inline");
  },
  displayRace: function(race, colorScheme) {
    var choro = this; // to use in the context of the function below
    var race = compressedRaces[race];
    var REPLhere = choro.REPL[choro.year][race];
    var ACEhere  = (choro.ACE == undefined ? undefined : choro.ACE[choro.year][race]);
    for (var key in choro.SelectionNames) { // choro or this could be used interchangeably here
      entrance = choro.Entrances[key]; // need to use cached entrance because the alternative is to use Selection.enter().selectAll("path") which takes fucking forever to execute

      entrance.each(function(d) {
        d.rate = REPLhere[d.properties.code];
        if (d.rate === undefined) d.rate = 0;
        d.ace  = (ACEhere == undefined ? undefined : ACEhere[d.properties.code]);
        d.fill = mycolor(d.rate, colorScheme);
        d.title = d.properties.name + ': '
          + '<br>CRR: ' + myformat(d.rate)
          + '<br>ACE: ' + d.ace; // (d.ace === undefined ? 'N/A' : d.ace);
      })
      .attr("fill", d => d.fill);
    }
  },
};

function toggle(buttonNode) {
  var sameButtons = d3.select(buttonNode.parentNode).selectAll("td");
  sameButtons.style("background-color", '#fff');
  d3.select(buttonNode).style("background-color", '#ddd');
}
function fertWidget(selector, choro) {
  var widget = this;
  widget.choro = choro;
  widget.selection = d3.select(selector);
  widget.buttonTable = widget.selection.append("table");
}
fertWidget.prototype = {
  constructor: fertWidget,
  currentRace: "EVERYONE",
  colorScheme: "normal",
  buttonData: {}, // in general this will cause collision errors if two buttons in different contexts have the same name
  buttonNodes: {},
  populateSlider: function() {
    var widget = this;
    var years = widget.choro.years;

    var sliderRow = widget.buttonTable.append("tr");
    sliderRow.append("td").html("Year:" );
    sliderRow.append("td").attr("id", "slider-time");

    var sliderTime = d3
      .sliderBottom()
      .min(d3.min(years))
      .max(d3.max(years))
      .marks(years)
      .width(300)
      //.height(0)
      .tickFormat(d3.format("")) // Bostock, plox to be removing default commas
      .tickValues(years)
      .default(d3.max(years))
      .on('onchange', val => {widget.displayYear(val)});

    var gTime = d3
      .select('td#slider-time')
      .append('svg')
      .style('background', 'none')
      .attr('overflow', 'visible')
      .attr('height', '90')
      .attr('width', '100%')
      .attr('viewBox', '0 0 300 70')
      .append('g')
      .attr('transform', 'translate(0,25)');

    gTime.call(sliderTime);

    d3.select('p#value-time').text(d3.timeFormat('%Y')(sliderTime.value()))
  },
  populateButtonRow: function(label, buttonData, method) {
    var widget = this;
    Object.assign(widget.buttonData, buttonData) // widget.buttonData.update(buttonData) ???
    var buttonRow = widget.buttonTable.append("tr");
    buttonRow.append("td").html(label + ": ");
    buttonRow
      .append("td")
      .selectAll("td")
      .data(Object.keys(buttonData))
      .enter().append("td")
      .style("cursor", "pointer")
      .style("display", "inline-block")
      .each(function(key) {
        widget.buttonNodes[key] = this;
      })
      .on("click", key => widget[method](key) ) // I expect to be able to pass method as the second argument here but for reasons unknown to me doing so causes the wrong this binding in the method execution
      .text(key => key);
  },
  displayRegion: function(region) {
    var widget = this;
    widget.choro.displayLayer(widget.buttonData[region]);
    toggle(widget.buttonNodes[region])
  },
  displayRace: function(race) {
    var widget = this;
    widget.currentRace = race;
    widget.choro.displayRace(race, widget.colorScheme);
    toggle(widget.buttonNodes[race]);
  },
  displayColor: function(key) {
    var widget = this;
    widget.colorScheme = widget.buttonData[key];
    widget.displayRace(widget.currentRace);
    toggle(widget.buttonNodes[key]);
  },
  displayYear: function(key) {
    var widget = this;
    widget.choro.year = key;
    widget.displayRace(widget.currentRace);
  },
  populateButtons: function (regionButtonData, races) {
    var widget = this;
    var raceButtonData = {};
    races.forEach(race => raceButtonData[race] = race);
    widget.populateSlider();
    widget.populateButtonRow("Region", regionButtonData, "displayRegion");
    widget.populateButtonRow("Racial Group", raceButtonData, "displayRace");
    widget.populateButtonRow("Color Scheme", colorDefs, "displayColor");
    widget.displayColor(widget.colorScheme);
  },
};
