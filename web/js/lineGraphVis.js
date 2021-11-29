
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

        vis.y = d3.scaleLinear()
            .range([vis.height, 0])
            .domain([0, 10]);

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
                console.log("D: ", d);
                return d3.line()
                    .x(function(d) { return vis.x(d.start_month); })
                    .y(function(d) { return vis.y(d.round_trip_ratio * 100.0); })
                    (d[1])
            })

    }
}