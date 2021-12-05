const TIME_SERIES_VIS_DEBUG = false;

const city_label_mapping = {
    'sf': 'Bay Area',
    'boston': 'Boston Metro',
    'nyc': 'NYC Metro'
}

const label_city_mapping = {
    'Bay Area' : 'sf',
    'Boston Metro': 'boston',
    'NYC Metro': 'nyc'
}

const data_number_formatting_mapping = {
    'trip_count_norm': '.4f',
    'trip_count_7d_ma': ',.0f',
    'trip_count_7d_ma_norm': '.4f',
    'trip_count' : ',.0f',
    'median_trip_duration_minutes': '.2f',
}

const tickValues = [new Date(2017, 0, 1),
    new Date(2018, 0, 1),
    new Date(2019, 0, 1),
    new Date(2020, 0, 1),
    new Date(2021, 0, 1)]


class TimeSeriesPlotVis {

    constructor(parentElement, data, cities, eventData, maxHeight, idPrefix) {
        this.parentElement = parentElement;
        // assumes data is sorted
        this.data = data;
        this.formatDate = d3.timeFormat("%b %Y");
        this.cities = new Set(cities)
        this.eventData = eventData;
        this.filteredEventData = eventData;
        this.eventMap = new Map()
        this.maxHeight = maxHeight;
        this.idPrefix = idPrefix;
        this.citiesMap = new Map();

        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.margin = {top: 100, right: 40, bottom: 50, left: 60};
        vis.width = document.getElementById(vis.parentElement).parentElement.parentElement.parentElement.getBoundingClientRect().width - vis.margin.left - vis.margin.right;
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
            .ticks(7);

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

        // hover tip
        let tooltipGroup = vis.svg.append('g')
            .attr('class', 'tooltip_group')
            .style('display', 'none')

        tooltipGroup.append('line')
            .attr('class', 'hover_line')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', -75)
            .attr('y2', vis.height);

        tooltipGroup.append('text')
            .attr('class', 'hover_date_text')
            .attr('x', 10)
            .attr('y', -75);

        tooltipGroup.append('text')
            .attr('class', 'hover_data_text hover0')
            .attr('x', 10)
            .attr('y', -55);

        tooltipGroup.append('text')
            .attr('class', 'hover_data_text hover1')
            .attr('x', 10)
            .attr('y', -35);

        tooltipGroup.append('text')
            .attr('class', 'hover_data_text hover2')
            .attr('x', 10)
            .attr('y', -15);

        vis.svg.append('rect')
            .attr('fill', 'transparent')
            .attr('width', vis.width)
            .attr('height', vis.height)
            .on('mouseover', () => tooltipGroup.style('display', null))
            .on('mouseout', () => tooltipGroup.style('display', 'none'))
            .on('mousemove', mousemove)

        function mousemove(event){
            const formatNum = d3.format(data_number_formatting_mapping[vis.selectedDataType]);
            let x = d3.pointer(event)[0];
            let xDate = vis.x.invert(d3.pointer(event)[0]);
            tooltipGroup.attr('transform', 'translate(' + x + ', 0)');
            let shiftLeft = 0
            if (d3.pointer(event)[0] > vis.width - 140) {
                shiftLeft = -135;
            }
            tooltipGroup.select(".hover_date_text")
                .attr('transform', 'translate(' + shiftLeft + ', 0)');
            d3.range(3).forEach((d) => {
                tooltipGroup.select(".hover_data_text.hover" + d)
                    .attr('transform', 'translate(' + shiftLeft + ', 0)');
            });

            let cities = Array.from(vis.cities)
            cities = cities.map(c => city_label_mapping[c])
            cities.sort();

            let i = 0;

            cities.forEach(c => {
                let record = vis.citiesMap.get(label_city_mapping[c]).get(vis.formatDate(xDate));
                if (record != undefined) {
                    let dataText = c + ": " + formatNum(record[vis.selectedDataType]);
                    tooltipGroup.select('.hover' + i)
                        .text(dataText)

                    i++;
                }
            })

            // clear out remaining hovers
            while (i < 3) {
                tooltipGroup.select('.hover' + i)
                    .text("")
                i++;
            }

            if (xDate != "Invalid Date") {
                tooltipGroup.select('.hover_date_text')
                    .text(xDate.toDateString())
            } else {
                tooltipGroup.select('.hover_date_text')
                    .text("")
            }
        }

        vis.dataMap = new Map();
        vis.data.forEach(row => {
            if (!vis.dataMap.has(row.city)) {
                vis.dataMap.set(row.city, [])
            }
            vis.dataMap.get(row.city).push(row);
        })

        this.wrangleData();
    }

