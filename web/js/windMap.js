


class WindMap {

	constructor(windIds, fromToData, date) {
		this.ids = windIds
		this.parentElement = windIds.chart;
		this.tripData = fromToData
		this.date = date
		this.debug = false
		this.displayData = []

		this.formatTime = d3.timeFormat("%I:%M %p") // 09:01 AM

		this.centers = {
			boston: [42.356070, -71.086808],
			nyc: [40.712776, -74.005974],
			sf: [37.774929, -122.419418]
		}

		this.colors = {
			inactive: "lightgrey",  // no activity.
			active: "steelblue",    // net zero activity.
			in: "lawngreen",        // more people coming in.
			out: "orangered",       // more people going out.
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

		// Set scale for line-weight.
		vis.l = d3.scaleLinear()
			.range([1,10])

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
		vis.lineGroup = L.layerGroup().addTo(vis.map);

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

		vis.stationInfo = {}
		vis.stationData.forEach((d) => {
			vis.stationInfo[d.station_id] = {
				station_id: d.station_id,
				name: d.name,
				loc: [d.lat, d.lon],
				in: [],
				out: [],
				retour: 0,
				status: "inactive",
				color: vis.colors.inactive,
				travelers: { in: {}, out: {} }, // in: { station_id: 5 }
				direction: "none",
				min: 0,
				max:0
			}
		})

		// Create array of trips that are currently happening.
		vis.currentTrips = []
		vis.filteredTrips.forEach((d) => {

			// Check if the trip is happening at the time.
			if (d.trip_start < vis.time && d.trip_end > vis.time) {

				// Check for return trip.
				if(d.start_station_id === d.end_station_id){
					vis.stationInfo[d.start_station_id].retour++
				}

				vis.stationInfo[d.start_station_id].out.push(d.end_station_id)
				vis.stationInfo[d.end_station_id].in.push(d.start_station_id)

				vis.currentTrips.push(d)
			}
		})

		vis.debug && console.log("stationInfo: ", vis.stationInfo)
		vis.debug && console.log("currentTrips: ", vis.currentTrips)

		vis.displayData = []
		Object.values(vis.stationInfo).forEach((d) => {
			d['change'] = -d.out.length + d.in.length

			// Set status and color of the station.
			// Station can have net zero activity.
			if (d.in.length + d.out.length !== 0 && d.change === 0) {
				d.status = "active"
				d.color = vis.colors.active
			} else if (d.change > 0) {
				d.direction = "in"
				d.color = vis.colors.in
			} else if (d.change < 0) {
				d.direction = "out"
				d.color = vis.colors.out
			}

			// Set min and max
			d.min = d3.min([d.in.length, d.out.length])
			d.max = d3.max([d.in.length, d.out.length])

			// Set amount of travelers on route from or to this station.
			const dir = d.direction
			if (dir !== "none") {
				d[dir].forEach((link) => {
					if (!d.travelers[dir][link]){
						d.travelers[dir][link] = 1
					} else {
						d.travelers[dir][link]++
					}
				})
			}

			vis.displayData.push(d)
		})

		vis.debug && console.log("stationInfoArray: ", vis.stationInfoArray)
		vis.debug && console.log("displayData: ", vis.displayData)

		vis.updateVis();
	}

	updateVis() {
		let vis = this;

		// Set HTML elements to current date/time.
		document.getElementById(vis.ids.setDay).innerText = vis.time.toDateString()
		document.getElementById(vis.ids.setTime).innerText = vis.formatTime(vis.time)

		// Setup radius domain.
		const rMin = d3.min(vis.displayData, d => Math.abs(d.change))
		const rMax = d3.max(vis.displayData, d => Math.abs(d.change))

		vis.r.domain([rMin, rMax])

		// Setup domain for line-weights.
		const lMin = d3.min(vis.displayData, d => d.min)
		const lMax = d3.max(vis.displayData, d=> d.max)

		vis.l.domain([lMin, lMax])

		// Clear previous visualization.
		vis.stationGroup.clearLayers();
		vis.lineGroup.clearLayers();

		// Add each station.
		vis.displayData.forEach((d) => {
			vis.stationGroup.addLayer(circle(d))
		})

		function circle (d) {
			const radius = vis.r(Math.abs(d.change))

			return L.circle(d.loc, radius, {
				color: d.color,
				fillColor: d.color,
				strokeWidth: "1px",
				}
			).on("mouseover", () => addLines(d))
		}

		function addLines(d) {
			const { direction } = d

			// Remove previous hover line.
			vis.lineGroup.clearLayers();

			if (direction !== "none"){
				const travelers = d.travelers[direction]  // { station_id: 5, station_id: 2 }

				vis.debug && console.log("travelers: ", travelers)

				Object.entries(travelers).forEach(([station_id, amount]) => {
					vis.lineGroup.addLayer(line(d.station_id, station_id, amount, direction))
				})
			}
		}

		function line(idA, idB, amount, direction) {
			const from = vis.stationInfo[idA].loc
			const to = vis.stationInfo[idB].loc
			const lineWeight = vis.l(amount)
			const dot = vis.l(2)
			const gap = vis.l(8)
			const color = "black"

			vis.debug && console.log("lineweight: ", lineWeight)

			return L.polyline([from, to], {
				color: color,
				dashArray: [dot, gap],
				weight: lineWeight
			})
		}


	}
}

