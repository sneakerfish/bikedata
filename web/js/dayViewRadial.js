//Sources
//for general radial line https://stackoverflow.com/a/58807542
//for inner xTicks https://bl.ocks.org/tlfrd/fd6991b2d1947a3cb9e0bd20053899d6

function tryFillSelectionDates(data) {
    let selection = d3.select("#day-view-selection");
    if (!selection.text().trim().length) {
        let count = 0;
        for (let row in data) {
            selection.append("option")
                .attr("selected", count++ < 2 ? "selected" : null)
                .attr("value", row)
                .text(row);
        }
    }
}

class DayViewRadial {
    constructor(parentElement, data, city) {
        this.parentElement = parentElement;
        this.data = data;
        this.city = city;
        this.initVis();
    }

    initVis() {
        let vis = this;

        tryFillSelectionDates(vis.data);

        vis.linePlots = [];
        vis.colors = ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00']
        vis.colorUsages = Array(vis.colors.length).fill(0, 0);

        vis.margin = {top: 0, right: 10, bottom: 0, left: 10};
        vis.width = document.getElementById("figure").getBoundingClientRect().width / 3 - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById("figure").getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

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
            .domain([0, 1440]);

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

        let angles = [0, 45, 90, 135, 180, 225, 270, 315];
        //inner ticks for time axis
        vis.xTick = vis.center
            .selectAll("#"+vis.parentElement+" .xTick")
            .data(angles)
            .enter().append("g")
            .attr("class", "xTick")
            .attr("text-anchor", "middle")
            .attr("transform", function(d) {
                return "rotate(" + d + ")translate(" + vis.innerRadius + ",0)";
            });

        vis.xTick.append("line")
            .attr("x2", -5)
            .attr("stroke", "black");


        //inner tick labels for time x axis
        vis.xLabel = vis.center
            .selectAll("#"+vis.parentElement+" .xLabelText")
            .data(angles)
            .enter().append("g")
            .attr("class", "xLabelText")
            .attr("text-anchor", "middle");

        let hourLabels = ["12:00", "15:00", "18:00", "21:00", "00:00", "3:00", "6:00", "9:00"];
        vis.xLabel
            .append("text")
            .attr("transform", d => {
                var angle = Math.PI * d / 180;
                let x = (0.77 * vis.innerRadius) * -Math.sin(angle + Math.PI);
                let y = 3 + (0.77 * vis.innerRadius) * Math.cos(angle + Math.PI);
                return "translate(" + x + "," + y + ")"
            })
            .text((d, i) => hourLabels[i])
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
        if (interval > 0) {
            for (let i = 0; i <= maxRiders; i += interval) {
                intervals.push(i);
            }
        }

        let grayCircs = vis.center
            .selectAll("#"+vis.parentElement+" .gray-circs")
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
            .selectAll("#"+vis.parentElement+" .circ-text")
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
            .selectAll("#"+vis.parentElement+" .day-line")
            .data(vis.displayData, d => {
                return d[0].date;
            });
        for (let node of lines.exit()) {
            vis.freeColor(node.attributes.stroke.nodeValue);
        }
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
        let i = this.colors.findIndex(c => c === color);
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
