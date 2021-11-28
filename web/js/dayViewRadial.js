//Sources
//for general radial line https://stackoverflow.com/a/58807542
//for inner xTicks https://bl.ocks.org/tlfrd/fd6991b2d1947a3cb9e0bd20053899d6

class DayViewRadial {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.initVis();
    }

    initVis() {
        let vis = this;

        let selection = d3.select("#day-view-selection");
        let first = true;
        for (let row in vis.data) {
            selection.append("option").attr("selected", first ? "selected" : null).attr("value", row).text(row);
            first = false;
        }

        vis.margin = {top: 0, right: 0, bottom: 0, left: 0};
        vis.width = document.getElementById(vis.parentElement).parentElement.getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).parentElement.getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;
        console.log(vis.width + " " + vis.height)

        vis.outerRadius = Math.round(Math.min(vis.width, vis.height) / 2);
        vis.innerRadius = vis.outerRadius / 4;

        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");


        // Scales and axes
        vis.x = d3.scaleTime()
            .range([-Math.PI, Math.PI])
            .domain(d3.extent(vis.data.map(d => d.Time)));

        const maxRiders = d3.max(vis.data.map(d => d.Riders));
        vis.y = d3.scaleLinear()
            .range([vis.innerRadius, vis.outerRadius])
            .domain([0, maxRiders])

        // vis.xAxis = d3.axisBottom()
        //     .scale(vis.x);
        //
        // vis.yAxis = d3.axisLeft()
        //     .scale(vis.y);
        //
        // vis.svg.append("g")
        //     .attr("class", "x-axis axis")
        //     .attr("transform", "translate(0," + vis.height + ")");
        //
        // vis.svg.append("g")
        //     .attr("class", "y-axis axis");


        // Append a path for the area function, so that it is later behind the brush overlay
        // vis.timePath = vis.svg.append("path")
        //     .attr("class", "area area-time");

        vis.line = d3.lineRadial()
            .angle(d => vis.x(d.Time))
            .radius(d => vis.y(d.Riders))
            .curve(d3.curveCardinalClosed);

        // Define the D3 path generator
        // vis.area = d3.area()
        //     .curve(d3.curveStep)
        //     .x(function (d) {
        //         return vis.x(d.Time);
        //     })
        //     .y0(vis.height)
        //     .y1(function (d) {
        //         return vis.y(d.Riders);
        //     });

        // axis labels
        // vis.svg.append("text")
        //     .attr("x", vis.width / 2)
        //     .attr("y", vis.height + 40)
        //     .text("Time");
        // vis.svg.append("text")
        //     .attr("x", 0)
        //     .attr("y", -10)
        //     .style("text-anchor", "end")
        //     .text("Riders");
        vis.center = vis.svg.append("g")
            .attr("transform", "translate("+vis.width/2+","+vis.height / 2+")");

        vis.center.append("circle")
            .attr("fill", "lightgray")
            .attr("opacity", 0.5)
            .attr("stroke-width", 2)
            .attr("stroke", "black")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", vis.innerRadius);

        //outer circles for axis
        const interval = Math.round(maxRiders / 500) * 100;
        for (let i = 0; i <= maxRiders; i += interval) {
            vis.center.append("circle")
                .attr("fill", "none")
                .attr("cx", 0)
                .attr("cy", 0)
                .attr("opacity", 0.4)
                .attr("stroke-width", 1)
                .attr("stroke", "grey")
                .attr("r", vis.y(i));

            if (i > 0) {
                vis.center.append("text")
                    .attr("x", 0)
                    .attr("y",  5 - vis.y(i))
                    .attr("text-anchor", "middle")
                    .text(i);
            }
        }

        //inner ticks for time axis
        vis.xTick = vis.center
            .selectAll(".xTick")
            .data(vis.x.ticks(8))
            .enter().append("g")
            .attr("class", "xTick")
            .attr("text-anchor", "middle")
            .attr("transform", function(d) {
                return "rotate(" + ((vis.x(d)) * 180 / Math.PI - 90) + ")translate(" + vis.innerRadius + ",0)";
            });

        vis.xTick.append("line")
            .attr("x2", -5)
            .attr("stroke", "black");


        //inner tick labels for time x axis
        vis.xLabel = vis.center
            .selectAll(".xLabelText")
            .data(vis.x.ticks(8))
            .enter().append("g")
            .attr("class", "xLabelText")
            .attr("text-anchor", "middle");

        let hourFormat = d3.timeFormat("%H");
        vis.xLabel
            .append("text")
            .attr("transform", function (d) {
                var angle = vis.x(d);
                let x = (0.88 * vis.innerRadius) * -Math.sin(angle + Math.PI);
                let y = 3 + (0.88 * vis.innerRadius) * Math.cos(angle + Math.PI);
                return "translate(" + x + "," + y + ")"
            })
            .text(d => hourFormat(d))
            .style("font-size", 10)
            .attr("opacity", 0.6)

        vis.xLabel = vis.center
            .append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("text-anchor", "middle")
            .text("Time")

        vis.xLabel = vis.center
            .append("text")
            .attr("x", 0)
            .attr("y", -vis.outerRadius)
            .attr("text-anchor", "middle")
            .text("Riders")

        this.wrangleData();
    }

    wrangleData() {
        let vis = this;

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // vis.timePath
        //     .datum(vis.data)
        //     .attr("d", vis.area)
        //     .attr("fill", "lightblue")

        vis.linePlot = vis.center.append("path")
            .datum(vis.data)
            .attr("fill", "none")
            .attr("stroke", "purple")
            .attr("stroke-width", 2)
            .attr("d", vis.line);

        // vis.svg.select(".x-axis").call(vis.xAxis);
        // vis.svg.select(".y-axis").call(vis.yAxis);
    }
}
