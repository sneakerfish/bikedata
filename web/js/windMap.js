


class WindMap {

	constructor(windIds, fromToData, date) {
		this.ids = windIds
		this.parentElement = windIds.chart;
		this.tripData = fromToData
		this.date = date
		this.debug = false

		this.formatTime = d3.timeFormat("%I:%M %p") // 09:01 AM

		this.centers = {
			boston: [42.356070, -71.086808],
			nyc: [40.712776, -74.005974],
			sf: [37.774929, -122.419418]
		}

		// Get default city.
		this.city = document.querySelector(`input[name=${windIds.city}]:checked`).value

		this.initVis();
	}

	initVis () {
		let vis = this;

		// Set scale for radius, representing amount of people.
		vis.r = d3.scaleLinear()
			.range([50, 300])

		// Set scale for circlecolor, representing coming or going.
		vis.c = d3.scaleLinear()
			.range(['red', 'pink', 'blue'])

		// Set default image location.
		L.Icon.Default.imagePath = 'img/';

		// Center the map.
		vis.mapCenter = vis.centers[vis.city]

		// Initialize map object.
		vis.map = L.map(vis.parentElement, {
			keyboard: false,
			scrollWheelZoom: false,
		}).setView(vis.mapCenter, 12)

		// Because of scrolly-telling the leaflet changes size.
		// Check when it is made visible and recalculate size.
		var element = document.getElementById('wind')

		var observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				if (mutation.type === "attributes") {
					vis.map.invalidateSize()
				}
			});
		});

		observer.observe(element, {
			attributes: true
		})

		// Add tile-layer to the map.
		L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
			attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
			maxZoom: 16
		}).addTo(vis.map);

		vis.stationGroup = L.layerGroup().addTo(vis.map);

		// wrangleData will be called from updateVisualisation.
	}

	wrangleData (data, city) {
		let vis = this;

		vis.stationData = data
		vis.city = city

		vis.debug && console.log("stationData", vis.stationData)
		vis.stationData = vis.stationData.map((d) => {

			// In nyc and sf they use shortname in station_id fields.
			const station_id = vis.city === 'boston' ? d.station_id : d.short_name
			return {
				station_id: station_id,
				name: d.name,
				lat: d.lat,
				lon: d.lon
			}
		})


		// Center the map.
		vis.mapCenter = vis.centers[vis.city]
		vis.debug && console.log("singleCity:",vis.city)
		vis.map.setView(vis.mapCenter, 12)

		vis.stationIds = vis.stationData.map((d) => {
			return d.station_id
		})

		vis.debug && console.log("stationIds: ", vis.stationIds)

		vis.debug && console.log("tripData: ", vis.tripData)
		let counter = 0
		// Clean trip data.
		vis.filteredTrips = []
		for (let i = 0; i < vis.tripData.length; i++) {
			const d = vis.tripData[i]

			if (d.city !== vis.city) { continue } // Right city.

			if (!(d.trip_start && d.trip_end)) { continue } // Has dates.

			if (!(d.start_station_id && d.end_station_id)) { continue } // Has station id's.

			// Check if stations are still in use.
			if (!vis.stationIds.includes(d.start_station_id)) { continue }
			if (!vis.stationIds.includes(d.end_station_id)) { continue }

			// Check if the trip starts and ends on the same day.
			const sameDay = d.trip_start.toDateString() === d.trip_end.toDateString()
			if (!sameDay) {	continue }

			// don't include round trips.
			const sameStation = d.start_station_id === d.end_station_id
			if (sameStation) { continue }

			vis.filteredTrips.push(d)
		}

		vis.debug && console.log("filteredTrips", vis.filteredTrips)

		vis.filterTime()
	}

	// Will be called when user changes time.
	filterTime() {
		let vis = this;

		// Get and set time.
		const minutes = document.getElementById(vis.ids.getTime).value
		vis.time = new Date(vis.date.getTime() + 60000 * minutes)
		vis.debug && console.log("time", vis.time)

		// Initialize in/out data.
		vis.stationInOut = {}
		vis.stationData.forEach((d) => {
			vis.stationInOut[d.station_id.toString()] = 0
		})

		// Create array of trips that are currently happening.
		vis.currentTrips = []
		vis.filteredTrips.forEach((d) => {

			// Check if the trip is happening at the time.
			if (d.trip_start < vis.time && d.trip_end > vis.time) {
				vis.stationInOut[d.start_station_id]--
				vis.stationInOut[d.end_station_id]++

				vis.currentTrips.push(d)
			}
		})

		vis.debug && console.log("currentTrips: ", vis.currentTrips)
		vis.debug && console.log("stationInOut: ", vis.stationInOut)

		// Create new array with stations that have people coming or going.
		vis.filteredStations = []
		vis.stationData.forEach((d) => {
			const inoutValue = vis.stationInOut[d.station_id]

			if(inoutValue !== 0) {
				d['inout'] = inoutValue
				vis.filteredStations.push(d)
			}
		})

		vis.debug && console.log("filteredStations: ", vis.filteredStations)

		vis.updateVis();
	}

	updateVis() {
		let vis = this;

		// Set HTML elements to current date/time.
		document.getElementById(vis.ids.setDay).innerText = vis.time.toDateString()
		document.getElementById(vis.ids.setTime).innerText = vis.formatTime(vis.time)

		// Take abs value, both 1 coming, or 1 going have minimal radius.
		const rMin = d3.min(vis.filteredStations, d => Math.abs(d.inout))
		const rMax = d3.max(vis.filteredStations, d => Math.abs(d.inout))
		const cMin = d3.min(vis.filteredStations, d => d.inout)
		const cMax = d3.max(vis.filteredStations, d => d.inout)

		vis.r.domain([rMin, rMax])
		vis.c.domain([cMin, 0, cMax])

		vis.debug && console.log("filteredstations", vis.filteredStations)

		vis.stationGroup.clearLayers();

		vis.filteredStations.forEach((d) => {
			let circle = L.circle([d.lat, d.lon], vis.r(Math.abs(d.inout)), {
				color: vis.c(d.inout),
				fillColor: vis.c(d.inout),
				strokeWidth: "1px",
				// opacity: 1,
				// fillOpacity: 0.5
			})

			vis.stationGroup.addLayer(circle)
		})

	}
}

