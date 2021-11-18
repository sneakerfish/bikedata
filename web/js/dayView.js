class DayView {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.margin = {top: 50, right: 50, bottom: 50, left: 50};
        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        // Scales and axes
        vis.x = d3.scaleTime()
            .range([0, vis.width]);
        vis.x.domain(d3.extent(vis.data.map(d => d.Time)));

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);
        vis.y.domain([0, d3.max(vis.data.map(d => d.Riders))]);

        vis.xAxis = d3.axisBottom()
            .scale(vis.x);

        vis.yAxis = d3.axisLeft()
            .scale(vis.y);

        vis.svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", "translate(0," + vis.height + ")");

        vis.svg.append("g")
            .attr("class", "y-axis axis");


        // Append a path for the area function, so that it is later behind the brush overlay
        vis.timePath = vis.svg.append("path")
            .attr("class", "area area-time");

        // Define the D3 path generator
        vis.area = d3.area()
            .curve(d3.curveStep)
            .x(function (d) {
                return vis.x(d.Time);
            })
            .y0(vis.height)
            .y1(function (d) {
                return vis.y(d.Riders);
            });

        // axis labels
        vis.svg.append("text")
            .attr("x", vis.width / 2)
            .attr("y", vis.height + 40)
            .text("Time");
        vis.svg.append("text")
            .attr("x", 0)
            .attr("y", -10)
            .style("text-anchor", "end")
            .text("Riders");

        this.wrangleData();
    }

    wrangleData() {
        let vis = this;

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        vis.timePath
            .datum(vis.data)
            .attr("d", vis.area)
            .attr("fill", "lightblue")

        vis.svg.select(".x-axis").call(vis.xAxis);
        vis.svg.select(".y-axis").call(vis.yAxis);
    }
}
