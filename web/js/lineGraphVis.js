
class lineGraphVis {

    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.cities = ["nyc", "boston", "sf"];
        console.log("constructor: ", data);

        this.initVis();
    }

    initVis() {
        let vis = this;
        vis.margin = { top: 30, right: 0, bottom: 20, left: 100 };

        vis.width = document.getElementById(vis.parentElement).parentElement.parentElement.getBoundingClientRect().width
            - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).parentElement.parentElement.getBoundingClientRect().height
            - vis.margin.top - vis.margin.bottom;

        // scales and axes
        vis.x = d3.scaleLinear()
            .range([0, vis.width])
            .domain([1, 12]);

        let yMax = d3.max(vis.data, (d) => d.round_trip_ratio * 100.0);
        vis.y = d3.scaleLinear()
            .range([vis.height, 0])
            .domain([0, yMax]);

        // color palette
        vis.color = d3.scaleOrdinal()
            .domain(vis.cities)
            .range([ "#041E42", "#FB4D42", "#b3995d"]);

        vis.xAxis = d3.axisBottom()
            .scale(vis.x);

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
            .attr("class", "x-axis axis")
            .call(vis.xAxis);

        vis.svg.append("g")
            .attr("class", "y-axis axis")
            .call(vis.yAxis);

        // Add Tooltip placeholder
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "small-tooltip")
            .attr("id", "linechart-tooltip")
            .style("opacity", 0);
        vis.tooltip.append("text")
            .attr("x", 10)
            .attr("y", 20)
            .attr("id", "linechart-tooltext");

        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;

        vis.lineData = d3.group(vis.data,
            d => d.city + " " + d.start_year);
        console.log(vis.lineData["boston"]);

        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        console.log("data: ", vis.data);

        // Draw the line
        vis.svg.selectAll(".line")
            .data(vis.lineData)
            .enter()
            .append("path")
            .attr("fill", "none")
            .attr("stroke", function(d){ return vis.color(d[1][0].city) })
            .attr("stroke-width", 1.5)
            .attr("d", function(d){
                return d3.line()
                    .x(function(d) { return vis.x(d.start_month); })
                    .y(function(d) { return vis.y(d.round_trip_ratio * 100.0); })
                    (d[1].sort((a, b) => (a.start_year*12 + a.start_month) -
                        (b.start_year*12 + b.start_month)));
            })
            .on("mouseover", (e, d) => {
                vis.tooltip.transition()
                    .style("opacity", 1);
                console.log("Mouseover", d);
                let toolTipText = d[0];

                vis.tooltip.html(toolTipText)
                    .style("left", (e.pageX) + "px")
                    .style("top", (e.pageY - 50) + "px");
            })
            .on("mouseout", (e, d) => {
                console.log("Mouseout");
                vis.tooltip.transition()
                    .duration(4000)
                    .style("opacity", 0);
            });
    }
}