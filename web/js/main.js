let parseDate = d3.timeParse("%Y-%m-%d");
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
    d3.csv("data/minute_summary.csv", row => {
        row.hour = +row.hour;
        row.minute = +row.hour * 60 + +row.minute;
        row.riders = +row.riders;
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
    }),
    d3.csv("data/summary_by_city_by_month.csv", row => {
        row.station_count = +row.station_count;
        row.event_date = parseDate(row.year + "-" + row.month + "-01");
        row.trip_count = +row.trip_count;
        row.average_duration = +row.average_duration;
        row.year = +row.year;
        row.month = +row.month;
        return row;
    }),
    d3.csv('data/2017_present_trips.csv', row => {
        delete row[""]
        row.trip_count = +row.trip_count;
        row.distance = +row.distance;
        return row;
    }),
    d3.csv('data/round_trips_by_month.csv', row => {
        row.round_trip_count = +row.round_trip_count;
        row.trip_count = +row.trip_count;
        row.start_year = +row.start_year;
        row.start_month = +row.start_month;
        row.event_date = parseDate(row.year + "-" + row.month + "-01");
        row.round_trip_ratio = row.round_trip_count / row.trip_count;
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
    let dayViewData = prepDayData(data[1]);
    let fromToData = data[2];
    let eventData = data[3];
    let monthlySummaryData = data[4];
    let tripStationData = data[5];
    let roundTripData = data[6];

    // Create event handler
    let eventHandler = {
        bind: (eventName, handler) => {
            document.body.addEventListener(eventName, handler);
        },
        trigger: (eventName, extraParameters) => {
            document.body.dispatchEvent(new CustomEvent(eventName, {
                detail: extraParameters
            }));
        }
    }

    tripCountTimeSeriesVis = new TimeSeriesVis('tripCountTimeSeriesPlot', 'tripCountTimeSeriesBrush', tripData, eventData, "tripCount", 'trip_count_7d_ma_norm');
    timeDurationtimeSeriesVis = new TimeSeriesVis('tripDurationTimeSeriesPlot', 'tripDurationTimeSeriesBrush', tripData, eventData, "tripDuration", 'median_trip_duration_minutes');

    barVis = new BarVis('aggregateBarChart', tripData, metro_labels, 'Cumulative Trip Count')
    forceNetworkVis = new ForceNetworkVis('forceStationNetworkArea', tripStationData, 'nyc', 800)

    let date = new Date("2021-07-01T00:00:00-04:00") // keep -04:00
    windMap = new WindMap(windIds, fromToData, date);
    updateWindmap()

    stackedBar = new StackedAreaVis('stackedAreaChart', monthlySummaryData, 'city',
        'Stations by city');
    lineVis = new lineGraphVis('lineGraph', roundTripData);

    dayViewBoston = new DayViewRadial('day-view-boston', dayViewData['Boston'], "Boston");
    dayViewNyc = new DayViewRadial('day-view-nyc', dayViewData['NYC'], "NYC");
    dayViewSf = new DayViewRadial('day-view-sf', dayViewData['SF'], "SF");
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

function prepDayData(data) {
    let map = {
        "Boston": [],
        "NYC": [],
        "SF": []
    };
    for (let row of data) {
        if (map[row.city][row.date] === undefined) {
            map[row.city][row.date] = [];
        }
        map[row.city][row.date].push(row);
    }
    return map;
}

function updateVisualization() {
    tripCountTimeSeriesVis.wrangleData();
    timeDurationtimeSeriesVis.wrangleData()
    barVis.wrangleData();
    forceNetworkVis.wrangleData();
    lineVis.wrangleData();
}

function updateDayDates() {
    dayViewBoston.wrangleData();
    dayViewNyc.wrangleData();
    dayViewSf.wrangleData();
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

let scroller = new Scroller("step");
