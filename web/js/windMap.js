


class WindMap {

	constructor(windIds, fromToData, date) {
		this.ids = windIds
		this.parentElement = windIds.chart;
		this.tripData = fromToData
		this.date = date
		this.debug = true
		this.displayData = []

		this.formatTime = d3.timeFormat("%I:%M %p") // 09:01 AM

		this.centers = {
			boston: [42.356070, -71.086808],
			nyc: [40.712776, -74.005974],
			sf: [37.774929, -122.419418]
		}

		this.colors = {
			inactive: "lightgrey",  // no activity.
			netzero: "#b3995d",    // net zero activity.
			in: "green",        // more people coming in.
			out: "#FB4D42",       // more people going out.
			retour: "#041E42"
		}

		// Get default city.
		this.city = document.querySelector(`input[name=${windIds.city}]:checked`).value

		this.initVis();
	}

	initVis () {
		let vis = this;

		// Set scale for radius, representing amount of people.
		vis.r = d3.scaleSqrt()
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
				direction: "none",
				travelers: {
					in: {},             // in: { station_id: 5 }
					out: {},
					length: 0,          // number of people either coming, going or both if netzero.
					min: 0,             // number of people on least connected route.
					max: 0              // number of people on most connected route.
				},
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

			// netzero is same amount of people coming as going.
			if (d.in.length + d.out.length !== 0 && d.change === 0) {
				d.status = "netzero"
				d.color = vis.colors.netzero
			} else if (d.change > 0) {
				d.direction = "in"
				d.color = vis.colors.in
			} else if (d.change < 0) {
				d.direction = "out"
				d.color = vis.colors.out
			} else if (d.change === 0 && d.retour > 0) {
				d.status = "retour"
				d.color = vis.colors.retour
			}

			const dir = d.direction

			// Set amount of travelers on route from or to this station.
			if (dir !== "none") {
				d[dir].forEach((link) => {
					if (!d.travelers[dir][link]){
						d.travelers[dir][link] = 1
					} else {
						d.travelers[dir][link]++
					}
				})

				// these links will be drawn by lines.
				d.travelers.links = []
				Object.entries(d.travelers[dir]).forEach(([key, value]) => {
					d.travelers.links.push({
						station_id: key,
						amount: value
						}
					)
				})

				// amount of people linked to this station.
				d.travelers.length = d[dir].length

				// set min / max for the line-weight.
				const people = Object.values(d.travelers[dir])
				d.travelers.min = d3.min(people)
				d.travelers.max = d3.max(people)

			} else {
				// if netzero take total amount.
				d.travelers.length = d.in.length + d.out.length
			}

			vis.displayData.push(d)
		})

		vis.debug && console.log("displayData: ", vis.displayData)

		vis.updateVis();
	}

	updateVis() {
		let vis = this;

		// Set HTML elements to current date/time.
		document.getElementById(vis.ids.setDay).innerText = vis.time.toDateString()
		document.getElementById(vis.ids.setTime).innerText = vis.formatTime(vis.time)

		// Setup radius domain.
		const rMin = d3.min(vis.displayData, d => d.travelers.length)
		const rMax = d3.max(vis.displayData, d => d.travelers.length)

		vis.r.domain([rMin, rMax])

		// Setup domain for line-weights.
		const lMin = d3.min(vis.displayData, d => d.travelers.min)
		const lMax = d3.max(vis.displayData, d=> d.travelers.max)

		vis.l.domain([lMin, lMax])

		// Clear previous visualization.
		vis.stationGroup.clearLayers();
		vis.lineGroup.clearLayers();

		// Add each station.
		vis.displayData.forEach((d) => {
			vis.stationGroup.addLayer(circle(d))
		})

		function circle (d) {
			const radius = vis.r(d.travelers.length)

			return L.circle(d.loc, radius, {
				color: d.color,
				fillColor: d.color,
				strokeWidth: "1px",
				}
			).on("mouseover", () => addLines(d))
		}

		function addLines(d) {
			const { direction, color } = d

			// Remove previous hover line.
			vis.lineGroup.clearLayers();

			// if this station has a direction,
			if (direction !== "none"){
				d.travelers.links.forEach((link) => {
					vis.lineGroup.addLayer(
						line(d.station_id, link.station_id, link.amount, color)
					)
				})
			}
		}

		function line(idA, idB, amount, color) {
			const from = vis.stationInfo[idA].loc
			const to = vis.stationInfo[idB].loc
			const lineWeight = vis.l(amount)
			const dot = 8
			const gap = 2
			const lineCap = "butt"

			return L.polyline([from, to], {
				color: color,
				dashArray: [dot, gap],
				weight: lineWeight,
				lineCap: lineCap
			})
		}


	}
}

