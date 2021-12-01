let promises = [
    d3.csv('data/2017_present_trips.csv', row => {
        delete row[""]
        row.trip_count = +row.trip_count;
        row.distance = +row.distance;
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
    let tripStationData = data[0];

    forceNetworkVis = new ForceNetworkVis('forceStationNetworkArea', tripStationData, 'nyc')
}

function updateVisualization() {
    forceNetworkVis.wrangleData();
}
