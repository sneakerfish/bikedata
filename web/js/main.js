let parseDate = d3.timeParse("%Y-%m-%d");

let promises = [
    d3.csv("data/2017_present_trip_count.csv", row => {
        delete row[""]
        row.trip_date = parseDate(row.trip_date)
        row.trip_count = +row.trip_count
        return row;
    }),
    d3.csv("data/2017_present_trip_duration.csv", row => {
        delete row[""]
        row.trip_date = parseDate(row.trip_date)
        row.median_trip_duration_minutes = +parseFloat(row.median_trip_duration_minutes).toFixed(2);
        return row;
    })
];

Promise.all(promises)
    .then(function (data) {
        createVis(data)
    })
    .catch(function (err) {
        console.log(err)
    });

function createVis(data) {
    console.log(data)

    let tripCountData = data[0];
    let tripDurationData = data[1];

    let cities = ['boston', 'nyc', 'sf']

    timeSeriesVis = new TimeSeriesVis('chart-area', tripCountData, cities)

    dayView = new DayView('day-view', null);
}

function updateVisualization() {
    timeSeriesVis.wrangleData();
    dayView.wrangleData();
}
