
/*
 * BarVis - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the visualization
 * @param _data						-- the actual data: perDayData
 */

class BarVis {

    constructor(parentElement, data, category_mappings, xLabel) {
        this.parentElement = parentElement;

        this.data = data;
        this.filteredData = this.data;
        this.category_mappings = category_mappings;
        this.categories = Object.keys(category_mappings)
        this.xLabel = xLabel;
        this.isInit = false;

        this.initVis();
    }


    /*
     * Initialize visualization (static content, e.g. SVG area or axes)
     */

    initVis() {
        let vis = this;

        vis.margin = { top: 30, right: 0, bottom: 20, left: 100 };

        vis.width = document.getElementById(vis.parentElement).parentElement.parentElement.getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).parentElement.parentElement.getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        // Only use half of the height
        vis.height = vis.height / 2 - vis.margin.bottom;

        // SVG drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        // Scales and axes
        vis.x = d3.scaleBand()
            .rangeRound([0, vis.width])
            .paddingInner(0.2)
            .domain(d3.range(0, vis.categories.length));

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);
        vis.xAxis = d3.axisBottom()
            .scale(vis.x);

        vis.yAxis = d3.axisLeft()
            .scale(vis.y);

        vis.svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", "translate(0," + vis.height + ")");

        vis.svg.append("g")
            .attr("class", "y-axis axis");

        // Axis title
        vis.svg.append("text")
            .attr("x", -50)
            .attr("y", -8)
            .text(vis.xLabel);

        // (Filter, aggregate, modify data)
        vis.wrangleData();
        vis.isInit = true
    }

    /*
     * Data wrangling
     */
    wrangleData() {
        let vis = this;

        let cityMap = {}
        vis.categories.forEach(c => cityMap[c] = 0);

        // Aggregate over priorities, iterate over all data
        vis.filteredData.forEach(function(day) {
                cityMap[day.city] += day.trip_count
            }
        )
        vis.displayData = cityMap;

        vis.updateVis();
    }

    /*
     * The drawing function
     */

    updateVis() {
        let vis = this;

        // keep the scale the same after initialization
        if (!vis.isInit) {
            vis.y.domain([0, d3.max(Object.values(vis.displayData))]);
        }

        let cities = [];

        for (var key in vis.displayData) {
            cities.push(key);
        }

        let bars = vis.svg.selectAll(".bar")
            .data(cities);

        bars.enter().append("rect")
            .attr("class", d => "bar " + d + "-bar")
            .merge(bars)
            // .transition()
            .attr("width", vis.x.bandwidth())
            .attr("height", function (d) {
                return vis.height - vis.y(vis.displayData[d]);
            })
            .attr("x", function (d, index) {
                return vis.x(index);
            })
            .attr("y", function (d) {
                return vis.y(vis.displayData[d]);
            })

        bars.exit().remove();

        // Call axis function with the new domain
        vis.svg.select(".y-axis").call(vis.yAxis);

        vis.svg.select(".x-axis").call(vis.xAxis)
            .selectAll("text")
            .style("text-anchor", "middle")
            .text(i => vis.category_mappings[cities[i]]);
    }

    onSelectionChange(selectionStart, selectionEnd) {
        let vis = this;

        vis.filteredData = vis.data.filter(d =>  d.trip_date >= selectionStart && d.trip_date <= selectionEnd);

        vis.wrangleData();
    }
}
