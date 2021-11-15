
class WindMap {

	constructor(parentElement, stationData, mapCenter) {
		this.parentElement = parentElement;
		this.stationData = stationData.data.stations;
		this.mapCenter = mapCenter;

		this.initVis();
	}

	initVis () {
		let vis = this;

		// Set default image location.
		L.Icon.Default.imagePath = 'img/';

		// Initialize map object.
		vis.map = L.map(vis.parentElement, {
			keyboard: false,
			scrollWheelZoom: false,
		}).setView(vis.mapCenter, 12);

		// Add tile-layer to the map.
		L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
			attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
			maxZoom: 16
		}).addTo(vis.map);

		// Create overlay for stations.
		const overlayPane = d3.select(vis.map.getPanes().overlayPane);

		// Create a svg in our overlay.
		L.svg({ pane: 'overlayPane' }).addTo(vis.map);

		// Add the 'leaflet-zoom-hide' class to hide this when zooming.
		vis.svg = overlayPane.select('svg').classed('leaflet-zoom-hide', true);

		vis.stationGroup = vis.svg.append("g")
			.attr("class", "stationGroup")

		vis.windGroup = vis.svg.append("g")
			.attr("class", "windGroup")

		vis.wrangleData();
	}

	wrangleData () {
		let vis = this;

		vis.displayStationData = []

		vis.stationData.forEach((station) => {
			vis.displayStationData.push({
				id: station.station_id,
				name: station.name,
				latitude: station.lat,
				longitude: station.lon
			})
		})

		vis.windData = []

		const topLeft = [42.425408, -71.158395]
		const exp = 10

		for (let i = 0; i < 100; i++){
			const x = i % exp
			const y = Math.floor(i / exp)
			vis.windData.push({
				from: {
					latitude: topLeft[0] - (0.02 * x),
					longitude: topLeft[1] + (0.02 * y)
				},
				to: {
					latitude: topLeft[0]  - (0.02 * x),
					longitude: topLeft[1] + (0.02 * y) - 0.1
				}
			})
		}

		console.log("windData", vis.windData)
		vis.updateVis();
	}

	updateVis() {
		let vis = this;

		const getPoint = function(d) {
			const point = vis.map.latLngToLayerPoint([d.latitude, d.longitude]);
			return point
		}

		vis.blueBikeStations = vis.stationGroup.selectAll("circle.station")
			.data(vis.displayStationData)
			.enter()
			.append("circle")
			.attr("class", "station")
			.attr("fill", "blue")
			.attr("r", 2)

		vis.windLines = vis.windGroup.selectAll("line.wind")
			.data(vis.windData)
			.enter()
			.append("line")
			.attr("class", "wind")
			.attr("stroke", "black")

		function update() {
			vis.blueBikeStations
				.attr("transform", (d) => `translate(${getPoint(d).x}, ${getPoint(d).y})`)

			vis.windLines
				.attr("x1", (d) => getPoint(d.from).x)
				.attr("y2", (d) => getPoint(d.from).y)
				.attr("x2", (d) => getPoint(d.to).x)
				.attr("y2", (d) => getPoint(d.to).y)
		}

		vis.map.on("moveend", update);
		update();



	}
}

