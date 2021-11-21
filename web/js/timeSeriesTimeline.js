
/*
 * TimeSeriesTimeline - ES6 Class
 * @param  parentElement 	-- the HTML element in which to draw the visualization
 * @param  data             -- the data the timeline should use
 */

class TimeSeriesTimeline {

	// constructor method to initialize TimeSeriesTimeline object
	constructor(parentElement, data){
		this._parentElement = parentElement;
		this._data = data;

		// No data wrangling, no update sequence
		this._displayData = data;

		this.initVis();
	}

	// create initVis method for TimeSeriesTimeline class
	initVis() {

		// store keyword this which refers to the object it belongs to in variable vis
		let vis = this;

		vis.margin = {top: 0, right: 40, bottom: 30, left: 100};

		// vis.width = document.getElementById(vis._parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
		// vis.height = document.getElementById(vis._parentElement).getBoundingClientRect().height  - vis.margin.top - vis.margin.bottom;

		vis.width = document.getElementById(vis._parentElement).parentElement.parentElement.getBoundingClientRect().width - vis.margin.left - vis.margin.right;
		vis.height = 150  - vis.margin.top - vis.margin.bottom;


		// SVG drawing area
		vis.svg = d3.select("#" + vis._parentElement).append("svg")
			.attr("width", vis.width + vis.margin.left + vis.margin.right)
			.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
			.append("g")
			.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

		// Scales and axes
		vis.x = d3.scaleTime()
			.range([0, vis.width])
			.domain(d3.extent(vis._displayData, function(d) { return d.trip_date; }));

		vis.y = d3.scaleLinear()
			.range([vis.height, 0])
			.domain([0, d3.max(vis._displayData, function(d) { return d.trip_count; })]);

		vis.xAxis = d3.axisBottom()
			.scale(vis.x);

		// SVG area path generator
		vis.area = d3.area()
			.x(function(d) { return vis.x(d.trip_date); })
			.y0(vis.height)
			.y1(function(d) { return vis.y(d.trip_count); });

		// Draw area by using the path generator
		vis.svg.append("path")
			.datum(vis._displayData)
			.attr("fill", "#ccc")
			.attr("d", vis.area);

		// Initialize brush component
		let brush = d3.brushX()
			.extent([[0, 0], [vis.width, vis.height]])
			.on("brush", timeSeriesBrushed);

        // Append brush component here
		vis.svg.append("g")
			.attr("class", "x brush")
			.call(brush)
			.selectAll("rect")
			.attr("y", -6)
			.attr("height", vis.height + 7);

		// Append x-axis
		vis.svg.append("g")
			.attr("class", "x-axis axis")
			.attr("transform", "translate(0," + vis.height + ")")
			.call(vis.xAxis);
	}
}