//Sources
//for general radial line https://stackoverflow.com/a/58807542
//for inner xTicks https://bl.ocks.org/tlfrd/fd6991b2d1947a3cb9e0bd20053899d6

class DayViewRadial {
    constructor(parentElement, data, city) {
        this.parentElement = parentElement;
        this.data = data;
        this.city = city;
        this.initVis();
    }

    initVis() {
        let vis = this;

        let selection = d3.select("#day-view-selection");
        let count = 0;
        for (let row in vis.data) {
            selection.append("option").attr("selected", count++ < 2 ? "selected" : null).attr("value", row).text(row);
        }

        vis.linePlots = [];
        vis.colors = ["red", "blue", "green", "yellow"]
        vis.colorUsages = Array(vis.colors.length).fill(0, 0);

        vis.margin = {top: 0, right: 0, bottom: 0, left: 0};
        vis.width = document.getElementById(vis.parentElement).parentElement.getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).parentElement.getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;
        // console.log(vis.width + " " + vis.height)

        vis.outerRadius = Math.round(Math.min(vis.width, vis.height) / 2);
        vis.innerRadius = vis.outerRadius / 4;

        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");


        // Scales and axes
        vis.x = d3.scaleLinear()
            .range([-Math.PI, Math.PI])

        vis.y = d3.scaleLinear()
            .range([vis.innerRadius, vis.outerRadius])

        vis.line = d3.lineRadial()
            .angle(d => vis.x(d.minute))
            .radius(d => vis.y(d.riders))
            .curve(d3.curveCardinalClosed);

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
            .attr("y", -vis.outerRadius - 20)
            .attr("text-anchor", "middle")
            .text("Active " + vis.city + " Riders")

        this.wrangleData();
    }

    wrangleData() {
        let vis = this;

        vis.displayData = [];

        let select = document.getElementById("day-view-selection");
        for (let i = 0; i < select.length; i++) {
            let opt = select[i];
            if (opt.selected) {
                vis.displayData.push(vis.data[opt.value]);
            }
        }

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        vis.x.domain([0, 1440]);

        let maxRiders = 0;
        for (let day of vis.displayData) {
            let max = d3.max(day.map(d => d.riders));
            if (max > maxRiders) {
                maxRiders = max;
            }
        }
        vis.y.domain([0, maxRiders])

        //outer circles for axis
        const interval = Math.ceil(maxRiders / 250) * 50;
        let intervals = []
        for (let i = 0; i <= maxRiders; i += interval) {
            intervals.push(i);
        }

        let grayCircs = vis.center
            .selectAll(".gray-circs")
            .data(intervals, d => d);
        grayCircs.exit().remove();
        grayCircs.enter()
            .append("circle")
            .attr("class", "gray-circs")
            .attr("fill", "none")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("opacity", 0.4)
            .attr("stroke-width", 1)
            .attr("stroke", "grey")
            .merge(grayCircs)
            .attr("r", d => vis.y(d));

        let grayText = vis.center
            .selectAll(".circ-text")
            .data(intervals.filter((d, i) => i > 0), d => d);
        grayText.exit().remove();
        grayText.enter()
            .append("text")
            .attr("class", "circ-text")
            .attr("x", 0)
            .attr("text-anchor", "middle")
            .merge(grayText)
            .attr("y", d => 5 - vis.y(d))
            .text(d => d);

        let lines = vis.center
            .selectAll(".day-line")
            .data(vis.displayData, d => {
                console.log(d[0].date);
                return d[0].date;
            });
        console.log(lines.exit()._groups);
        lines.exit().remove();
        lines.enter().append("path")
            .attr("class", "day-line")
            .datum(d => d)
            .attr("fill", "none")
            .attr("stroke", d => vis.uniqueColor(d[0].date))
            .attr("stroke-width", 2)
            .attr("d", vis.line);
    }

    freeColor(color) {
        let i = this.colors.findIndex(color);
        if (color < 0) {
            return;
        }
        this.colorUsages[i]--;
        if (this.colorUsages[i] < 0) {
            this.colorUsages[i] = 0;
        }
    }

    uniqueColor() {
        let lowest = 0;
        while (true) {
            for (let i = 0; i < this.colors.length; i++) {
                if (this.colorUsages[i] === lowest) {
                    this.colorUsages[i]++;
                    return this.colors[i];
                }
            }
            lowest++;
        }
    }
}
