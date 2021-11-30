const TIME_SERIES_VIS_DEBUG = false;

class TimeSeriesPlotVis {

    constructor(parentElement, data, cities, eventData, maxHeight, idPrefix) {
        this.parentElement = parentElement;
        // assumes data is sorted
        this.data = data;
        this.filteredData = data;
        this.formatDate = d3.timeFormat("%Y-%m-%d");
        this.cities = new Set(cities)
        this.eventData = eventData;
        this.eventMap = new Map()
        this.maxHeight = maxHeight;
        this.idPrefix = idPrefix;

        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.margin = {top: 20, right: 30, bottom: 20, left: 100};
        vis.width = document.getElementById(vis.parentElement).parentElement.parentElement.getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = vis.maxHeight;

        if (TIME_SERIES_VIS_DEBUG) {
            console.log("width:", vis.width, "height:", vis.height)
        }

        vis.svg = d3.select("#" + vis.parentElement)
            .append("svg")
		    .attr("width", vis.width + vis.margin.left + vis.margin.right)
		    .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
	        .append("g")
		    .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

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

        vis.div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        // add the X gridlines
        vis.xGridLines = vis.svg.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + vis.height + ")")

        // add the Y gridlines
        vis.yGridLines = vis.svg.append("g")
            .attr("class", "grid")

        // probably a better way to do this
        vis.eventData.forEach(e => {
            if (!vis.eventMap.has(e.city)) {
                vis.eventMap.set(e.city, new Map());
            }
            vis.eventMap.get(e.city).set(vis.formatDate(e.event_date), e.description);
        })

        vis.svg.append("path")
            .attr("class", "boston-line")

        vis.svg.append("path")
            .attr("class", "nyc-line")

        vis.svg.append("path")
            .attr("class", "sf-line")

        this.wrangleData();
    }

    wrangleData(startDate, endDate) {
        let vis = this;

        vis.selectedDataType = document.getElementById(vis.idPrefix + '-timeSeriesDataType').value;

        if (TIME_SERIES_VIS_DEBUG) {
            console.log('cities selected:', vis.selectedDataType)
        }

        if (startDate == undefined && endDate == undefined) {
            vis.filteredData = vis.data.filter(d => vis.cities.has(d.city))
        } else {
            vis.filteredData = vis.data.filter(d => vis.cities.has(d.city) && d.trip_date >= startDate && d.trip_date <= endDate)
        }

        vis.updateVis();
    }

    updateCityVis(city) {
        let vis = this;

        let cityData = vis.filteredData.filter(d => d.city == city)

        if (TIME_SERIES_VIS_DEBUG) {
            console.log('city:', city, 'data', cityData);
        }

        let cityPathName = city + "Path";
        let cityLineName = city + "Line";

        vis[cityLineName] = d3.line()
            .x(d => vis.x(d.trip_date))
            .y(d => vis.y(d[vis.selectedDataType]))
            .curve(d3.curveLinear)

        let cityLineClass = city + "-line";

        vis[cityPathName] = vis.svg.selectAll("." + cityLineClass)
            .datum(cityData)

        vis[cityPathName].enter()
            .append("path")
            .attr("class", cityLineClass)
            .merge(vis[cityPathName])
            .attr("d", vis[cityLineName])

        vis[cityPathName].exit().remove();

        // add hover overs
        let cityPointClass = city + "-point";

        vis[cityPointClass] = vis.svg.selectAll("." + cityPointClass)
            .data(cityData);

        vis[cityPointClass].enter()
            .append("circle")
            .attr("class", cityPointClass)
            .merge(vis[cityPointClass])
            .attr("r", d => {
                if (vis.eventMap.has(d.city) && vis.eventMap.get(d.city).has(vis.formatDate(d.trip_date))) {
                    return 8;
                }
                return 1;
            })
            // .attr("stroke", d => {
            //     if (vis.eventMap.has(d.city) && vis.eventMap.get(d.city).has(vis.formatDate(d.trip_date))) {
            //         return ;
            //     }
            //     return ;
            // })
            .attr("cx", d => vis.x(d.trip_date))
            .attr("cy", d => vis.y(d[vis.selectedDataType]))
            .on("mouseover", function(event, d) {
                vis.div.transition()
                    .style("opacity", 1);

                let toolTipText =
                    d.trip_date.toDateString()
                    + "<br/>"
                    + "Trips Taken: " + d.trip_count
                    + "<br/>"
                    + "Median Trip Duration: " + d.median_trip_duration_minutes.toFixed(2) + " min";

                if (vis.eventMap.has(d.city) && vis.eventMap.get(d.city).has(vis.formatDate(d.trip_date))) {
                    toolTipText += "<br/><br/>" + vis.eventMap.get(d.city).get(vis.formatDate(d.trip_date))
                }

                vis.div.html(toolTipText)
                    .style("left", (event.pageX) + "px")
                    .style("top", (event.pageY - 50) + "px");
            })
            .on("mouseout", function(event, d) {
                vis.div.transition()
                    .duration(4000)
                    .style("opacity", 0);
            });
        vis[cityPointClass].exit().remove();
    }

    updateVis() {
        let vis = this;

        if (TIME_SERIES_VIS_DEBUG) {
            console.log('Filtered data', vis.filteredData)
        }

        let trip_metric = vis.filteredData.map(d => d[vis.selectedDataType])
        let trip_metric_max = d3.max(trip_metric);

        vis.y.domain([0, trip_metric_max])

        if (vis.filteredData.length == 0) {
            vis.x.domain([])
        } else {
            let startDate = vis.filteredData[0].trip_date;
            let endDate = vis.filteredData[vis.filteredData.length - 1].trip_date;

            if (TIME_SERIES_VIS_DEBUG) {
                console.log('Start Date', startDate, 'End Date', endDate);
            }

            vis.x.domain([startDate, endDate])

            //TODO: remove hard coding, compute on the fly and why the does month start at zero but day starts at 1?
            let tickValues = [new Date(2017, 0, 1),
                new Date(2018, 0, 1),
                new Date(2019, 0, 1),
                new Date(2020, 0, 1),
                new Date(2021, 0, 1)]

            vis.xGridLines
                .call(d3.axisBottom(vis.x)
                    .tickValues(tickValues)
                    .tickSize(-vis.height)
                    .tickFormat("")
                );
        }

        vis.yGridLines
            .call(d3.axisLeft(vis.y)
                .tickSize(-vis.width)
                .tickFormat("")
            );

        vis.svg.select(".x-axis")
            .transition()
            .call(vis.xAxis);

        vis.svg.select(".y-axis")
            .transition()
            .call(vis.yAxis);

        vis.updateCityVis('boston');
        vis.updateCityVis('sf');
        vis.updateCityVis('nyc');
    }
}