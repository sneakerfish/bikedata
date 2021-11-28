class ForceNetworkVis {

    constructor(parentElement, data, city) {
        this.parentElement = parentElement;
        this.data = data;
        this.filteredData = data;
        this.city = city;
        this.stationNames = [];
        this.stationLinks = [];
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.margin = {top: 20, right: 30, bottom: 20, left: 100};
        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;

        vis.filteredData = vis.data.filter(d => d.city == vis.city)
            .sort((a,b) => b.trip_count - a.trip_count)
            .slice(0, 100);

        console.log(vis.filteredData)

        let stationSet = new Set(vis.filteredData.map(d => d.start_station_name))
        vis.filteredData.map(d => d.end_station_name).forEach(item => stationSet.add(item))

        vis.stationNames = Array.from(stationSet).map(d => {
            let item = {
                name: d
            }
            return item;
        });

        vis.stationLinks = vis.filteredData.map(d => {
            let item = {
                    source: d.start_station_name,
                    target: d.end_station_name,
                    value: d.distance
            };
            return item;
        })

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        console.log(vis.stationNames)
        console.log(vis.stationLinks)

        var simulation = d3.forceSimulation()
            .nodes(vis.stationNames);

        console.log(vis.width, vis.height)

        simulation
            .force("charge_force", d3.forceManyBody())
            .force("center_force", d3.forceCenter(vis.width / 2, vis.height / 2))
            .on("tick", tickActions);

        var link_force = d3.forceLink(vis.stationLinks)
            .id(function (d) {
                return d.name;
            })

        simulation.force("links", link_force)

        var link = vis.svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(vis.stationLinks)
            .enter().append("line")
            .attr("stroke-width", 2);

        var node = vis.svg.append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(vis.stationNames)
            .enter().append("g");

        node.append("circle")
            .attr("r", 5)
            .attr("class", vis.city +"-point");

        var texts = vis.svg.selectAll(".nodeLabels")
            .data(vis.stationNames)
            .enter()
            .append("text")
            .attr("class", "nodeLabels")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(function(d) {
                return d.name
            });

        function tickActions() {
            node
                .attr("transform", function(d) {
                    // d.x = Math.max(5, Math.min(vis.width - 5, d.x))
                    // d.y = Math.max(5, Math.min(vis.height - 5, d.y))
                    return "translate(" + d.x + "," + d.y + ")";
                })

            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            texts.attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
        }
    }
}