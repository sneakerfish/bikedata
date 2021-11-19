let parseDate = d3.timeParse("%Y-%m-%d");
let parseDateTime = d3.timeParse("%m/%d/%Y %H:%M"); // 3/21/21 19:42

let promises = [
    d3.csv("data/2017_present_trip_data.csv", row => {
        delete row[""]
        row.trip_count = +row.trip_count
        row.trip_date = parseDate(row.trip_date)
        row.median_trip_duration_minutes = +row.median_trip_duration_minutes
        // row.median_trip_duration_minutes = +parseFloat(row.median_trip_duration_minutes).toFixed(2);
        return row;
    }),
    fetch('https://gbfs.bluebikes.com/gbfs/en/station_information.json')
        .then(response => response.json()),
    d3.csv("data/2021-03-21 dayview.csv", row => {
        row.Time = parseDateTime(row.Time)
        row.Riders = +row.Riders
        return row;
    }),
];

Promise.all(promises)
    .then(function (data) {
        createVis(data)
    })
    .catch(function (err) {
        console.log(err)
    });

function createVis(data) {

    let tripData = data[0];
    let stationData = data[1];
    let dayViewData = data[2];

    let cities = ['boston', 'nyc', 'sf']

    timeSeriesVis = new TimeSeriesVis('chart-area', tripData, cities)
    timeline = new TimeSeriesTimeline("timeSeriesBrush", groupByTripDate(tripData))

    windMap = new WindMap("wind-map", stationData, [42.356070, -71.086808]);

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
    return result;
}

function updateVisualization() {
    timeSeriesVis.wrangleData();
    dayView.wrangleData();
}

function timeSeriesBrushed() {
    let selectionRange = d3.brushSelection(d3.select(".brush").node());
    let selectionDomain = selectionRange.map(timeline.x.invert);

    console.log(selectionDomain)

    timeSeriesVis.wrangleData(selectionDomain[0], selectionDomain[1]);
}