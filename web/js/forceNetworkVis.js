class ForceNetworkVis {

    constructor(parentElement, data, city, maxHeight) {
        this.parentElement = parentElement;
        this.data = data;
        this.filteredData = data;
        this.city = city;
        this.stationNames = [];
        this.stationLinks = [];
        this.maxHeight = maxHeight;
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.margin = {top: 20, right: 30, bottom: 20, left: 100};
        vis.width = document.getElementById(vis.parentElement).parentElement.parentElement.parentElement.getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        let computedHeight = document.getElementById(vis.parentElement).parentElement.parentElement.parentElement.getBoundingClientRect().height * 0.70;
        vis.height = computedHeight - vis.margin.top - vis.margin.bottom;

        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        vis.g = vis.svg.append("g")
            .attr("class", "everything");

        vis.links = vis.g.append("g")
            .attr("class", "links");

        vis.nodes = vis.g.append("g")
            .attr("class", "nodes");

        vis.textGroup = vis.g.append("g")
            .attr("class", "textGroup")

        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;

        vis.city = document.querySelector('input[name="cityNetworkRadioOptions"]:checked').value;
        vis.topN = parseInt(document.getElementById('topStations').value);

        document.getElementById('topStationsLabel').innerHTML='Top ' + vis.topN + " Most Frequented Trip Routes";

        vis.filteredData = vis.data.filter(d => d.city == vis.city)
            .sort((a,b) => b.trip_count - a.trip_count)
            .slice(0, vis.topN);

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

        var line = vis.links.selectAll(".edge")
            .data(vis.stationLinks);

        line.exit().remove()

        var link = line.enter()
            .append("line")
            .merge(line)
            .attr("class", "edge")

        var node = vis.nodes.selectAll(".nodes")
            .data(vis.stationNames, d => d.name);

        var nodeEnter = node.enter()
            .append("g")
            .attr("class", "nodes");

        node.exit().remove();

        nodeEnter
            .append("circle")
            .attr("class", vis.city +"-node")
            .attr("r", d => {
                return 5;
            })

        node = nodeEnter.merge(node)

        var texts = vis.textGroup.selectAll(".nodeLabels")
            .data(vis.stationNames, d => d.name);

        texts.exit().remove()

        var textEnter = texts.enter()
            .append("text")
            .attr("class", "nodeLabels")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(function(d) {
                return d.name
            });

        texts = textEnter.merge(texts)

        var simulation = d3.forceSimulation()
            .nodes(vis.stationNames);

        var link_force = d3.forceLink(vis.stationLinks)
            .id(function (d) {
                return d.name;
            });

        simulation
            .force("charge_force", d3.forceManyBody().strength(-50))
            .force("center_force", d3.forceCenter(vis.width / 2, vis.height / 2))
            .force("links", link_force)
            .force("collide", d3.forceCollide().radius(30))
            .on("tick", tickActions);

        function tickActions() {
            node
                .attr("transform", function(d) {
                    d.x = Math.max(5, Math.min(vis.width - 5, d.x))
                    d.y = Math.max(5, Math.min(vis.height - 5, d.y))
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

        //add drag capabilities
        var drag_handler = d3.drag()
            .on("start", drag_start)
            .on("drag", drag_drag)
            .on("end", drag_end);

        drag_handler(node);

        function drag_start(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        //make sure you can't drag the circle outside the box
        function drag_drag(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function drag_end(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        //add zoom capabilities
        var zoom_handler = d3.zoom()
            .on("zoom", zoom_actions);

        zoom_handler(vis.svg);

        //Zoom functions
        function zoom_actions(event){
            vis.g.attr("transform", event.transform)
        }
    }
}