    wrangleData(startDate, endDate) {
        let vis = this;

        vis.selectedDataType = document.getElementById(vis.idPrefix + '-timeSeriesDataType').value;

        if (TIME_SERIES_VIS_DEBUG) {
            console.log('cities selected:', vis.selectedDataType)
        }

        if (startDate == undefined && endDate == undefined) {
            vis.filteredDataMap = new Map();
            vis.cities.forEach(city => {
                vis.filteredDataMap.set(city, vis.dataMap.get(city))
            });

            vis.filteredEventData = vis.eventData.filter(d => vis.cities.has(d.city));
        } else {
            vis.filteredDataMap = new Map();
            vis.cities.forEach(city => {
                let cityData = vis.dataMap.get(city).filter(d => d.trip_date >= startDate && d.trip_date <= endDate);
                vis.filteredDataMap.set(city, cityData)
            });

            vis.filteredEventData = vis.eventData.filter(d => vis.cities.has(d.city) && d.event_date >= startDate && d.event_date <= endDate)
        }

        vis.updateVis();
    }

    updateCityVis(city) {
        let vis = this;

        let cityData = vis.filteredDataMap.has(city) ? vis.filteredDataMap.get(city) : [];

        let cityEventData = vis.filteredEventData.filter(d => d.city == city)

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

        let cityDataMap = new Map();
        cityData.forEach(d => {
            cityDataMap.set(vis.formatDate(d.trip_date), d);
        })

        this.citiesMap.set(city, cityDataMap);

        // add hover overs
        let cityPointClass = city + "-point-event";

        vis[cityPointClass] = vis.svg.selectAll("." + cityPointClass)
            .data(cityEventData);

        vis[cityPointClass].enter()
            .append("circle")
            .attr("class", cityPointClass)
            .merge(vis[cityPointClass])
            .attr("r", 10)
            .attr("cx", d => vis.x(d.event_date))
            .attr("cy", d => {
                let record = cityDataMap.get(vis.formatDate(d.event_date));

                if (record == undefined) {
                    return 0;
                }

                return vis.y(record[vis.selectedDataType])
            })
            .on("mouseover", function(event, d) {
                vis.div.transition()
                    .style("opacity", 1);

                let toolTipText = d.event_date.toDateString()
                    + "<br/>"
                    + d.description;

                vis.div.html(toolTipText)
                    .style("left", (event.pageX) + "px")
                    .style("top", (event.pageY - 50) + "px");
            })
            .on("mouseout", function(event, d) {
                vis.div.transition()
                    .duration(1000)
                    .style("opacity", 0);
            });

        vis[cityPointClass].exit().remove();
    }

    updateVis() {
        let vis = this;

        let trip_metrics = [];

        vis.cities.forEach(city => {
            let trip_metric = vis.filteredDataMap.get(city).map(d => d[vis.selectedDataType]);
            trip_metrics = trip_metrics.concat(trip_metric);
        });

        let trip_metric_max = d3.max(trip_metrics);

        vis.y.domain([0, trip_metric_max])

        if (vis.filteredDataMap.size == 0) {
            vis.x.domain([])
        } else {
            let startDates = [];
            let endDates = [];

            vis.cities.forEach(city => {
                if (vis.filteredDataMap.has(city)) {
                    let filteredData = vis.filteredDataMap.get(city);
                    if (filteredData.length > 0) {
                        startDates.push(filteredData[0].trip_date);
                        endDates.push(filteredData[filteredData.length - 1].trip_date);
                    }
                }
            });

            let startDate = d3.min(startDates);
            let endDate = d3.max(endDates);

            if (startDate == undefined && endDate == undefined) {
                vis.x.domain([])
            } else {
                vis.x.domain([startDate, endDate])
                vis.xGridLines
                    .call(d3.axisBottom(vis.x)
                        .tickValues(tickValues)
                        .tickSize(-vis.height)
                        .tickFormat("")
                    );
            }
        }

        vis.yGridLines
            .call(d3.axisLeft(vis.y)
                .tickSize(-vis.width)
                .tickFormat("")
            );

        vis.svg.select(".x-axis")
            .transition()
            .call(vis.xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", function (d) {
                return "rotate(-30)";
            });

        vis.svg.select(".y-axis")
            .transition()
            .call(vis.yAxis);

        vis.updateCityVis('boston');
        vis.updateCityVis('sf');
        vis.updateCityVis('nyc');
    }
}