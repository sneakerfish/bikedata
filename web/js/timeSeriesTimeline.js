
/*
 * TimeSeriesTimeline - ES6 Class
 * @param  parentElement 	-- the HTML element in which to draw the visualization
 * @param  data             -- the data the timeline should use
 */

class TimeSeriesTimeline {

	// constructor method to initialize TimeSeriesTimeline object
	constructor(parentElement, data, cities, parentVis, idPrefix) {
		this._parentElement = parentElement;
		this._data = data;

		// No data wrangling, no update sequence
		this._displayData = data;
		this.cities = new Set(cities);
		this.parentVis = parentVis;
		this.idPrefix = idPrefix;

		this.isInit = false;

		this.initVis();
	}

	// create initVis method for TimeSeriesTimeline class
	initVis() {

		// store keyword this which refers to the object it belongs to in variable vis
		let vis = this;

		vis.margin = {top: 0, right: 40, bottom: 30, left: 50};

		// vis.width = document.getElementById(vis._parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
		// vis.height = document.getElementById(vis._parentElement).getBoundingClientRect().height  - vis.margin.top - vis.margin.bottom;

		vis.width = document.getElementById(vis._parentElement).parentElement.parentElement.parentElement.getBoundingClientRect().width - vis.margin.left - vis.margin.right;
		vis.height = 150 - vis.margin.top - vis.margin.bottom;

		// SVG drawing area
		vis.svg = d3.select("#" + vis._parentElement).append("svg")
			.attr("width", vis.width + vis.margin.left + vis.margin.right)
			.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
			.append("g")
			.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

		// Scales and axes
		vis.x = d3.scaleTime()
			.range([0, vis.width])

		vis.y = d3.scaleLinear()
			.range([vis.height, 0])


		vis.xAxis = d3.axisBottom()
			.scale(vis.x);

		// SVG area path generator
		vis.area = d3.area().x(d => vis.x(d.trip_date))
			.y0(vis.height)
			.y1(d => vis.y(d.trip_count));

		vis.areaPath = vis.svg.append("path");

		vis.wrangleData();

		// Initialize brush component on top of the area
		vis.brush = d3.brushX()
			.extent([[0, 0], [vis.width, vis.height]])
			.on("brush", d => vis.parentVis.brushUpdate())
			.on("end", d => vis.parentVis.brushUpdate());

		// Append brush component here
		vis.svg.append("g")
			.attr("class", vis.idPrefix+"Brush")
			.call(vis.brush)
			.selectAll("rect")
			.attr("y", -6)
			.attr("height", vis.height + 7);

		this.isInit = true;
	}

	wrangleData() {
		let vis = this;

		vis._displayData =  vis.groupByTripDate(vis._data.filter(d => vis.cities.has(d.city)));

		vis.updateVis();
	}

	updateVis() {
		let vis = this;

		// we want to keep the x-axis constant
		if (!vis.isInit) {
			vis.x.domain(d3.extent(vis._displayData, d => d.trip_date));
			vis.y.domain([0, d3.max(vis._displayData, d => d.trip_count)]);

			// Append x-axis
			vis.svg.append("g")
				.attr("class", "x-axis axis")
				.attr("transform", "translate(0," + vis.height + ")")
				.call(vis.xAxis);
		}

		vis.areaPath.datum(vis._displayData)
			.attr("class", "brushAreaPath")
			.transition()
			.attr("d", vis.area);
	}

	groupByTripDate(tripData) {
		var result = [];
		tripData.reduce(function(res, value) {
			if (!res[value.trip_date]) {
				res[value.trip_date] = { trip_date: value.trip_date, trip_count: 0 };
				result.push(res[value.trip_date])
			}
			res[value.trip_date].trip_count += value.trip_count;
			return res;
		}, {});

		result.sort((a,b) => b.trip_date - a.trip_date)
		return result;
	}
}