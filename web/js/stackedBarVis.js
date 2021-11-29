
/*
 * StackedBarVis - Object constructor function
 * @param parentElement 	-- the HTML element in which to draw the visualization
 * @param data						-- the actual data: perDayData
 */

class StackedBarVis {

    constructor(parentElement, data, category_field, title) {
        this.parentElement = parentElement;
        this.data = data.sort((a, b) => {
            return (a.event_date - b.event_date)
        });

        this.title = title;
        this.category_field = category_field;
        this.categories = ["nyc", "boston", "sf"];

        // prepare colors for range
        let colorArray = [ "#041E42", "#FB4D42", "#b3995d"];

        // Set ordinal color scale
        this.colorScale = d3.scaleOrdinal()
            .domain(this.categories)
            .range(colorArray);

        this.initVis();
    }


    /*
     * Initialize visualization (static content, e.g. SVG area or axes)
     */

    initVis() {
        let vis = this;

        vis.margin = { top: 30, right: 0, bottom: 20, left: 100 };

        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        let xExtent = d3.extent(vis.data, (d) => d.event_date);

        // scales and axes
        vis.x = d3.scaleLinear()
            .range([0, vis.width])
            .domain(xExtent);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0])
            .domain([0, 2500]);

        vis.xAxis = d3.axisBottom()
            .scale(vis.x)
            .tickFormat(d3.timeFormat("%m/%Y"));

        vis.yAxis = d3.axisLeft()
            .scale(vis.y);


        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");


        // Add x and y axis groups
        vis.svg.append("g")
            .attr("transform", "translate(0," + vis.height + ")")
            .attr("class", "x-axis axis");

        vis.svg.append("g")
            .attr("class", "y-axis axis");

        // vis.svg = d3.select("#" + vis.parentElement).select("svg").select("g");
        vis.stack = d3.stack().keys(["boston", "sf", "nyc"]);

        let tooltip = vis.svg.append("g")
            .attr("id", "chart-tooltip");
        tooltip.append("line")
            .attr("class", "tipline")
            .attr("id", "chart-tipline")
            .attr("x1", vis.x(d3.min(vis.data, (d) => d.event_date)))
            .attr("y1", vis.y(2500))
            .attr("x2", vis.x(d3.min(vis.data, (d) => d.event_date)))
            .attr("y2", vis.y(0));
        tooltip.append("text")
            .attr("x", 10)
            .attr("y", 20)
            .attr("id", "chart-tooltext")
            .attr("class", "tiptext");
        tooltip.append("text")
            .attr("class", "tiptext")
            .attr("id", "chart-datetext")
            .attr("x", vis.x(d3.min(vis.data, (d) => d.event_date)) + 10)
            .attr("y", vis.y(2430));


        // Axis title
        vis.svg.append("text")
            .attr("x", -50)
            .attr("y", -8)
            .text(vis.title);

        vis.wrangleData();
    }


    wrangleData() {
        let vis = this;

        let layer_keys = {}
        vis.data.forEach((d) => {
            if (! layer_keys.hasOwnProperty(d.event_date)) {
                layer_keys[d.event_date] = {};
                layer_keys[d.event_date]["month"] = d.event_date;
            }
            layer_keys[d.event_date][d.city] = d.station_count;
        })

        let newdata = Object.values(layer_keys);

        vis.stack = d3.stack().keys(["nyc", "boston", "sf"]);
        vis.stackedData = vis.stack(newdata);

        // Area generator
        vis.area = d3.area()
            .x(function (d) {
                return vis.x(d.data.month);
            })
            .y0(function (d) {
                return vis.y(d[0]);
            })
            .y1(function (d) {
                return vis.y(d[1]);
            })
        // vis.stackedData = vis.stack(layer_keys);
        // console.log(vis.stackedData);

        vis.updateVis();
    }

    stationCount(city, year, month) {
        let vis = this;
        let lst = vis.data.filter((d) => {
            return d.city == city && d.year == year && d.month == month;
        });
        console.log(lst[0]);
        return lst[0].station_count;
    }

    displayStation(key) {
        if (key == "boston") {
            return "Boston Metro";
        } else if (key == "sf") {
            return "Bay Area";
        } else if (key == "nyc") {
            return "New York City Metro";
        }
    }

    updateVis() {
        let vis = this;

        let xExtent = d3.extent(vis.data, (d) => d.event_date);
        vis.x.domain(xExtent);
        let yExtent = d3.max(vis.stackedData[2], (d) => {
            return d[1];
        });
        vis.y.domain([0, yExtent]);

        // Draw the layers
        let categories = vis.svg.selectAll(".area")
            .data(vis.stackedData);

        categories.enter().append("path")
            .attr("class", "area")
            .merge(categories)
            .style("fill", d => {
                return vis.colorScale(d);
            })
            .attr("d", d => vis.area(d))

            .on("mouseover", (e, d) => {
                d3.select("#chart-tooltip").style("display", null);
                d3.select("#chart-tooltext")
                    .text(d.key);
            })
            .on("mouseout", function (d) {
                d3.select("#chart-tooltip").style("display", "none");
                d3.select("#chart-tooltext")
                    .text("");
            })
            .on("mousemove", (e, d) => {
                let ptr = d3.pointer(e);
                const formatDate = d3.timeFormat("%b %Y");
                const bisectDate = d3.bisector((dx) => { return dx.event_date; }).right;
                let xdate = vis.x.invert(ptr[0]);
                let i = bisectDate(vis.data, xdate);
                let shiftLeft = 0;
                let dateval = new Date(xdate);
                d3.select("#chart-tooltip")
                    .attr("transform", "translate(" + (ptr[0]) + ", 0)");
                d3.select("#chart-datetext")
                    .text(formatDate(vis.data[i].event_date))
                    .attr("transform", "translate(" + shiftLeft + ", 0)");
                d3.select("#chart-tooltext")
                    .text(vis.displayStation(d.key) + ": " + vis.stationCount(d.key, dateval.getFullYear(), dateval.getMonth()) + " stations")
                    .attr("transform", "translate(" + shiftLeft + ", 0)");
            });


        vis.svg.select(".y-axis")
            .call(vis.yAxis);
        // Update the x-axis
        vis.svg.select(".x-axis")
            .call(vis.xAxis)



    }
}