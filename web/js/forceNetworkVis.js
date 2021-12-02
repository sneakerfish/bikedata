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
        let computedHeight = document.getElementById(vis.parentElement).parentElement.parentElement.parentElement.getBoundingClientRect().height;
        computedHeight = vis.maxHeight > computedHeight ? computedHeight : vis.maxHeight;
        vis.height = computedHeight - vis.margin.top - vis.margin.bottom;

        // vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        // vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        vis.links = vis.svg.append("g")
            .attr("class", "links");

        vis.nodes = vis.svg.append("g")
            .attr("class", "nodes");

        vis.textGroup = vis.svg.append("g")
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
            // .call(d3.drag() // call specific function when circle is dragged
            //     .on("start", dragstarted)
            //     .on("drag", dragged)
            //     .on("end", dragended));

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
            .force("charge_force", d3.forceManyBody())
            .force("center_force", d3.forceCenter(vis.width / 2, vis.height / 2))
            .force("links", link_force)
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

        // function dragstarted(event, d) {
        //     if (!event.active) simulation.alphaTarget(.03).restart();
        //     d.fx = d.x;
        //     d.fy = d.y;
        // }
        // function dragged(event, d) {
        //     d.fx = event.x;
        //     d.fy = event.y;
        // }
        // function dragended(event, d) {
        //     if (!event.active) simulation.alphaTarget(.03);
        //     d.fx = null;
        //     d.fy = null;
        // }
    }
}