let parseDate = d3.timeParse("%Y-%m-%d");
let parseDateTime = d3.timeParse("%m/%d/%Y %H:%M"); // 3/21/21 19:42
let parseUTC = d3.utcParse("%Y-%m-%dT%H:%M:%S.%L%Z");

// HTML element ID's for windmap.
var windIds = {
    chart: "wind-map",
    city: "singleCity",
    getTime: "windTime",
    setTime: "showWindTime",
    setDay: "showWindDay"
}

var stationSources = {
    boston: 'https://gbfs.bluebikes.com/gbfs/en/station_information.json',
    sf: 'https://gbfs.baywheels.com/gbfs/en/station_information.json',
    nyc: 'https://gbfs.citibikenyc.com/gbfs/en/station_information.json'
}

// Save city selection for windmap, default is set in HTML.
var singleCity = ''

let metro_labels = {
    sf: 'Bay Area',
    boston: 'Boston Metro',
    nyc: 'New York City Metro'
}

let promises = [
    d3.csv("data/2017_present_trip_data.csv", row => {
        delete row[""]
        row.trip_count = +row.trip_count
        row.trip_date = parseDate(row.trip_date)
        row.median_trip_duration_minutes = +row.median_trip_duration_minutes
        row.trip_count_7d_ma = +row.trip_count_7d_ma
        row.trip_count_14d_ma = +row.trip_count_14d_ma
        return row;
    }),
    d3.csv("data/2021-03-21 dayview.csv", row => {
        row.Time = parseDateTime(row.Time)
        row.Riders = +row.Riders
        return row;
    }),
    d3.csv("data/all_trips_by_date.csv", row => {
        row.trip_start = parseUTC(row.trip_start);
        row.trip_end = parseUTC(row.trip_end);
        return row;
    }),
    d3.csv("data/2017_present_events.csv", row => {
        row.event_date = parseDate(row.event_date)
        return row;
    })
];

Promise.all(promises)
    .then(function (data) {
        createVis(data);
    })
    .catch(function (err) {
        console.log("Error: ", err);
    });

function createVis(data) {

    let tripData = data[0];
    let dayViewData = data[1];
    let fromToData = data[2];
    let eventData = data[3]

    let cities = ['sf', 'boston', 'nyc']

    timeSeriesVis = new TimeSeriesVis('chart-area', tripData, cities, eventData, 380)
    timeline = new TimeSeriesTimeline("timeSeriesBrush", groupByTripDate(tripData))
    barVis = new BarVis('aggregateBarChart', tripData, metro_labels, 'Cumulative Trip Count')

    let date = new Date("2021-07-01T00:00:00-04:00") // keep -04:00
    windMap = new WindMap(windIds, fromToData, date);
    updateWindmap()

    dayView = new DayViewRadial('day-view', dayViewData);
}

function groupByTripDate(tripData) {
    var result = [];
    tripData.reduce(function(res, value) {
        if (!res[value.trip_date]) {
            res[value.trip_date] = { trip_date: value.trip_date, trip_count: 0 };
            result.push(res[value.trip_date])
        }
        res[value.trip_date].trip_count += value.trip_count;
        return res;
    }, {});

    result.sort((a,b) => b.trip_date - a.trip_date)
    return result;
}

function updateVisualization() {
    timeSeriesVis.wrangleData();
    dayView.wrangleData();
    barVis.wrangleData();
}

function updateWindmap() {
    const currentCity = document.querySelector(`input[name=${windIds.city}]:checked`).value

    if (currentCity !== singleCity) {
        singleCity = currentCity
        fetch(stationSources[currentCity])
            .then(response => response.json())
            .then(result => windMap.wrangleData(result.data.stations, currentCity))
    } else {
        windMap.filterTime()
    }
}

function timeSeriesBrushed() {
    let selectionRange = d3.brushSelection(d3.select(".brush").node());
    let selectionDomain = selectionRange.map(timeline.x.invert);

    timeSeriesVis.wrangleData(selectionDomain[0], selectionDomain[1]);
    barVis.onSelectionChange(selectionDomain[0], selectionDomain[1])
}

let scroller = new Scroller("step");
