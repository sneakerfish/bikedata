


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
			netzero: "#b3995d",     // net zero activity.
			in: "green",            // more people coming in.
			out: "#FB4D42",         // more people going out.
			retour: "#041E42",
			legend: "rgba(168,168,168,0.47)",
			legendfont: "rgba(24,24,24,0.47)",
			selected: "#FF007F"
		}

		this.circleStyle = {
			fillOpacity: 0.5,
			strokeOpacity: 1,
			strokeWidth: 3,
		}

		this.legendTitles = {
			inactive: "Inactive station",
			netzero: "same amount come and go",
			in: "more people are incoming",
			out: "more people are departing",
			retour: "round trips at this station",

		}

		// this.tooltipTitles = {



		this.legendStyle = {
			fontSize: 11,
			show: true
		}

		this.tooltipStyles = {
			fontSize: 11,
			fontColor: "rgba(24,24,24,0.47)",
			background: "#f3f2f2",
			show: false,
		}

		this.circleRange = [50, 300]
		this.lineRange = [25, 200]

		// Get default city.
		this.city = document.querySelector(`input[name=${windIds.city}]:checked`).value

		this.initVis();
	}

	initVis () {
		let vis = this;

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

		vis.legend = L.control({position: 'bottomleft'});
		vis.tooltip = L.control({position: 'topleft'});

		// wrangleData will be called from updateVisualisation.
	}

	wrangleData (data, city) {
		let vis = this;

		vis.stationData = data
		vis.city = city

		// latitude of the center of the city.
		vis.latitude = vis.centers[vis.city][0]

		vis.debug && console.log("stationData", vis.stationData)

		// NYC and SF use short_name as station_id in their trip-data.
		vis.get_station_id = function(d) {
			return vis.city === 'boston' ? d.station_id : d.short_name
		}

		// Center the map.
		vis.mapCenter = vis.centers[vis.city]
		vis.debug && console.log("singleCity:",vis.city)
		vis.map.setView(vis.mapCenter, 12)

		// Array to reference trip-data to.
		vis.stationIds = vis.stationData.map((d) => {
			return vis.get_station_id(d)
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

		// StationInfo has relevant trip-data for this time.
		vis.stationInfo = {}
		vis.stationData.forEach((d) => {
			const station_id = vis.get_station_id(d)

			vis.stationInfo[station_id] = {
				station_id: station_id,
				name: d.name,
				loc: [d.lat, d.lon],
				links: {
					in: [],                   // All incoming people [ station_id, station_id ]
					out: [],                  // all outgoing people [ station_id, station_id ]
					retour: [],               // array of same station_id's.
					netzero: [],              // all incoming + outgoing traffic if equal amount.
					inactive: [],             // always empty
				},
				status: "inactive",           // "in", "out", "retour", "netzero"
				color: vis.colors.inactive,
				newcolor: false,              // Used for temporary color changes.
				radius: 0,
				travellers: {
					in: {},                   // in: { station_id: 5 }
					out: {},
					min: 0,                   // number of people on least connected route.
					max: 0,                   // number of people on most connected route.
					total: 0,                 // total of people connected.
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
					vis.stationInfo[d.start_station_id].links.retour.push(d.start_station_id)

					vis.stationInfo[d.start_station_id].travellers.total++

					vis.debug && console.log("Round trip happened at station: ", d.start_station_id)
				} else {
					vis.stationInfo[d.start_station_id].links.out.push(d.end_station_id)
					vis.stationInfo[d.end_station_id].links.in.push(d.start_station_id)

					const addTraveler = function(status, station_idA, station_idB) {
						if (!vis.stationInfo[station_idA].travellers[status][station_idB]) {
							vis.stationInfo[station_idA].travellers[status][station_idB] = 1
						} else {
							vis.stationInfo[station_idA].travellers[status][station_idB]++
						}
					}

					addTraveler("out", d.start_station_id, d.end_station_id)
					addTraveler("in", d.end_station_id, d.start_station_id)

					vis.stationInfo[d.start_station_id].travellers.total++
					vis.stationInfo[d.end_station_id].travellers.total++
				}

				vis.currentTrips.push(d)
			}
		})

		vis.debug && console.log("stationInfo: ", vis.stationInfo)
		vis.debug && console.log("currentTrips: ", vis.currentTrips)

		// Keep track of what station-status has been set.
		vis.statusInfo = {
			in: false,
			out: false,
			retour: false,
			netzero: false
		}

		vis.displayData = []
		Object.values(vis.stationInfo).forEach((d) => {
			const inAmount = d.links.in.length
			const outAmount = d.links.out.length
			const retourAmount = d.links.retour.length

			// Netzero is same amount of people coming as going.
			const inactive = inAmount + outAmount + retourAmount === 0
			const netzero = inAmount === outAmount && !inactive
			const incoming = inAmount > outAmount
			const outgoing = outAmount > inAmount
			const retour = inAmount === 0 && outAmount === 0 && retourAmount > 0

			if (netzero) {
				d.status = "netzero"
				d.color = vis.colors.netzero
				d.links.netzero = [...d.links.in, ...d.links.out]
				vis.statusInfo.netzero = true
			} else if (incoming) {
				d.status = "in"
				d.color = vis.colors.in
				vis.statusInfo.in = true
			} else if (outgoing) {
				d.status = "out"
				d.color = vis.colors.out
				vis.statusInfo.out = true
			} else if (retour) {
				d.status = "retour"
				d.color = vis.colors.retour
				vis.statusInfo.retour = true
			}

			// Set min/max amount of people on route to/from this station.
			if (incoming || outgoing){
				const peoplePerStation = Object.values(d.travellers[d.status])

				d.travellers.min = d3.min(peoplePerStation)
				d.travellers.max = d3.max(peoplePerStation)
			}

			vis.displayData.push(d)
		})

		// Least and most people at a station.
		vis.rMin = d3.min(vis.displayData, d => d.links[d.status].length)
		vis.rMax = d3.max(vis.displayData, d => d.links[d.status].length)

		// Set scale for radius, representing amount of people. Only for circle area's.
		vis.r = d3.scaleSqrt()
			.domain([vis.rMin, vis.rMax])
			.range(vis.circleRange)

		vis.debug && console.log("rScale: ", vis.rMin, vis.rMax)

		// Set radius for every station.
		vis.displayData.forEach((d) => {
			d.radius = vis.r(d.links[d.status].length)
		})

		// Render inactive stations first so that they are on the background.
		const sortOrder = ["inactive", "netzero", "retour", "out", "in"]
		const sortMethod = function(a, b) {
			return sortOrder.indexOf(a.status) - sortOrder.indexOf(b.status)
		}

		vis.displayData = vis.displayData.sort((a,b) => sortMethod(a,b))

		vis.debug && console.log("displayData: ", vis.displayData)

		vis.selectedStations = []

		// statusExists = [ "in", "out", "inactive", "retour", "netzero" ]
		const statusExists = Object.keys(vis.statusInfo).filter((key) => vis.statusInfo[key])
		vis.debug && console.log("statusExists: ", statusExists)

		// legendData = [ [{status: "in", color: "green", radius:4}, {..}], [ status: "out" ] ]
		vis.legendData = []
		statusExists.forEach((status) => {

			const filtered_array = vis.displayData.filter(d => d.status === status)

			const min = d3.min(filtered_array, (d) => d.links[status].length)
			const max = d3.max(filtered_array, (d) => d.links[status].length)

			// calculate middle point.
			const scaleCircle = d3.scaleLinear()
				.domain([0,1])
				.rangeRound([min, max])

			const mid = scaleCircle(0.5)

			// only create unique circles.
			const range = [...new Set([min, mid, max])] // [ 2, 3, 3 ] => [ 2, 3 ]
			// vis.debug && console.log("range: ", range)


			// Create one circle for the legend.
			const circle = function(amount) {
				return {
					status: status,
					color: vis.colors[status],
					radius: vis.r(amount),
					amount: amount
				}
			}

			const circleList = []
			for (let i = 0; i < range.length; i++){
				circleList.push(
					circle(range[i])
				)
			}
			// vis.debug && console.log("CircleList", circleList)

			vis.legendData.push(circleList)
		})

		vis.legendData = vis.legendData.sort((a,b) => a.length - b.length)

		vis.debug && console.log("legendData: ", vis.legendData)

		vis.updateVis();
	}

	updateVis() {
		let vis = this;

		// Set HTML elements to current date/time.
		document.getElementById(vis.ids.setDay).innerText = vis.time.toDateString()
		document.getElementById(vis.ids.setTime).innerText = vis.formatTime(vis.time)

		// Clear previous visualization.
		vis.stationGroup.clearLayers();
		vis.lineGroup.clearLayers();

		// Add each station.
		vis.displayData.forEach((d) => {
			vis.stationGroup.addLayer(circle(d))
		})

		// Refresh legend when zooming.
		vis.map.on("zoomend", addLegend)
		addLegend()


		// vis.map.on("click", clickHandler)

		vis.tooltip.onAdd = setTooltip
		vis.tooltip.addTo(vis.map)


		function circle (d) {
			const color = d.newcolor ? d.newcolor : d.color // color changes take priority.

			return L.circle(d.loc, d.radius, {
				color: color,
				fillOpacity: vis.circleStyle.fillOpacity,
				opacity: vis.circleStyle.strokeOpacity,
				weight: vis.circleStyle.strokeWidth,
				station_id: d.station_id, // add id & status for click event.
				status: d.status,
				className: "circle"
				}
			).on("mouseover", () => addLines(d))
				.on("click", toggleSelected)
		}

		function addLines(d) {
			const { status, color, station_id } = d

			// Remove previous hover line.
			vis.lineGroup.clearLayers();

			// Only add lines if station has net direction.
			const hasLines = (status === "in" || status === "out")

			if (hasLines){
				Object.entries(d.travellers[status]).forEach(([link_station, link_amount]) => {
					vis.lineGroup.addLayer(
						line(station_id, link_station, link_amount, color)
					)
				})
			}
		}

		function line(idA, idB, amount, color) {
			const from = vis.stationInfo[idA].loc
			const to = vis.stationInfo[idB].loc
			const lineCap = "butt"

			// Setup domain for line-weights.
			const lMin = d3.min(vis.displayData, d => d.travellers.min)
			const lMax = d3.max(vis.displayData, d=> d.travellers.max)

			const l = d3.scaleLinear()
				.domain([lMin, lMax])
				.range(vis.lineRange)

			const dot = pixelValue(vis.latitude, l(3), vis.zoom)
			const gap = pixelValue(vis.latitude, l(1), vis.zoom)

			const oldColor = d3.color(color)

			return L.polyline([from, to], {
				color: oldColor.darker(),
				dashArray: [dot, gap],
				weight: pixelValue(vis.latitude, l(amount), vis.zoom),
				lineCap: lineCap,
				interactive: false // else it blocks mouseclicks.
			})
		}

		function rebuildDisplayData() {
			vis.displayData = vis.displayData.map((d) =>{
				if (vis.selectedStations.includes(d.station_id)){
					d.newcolor = vis.colors.selected
				} else {
					d.newcolor = false
				}
				return d
			})
		}

		function toggleSelected(e) {
			vis.debug && console.log("clickhandler", e)
			if (e.target.options.hasOwnProperty("station_id")) {
				const station_id = e.target.options.station_id

				// Select station.
				if(!vis.selectedStations.includes(station_id)){
					vis.selectedStations.push(station_id)

					rebuildDisplayData()
					toggleTooltip(true)
					vis.updateVis()
				} else {
					// Deselect station.
					console.log(vis.selectedStations)
					vis.selectedStations = vis.selectedStations.filter((s) => s !== station_id)

					rebuildDisplayData()
					vis.updateVis()

					// If no stations left, turn off.
					vis.selectedStations.length === 0 && toggleTooltip(false)
				}
				vis.debug && console.log(vis.selectedStations)
			}
		}

		function clearSelected() {
			vis.selectedStations = []

			rebuildDisplayData()
			toggleTooltip(false)
			vis.updateVis()
		}

		function addLegend() {
			vis.zoom = vis.map.getZoom()

			// Toggle legend on/off else it becomes too big.
			vis.zoom > 13 && toggleLegend(false)
			vis.zoom < 14 && toggleLegend(true)

			vis.legend.onAdd = setLegend
			vis.legend.addTo(vis.map)
		}

		function setLegend() {

			const fontsize = vis.legendStyle.fontSize
			const fontcolor = vis.colors.legendfont

			const minMeters = vis.r(vis.rMin)
			const maxMeters = vis.r(vis.rMax)

			const minPixels = pixelValue(vis.latitude, minMeters, vis.zoom)
			const maxPixels = pixelValue(vis.latitude, maxMeters, vis.zoom)

			vis.pixelScale = d3.scaleLinear()
				.domain([minMeters, maxMeters])
				.range([minPixels, maxPixels])

			// Space a circle takes.
			const cHeight = maxPixels * 2 + 5
			const cWidth = maxPixels * 2 + 5
			const rowHeight = cHeight + fontsize + 5

			// Most circles in a row.
			const maxLegend = d3.max(vis.legendData, d => d.length)

			// Setup legend size.
			const width = cWidth * maxLegend + 135;
			const height = rowHeight * vis.legendData.length + 20;
			const margin = { left: 15, right: 20, top: 20, bottom: 20 }

			// Setup drawing area.
			const div = d3.create("div")
			const svg = div.append("svg")
				.attr("class", "legend")
				.attr("display", vis.legendStyle.show ? "block" : "none")
				.attr("width", width+margin.left+margin.right)
				.attr("height", height+margin.top+margin.bottom)
				.append("g")
				.attr("transform","translate("+[margin.left,margin.top]+")");

			const quad = svg.selectAll("g.rect.legend")
				.data([0])
				.enter()
				.append("rect")
				.attr("class", "legend")
				.attr("x", 0)
				.attr("y", 0)
				.attr("width", width)
				.attr("height", height)
				.attr("fill", vis.colors.legend)
				.on("click", toggleLegend)

			// Add row for the circles.
			const rows = svg.selectAll("g.circle-row")
				.data(vis.legendData, (d) => d.status)

			rows.enter()
				.append("g")
				.attr("class", "circle-row")
				.attr("transform", (d, i) => `translate(5,${i * rowHeight + 10})`)

			rows.enter()
				.append("text")
				.attr("class", "legend-title")
				.attr("x", (d, i) => vis.legendData[i].length * cWidth)
				.attr("y", (d, i) => i * rowHeight + (rowHeight - cHeight) * 0.75 + cHeight +10)
				.attr("font-size", fontsize)
				.style("fill", fontcolor)
				.text((d) => vis.legendTitles[d[0].status])
				.on("click", toggleLegend)

			// Add the circle.
			const circles = svg.selectAll("g.circle-row").selectAll("circle.legend-item")
				.data(d => d)

			circles.enter()
				.append("circle")
				.attr("class", "legend-item")
				.attr("cx", (d, i) => i * cWidth + cWidth / 2)
				.attr("cy", cHeight / 2)
				.attr("r", d => vis.pixelScale(d.radius))
				.attr("fill", d => d.color)
				.style("fill-opacity", vis.circleStyle.fillOpacity)
				.style("stroke-opacity", vis.circleStyle.strokeOpacity)
				.style("stroke-width", vis.circleStyle.strokeWidth)
				.style("stroke", d => d.color)
				.on("click", toggleLegend)

			circles.enter()
				.append("text")
				.attr("class", "legend-label")
				.attr("x", (d, i) => i * cWidth + cWidth / 2)
				.attr("y", (rowHeight - cHeight) * 0.75 + cHeight)
				.attr("font-size", fontsize)
				.attr("fill", fontcolor)
				.attr("text-anchor", "middle")
				.text(d => d.amount)
				.on("click", toggleLegend)

			// Setup button to hide the legend.
			const buttonWidth = 80;
			const buttonHeight = 30;

			const svgButton = div.append("svg")
				.attr("class", "button")
				.attr("display", vis.legendStyle.show ? "none" : "block")
				.attr("width", buttonWidth+margin.left+margin.right)
				.attr("height", buttonHeight+margin.top+margin.bottom)
				.append("g")
				.attr("transform","translate("+[margin.left,margin.top]+")");

			const button = svgButton.selectAll("g.rect.button")
				.data([0])
				.enter()
				.append("rect")
				.attr("class", "button")
				.attr("x", 0)
				.attr("y", 0)
				.attr("width", buttonWidth)
				.attr("height", buttonHeight)
				.attr("fill", vis.colors.legend)
				.on("click", toggleLegend)

			svgButton.selectAll("g.text.button-title")
				.data(["Show"])
				.enter()
				.append("text")
				.attr("class", "button-title")
				.attr("x", buttonWidth / 2)
				.attr("y", buttonHeight / 2 + fontsize / 2)
				.attr("text-anchor", "middle")
				.attr("fill", fontcolor)
				.attr("font-size", fontsize)
				.text(d => d)
				.on("click", toggleLegend)

			return div.node()
		}

		function setTooltip() {

			const fontsize = vis.tooltipStyles.fontSize
			const fontcolor = vis.tooltipStyles.fontColor

			// Setup tooltip size.
			const width = 200;
			const height = 50;
			const margin = { left: 0, right: 0, top: 0, bottom: 0 };

			// Setup drawing area.
			const div = d3.create("div");
			const svg = div.append("svg")
				.attr("class", "toolTip")
				.attr("display", vis.tooltipStyles.show ? "block" : "none")
				.attr("width", width+margin.left+margin.right)
				.attr("height", height+margin.top+margin.bottom)
				.append("g")
				.attr("transform","translate("+[margin.left,margin.top]+")");

			const quad = svg.selectAll("g.rect.toolTip")
				.data([0])
				.enter()
				.append("rect")
				.attr("class", "toolTip")
				.attr("x", 0)
				.attr("y", 0)
				.attr("width", width)
				.attr("height", height)
				.attr("fill", vis.tooltipStyles.background)
				.on("click", clearSelected)


			const get_html = function() {
				const amount = vis.selectedStations.length
				if (amount > 0){
					const single_selection = vis.stationInfo[vis.selectedStations[0]].name
					const many_selection = `You selected ${amount} stations.`

					return amount === 1 ? single_selection : many_selection
				}
			}

			const title = svg.selectAll("g.text.tooltip-title")
				.data([0])
				.enter()
				.append("text")
				.attr("class", "tooltip-title")
				.attr("x", fontsize / 2)
				.attr("y", fontsize + fontsize / 2)
				.attr("font-size", fontsize)
				.style("fill", fontcolor)
				.html(d => get_html())
				.on("click", clearSelected)

			return div.node()
		}

		function toggleTooltip(value) {
			const isUndefined = typeof value !== 'boolean'

			vis.tooltipStyles.show = isUndefined ? !vis.tooltipStyles.show : value
			const show = vis.tooltipStyles.show
			d3.select('svg.toolTip').attr("display", show ? "block" : "none")
		}

		// Value is optional, can be true or false
		function toggleLegend(value) {
			const isUndefined = typeof value !== 'boolean'

			vis.legendStyle.show = isUndefined ? !vis.legendStyle.show : value
			const show = vis.legendStyle.show
			d3.select('svg.legend').attr("display", show ? "block" : "none")
			d3.select('svg.button').attr("display", show ? "none" : "block")
		}

		// https://stackoverflow.com/questions/30703212/how-to-convert-radius-in-metres-to-pixels-in-mapbox-leaflet?rq=1
		function metersPerPixel (latitude, zoomLevel) {
			const earthCircumference = 40075017;
			const latitudeRadians = latitude * (Math.PI/180);
			return earthCircumference * Math.cos(latitudeRadians) / Math.pow(2, zoomLevel + 8);
		};

		function pixelValue (latitude, meters, zoomLevel) {
			return meters / metersPerPixel(latitude, zoomLevel);
		};

	}
}

