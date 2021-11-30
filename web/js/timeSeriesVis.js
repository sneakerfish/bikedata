const CITIES = ['sf', 'boston', 'nyc'];

class TimeSeriesVis {

    constructor(plotParentElement, brushParentElement, data, eventData, idPrefix, defaultDataType) {
        this.plotParentElement = plotParentElement;
        this.brushParentElement = brushParentElement;
        this.data = data;
        this.eventData = eventData;
        this.idPrefix = idPrefix;
        this.defaultDataType = defaultDataType;
        this.initVis();
    }

    initVis() {
        let vis = this;

        CITIES.forEach(city => document.getElementById(vis.idPrefix + "-" + city + "CheckBox").checked = true)
        document.getElementById(vis.idPrefix + '-timeSeriesDataType').value = vis.defaultDataType;

        vis.timeSeriesPlot = new TimeSeriesPlotVis(vis.plotParentElement, vis.data, CITIES, vis.eventData, 380, vis.idPrefix);
        vis.timeline = new TimeSeriesTimeline(vis.brushParentElement, vis.data, CITIES, this, vis.idPrefix);
    }

    wrangleData() {
        let vis = this;
        let checkedCitiesSet = new Set();

        CITIES.forEach(city => {
            if (document.getElementById(vis.idPrefix + "-" + city + "CheckBox").checked) {
                checkedCitiesSet.add(city)
            }
        });

        vis.timeline.cities = checkedCitiesSet;
        vis.timeSeriesPlot.cities = checkedCitiesSet;

        vis.brushUpdate();

        vis.timeline.wrangleData(checkedCitiesSet);
    }

    brushUpdate() {
        let vis = this;

        let selectionRange = d3.brushSelection(d3.select("." + vis.idPrefix +"Brush").node());
        if (selectionRange != null) {
            let selectionDomain = selectionRange.map(vis.timeline.x.invert);
            vis.timeSeriesPlot.wrangleData(selectionDomain[0], selectionDomain[1]);
        } else {
            vis.timeSeriesPlot.wrangleData();
        }
    }

    updateVis() {
        let vis = this;

        vis.timeSeriesPlot.updateVis();
        vis.timeline.updateVis();
    }
}

