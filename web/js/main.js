let parseDate = d3.timeParse("%Y-%m-%d");
let parseDateTime = d3.timeParse("%m/%d/%Y %H:%M"); // 3/21/21 19:42

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
    console.log(data)

    let tripCountData = data[0];
    let tripDurationData = data[1];
    let stationData = data[2];
    let dayViewData = data[3];

    let cities = ['boston', 'nyc', 'sf']

    timeSeriesVis = new TimeSeriesVis('chart-area', tripCountData, cities)

    dayView = new DayView('day-view', null);

    dayView = new DayView('day-view', dayViewData);
}

function updateVisualization() {
    timeSeriesVis.wrangleData();
    dayView.wrangleData();
}
