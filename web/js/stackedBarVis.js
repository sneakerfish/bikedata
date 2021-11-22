
/*
 * StackedBarVis - Object constructor function
 * @param parentElement 	-- the HTML element in which to draw the visualization
 * @param data						-- the actual data: perDayData
 */

class StackedBarVis {

    constructor(parentElement, data, category_field) {
        this.parentElement = parentElement;
        this.data = data;
        this.category_field = category_field;
        this.categories = data.map((d) => d[category_field])
            .filter((e, i, a) => a.indexOf(e) == i);
        this.filteredData = this.data;

        this.initVis();
    }


    /*
     * Initialize visualization (static content, e.g. SVG area or axes)
     */

    initVis() {
        let vis = this;

        vis.margin = {top: 40, right: 0, bottom: 40, left: 40};
        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        // scales and axes
        vis.x = d3.scaleLinear()
            .range([0, vis.width]);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);

        vis.xAxis = d3.axisBottom()
            .scale(vis.x)
            .tickFormat(d3.timeFormat("%m/%Y"));

        vis.yAxis = d3.axisLeft()
            .scale(vis.y);

        // Add x and y axis groups
        vis.svg.append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.height + ")")
            .attr("class", "x-axis axis");

        vis.svg.append("g")
            .attr("transform", "translate(" + vis.margin.left + ",0)")
            .attr("class", "y-axis axis");

        vis.stack = d3.stack().keys(["bos", "sf", "nyc"]);

        vis.wrangleData();
    }


    wrangleData() {
        let vis = this;

        let layer_keys = {}
        vis.data.forEach((d) => {
            if (! layer_keys.hasOwnProperty(d.event_date)) {
                layer_keys[d.event_date] = {}
            }
            layer_keys[d.event_date][d.city] = d.station_count;
        })
        console.log(layer_keys);

        vis.stackedData = vis.stack(layer_keys);
        console.log(vis.stackedData);

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        let xExtent = d3.extent(vis.filteredData, (d) => d.event_date);
        vis.x.domain(xExtent);
        let yExtent = d3.max(vis.filteredData, (d) => d.station_count);
        vis.y.domain([0, yExtent]);
        console.log(yExtent);

        vis.svg.select(".y-axis")
            .call(vis.yAxis);
        // Update the x-axis
        vis.svg.select(".x-axis")
            .call(vis.xAxis)


    }
}