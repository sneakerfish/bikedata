class TimeSeriesVis {



    constructor(parentElement, data, cities) {
        this.parentElement = parentElement;
        // assumes data is sorted
        this.data = data;
        this.filteredData = data;
        this.formatDate = d3.timeFormat("%Y-%m-%d");
        this.cities = new Set(cities)
        this.initFinished = false;
        this.initVis();
    }

    initVis() {
        let vis = this;

        console.log(vis.parentElement)

        vis.margin = {top: 120, right: 30, bottom: 20, left: 100};
        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        console.log("width:", vis.width, "height:", vis.height)

        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
		    .attr("width", vis.width + vis.margin.left + vis.margin.right)
		    .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
	        .append("g")
		    .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        vis.svg.append("path")
	        .attr("class", "boston-line")

        vis.svg.append("path")
            .attr("class", "nyc-line")

        vis.svg.append("path")
            .attr("class", "sf-line")

        vis.x = d3.scaleTime()
	        .range([0, vis.width])

        vis.xAxis = d3.axisBottom()
            .scale(vis.x)
            .tickFormat(vis.formatDate)

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);

        vis.yAxis = d3.axisLeft().scale(vis.y)

        vis.yAxisGroup = vis.svg.append("g")
            .attr("class", "y-axis axis");

        vis.xAxisGroup = vis.svg.append("g")
            .attr("class", "axis x-axis")
            .attr('transform', 'translate(0,' + vis.height + ')')

        this.wrangleData();
    }

    wrangleData() {
        let vis = this;

        let checkedCities = []

        if (document.getElementById("bostonCheckBox").checked) {
            checkedCities.push('boston')
        }

        if (document.getElementById("nycCheckBox").checked) {
            checkedCities.push('nyc')
        }

        if (document.getElementById("sfCheckBox").checked) {
            checkedCities.push('sf')
        }

        vis.cities = new Set(checkedCities);
        console.log('cities selected:', vis.cities)

        vis.filteredData = vis.data.filter(d => vis.cities.has(d.city))

        vis.updateVis();
    }

    updateCityVis(city) {
        let vis = this;

        let cityData = vis.filteredData.filter(d => d.city == city)

        console.log('city:', city, 'data', cityData);

        let cityPathName = city + "Path";
        let cityLineName = city + "Line";

        vis[cityLineName] = d3.line()
            .x(d => vis.x(d.trip_date))
            .y(d => vis.y(d.trip_count))
            .curve(d3.curveLinear)

        let cityLineClass = city + "-line";

        vis[cityPathName] = vis.svg.selectAll("." + cityLineClass)
            .datum(cityData)

        if (vis.initFinished) {
            vis[cityPathName].enter()
                .append("path")
                .attr("class", cityLineClass)
                .merge(vis[cityPathName])
                .attr("d", vis[cityLineName])
        } else {
            vis[cityPathName].enter()
                .append("path")
                .attr("class", cityLineClass)
                .merge(vis[cityPathName])
                .attr("d", vis[cityLineName])
                .attr("stroke-dasharray", function (d) {
                    return this.getTotalLength()
                })
                .attr("stroke-dashoffset", function (d) {
                    return this.getTotalLength()
                });

            vis.svg.selectAll("." + cityLineClass)
                .transition()
                .duration(1000)
                .ease(d3.easeLinear)
                .attr("stroke-dashoffset", 0);
        }

        // vis[cityPathName].enter()
        //     .append("path")
        //     .attr("class", cityLineClass)
        //     .merge(vis[cityPathName])
        //     // .transition()
        //     // improves path animation
        //     // .attrTween('d', d => d3.interpolatePath(d3.select(this).attr('d'), line(d)))
        //     // .ease(d3.easeLinear)
        //     // .duration(10000)
        //     .attr("d", vis[cityLineName])
        //     .call(p => {
        //         p.transition()
        //             .duration(2000)
        //             // .attrTween('d', d =stroke> d3.interpolatePath(d3.select(this).attr('d'), line(d)))
        //             // .attrTween("-dasharray", tweenDash);
        //
        //     });

        vis[cityPathName].exit().remove();
    }



    updateVis() {
        let vis = this;

        console.log('Filtered data', vis.filteredData)

        let trip_counts = vis.filteredData.map(d => d.trip_count)
        let trip_count_max = d3.max(trip_counts);

        console.log('Maximum Trip Count', trip_count_max);

        vis.y.domain([0, trip_count_max])

        let startDate = vis.filteredData[0].trip_date;
        let endDate = vis.filteredData[vis.filteredData.length - 1].trip_date;

        console.log('Start Date', startDate, 'End Date', endDate);

        vis.x.domain([startDate, endDate])

        vis.svg.select(".x-axis")
            .transition()
            .call(vis.xAxis);

        vis.svg.select(".y-axis")
            .transition()
            .call(vis.yAxis);

        if (!vis.initFinished) {
            vis.updateCityVis('boston')

            sleep(1000).then(() => {
                vis.updateCityVis('sf')
            });

            sleep(2000).then(() => {
                vis.updateCityVis('nyc')
                vis.initFinished = true;
            });
        } else {
            vis.updateCityVis('boston')
            vis.updateCityVis('sf')
            vis.updateCityVis('nyc')
        }
    }
}

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}