class Scroller {
    constructor(initClass) {
        this.initClass = initClass;
        this.stepEnterCallbacks = [];
        this.stepProgressCallbacks = [];
        this.initVis();
    }

    // generic window resize listener event
    handleResize() {
        let vis = this;
        // 1. update height of step elements
        let stepH = Math.floor(window.innerHeight * 1.6);
        d3.select("article").selectAll(".step")
            .style("height", stepH + "px");

        let figureHeight = window.innerHeight * 0.85;
        let figureMarginTop = (window.innerHeight - figureHeight) / 2;

        d3.select("#scrolly").select("figure")
            .style("height", figureHeight + "px")
            .style("top", figureMarginTop + "px");

        // 3. tell scrollama to update new element dimensions
        // scroller.scroller.resize();
    }

    // scrollama event handlers
    handleStepEnter(response) {
        let vis = this;
        // response = { element, direction, index }

        // add color to current step only
        d3.select("article").selectAll(".step")
            .classed("is-active", function(d, i) {
                return i === response.index;
            });
        // Hide all of the visualization figures
        d3.select("figure").selectAll(".visualization")
            .transition()
            .duration(500)
            .style("visibility", "hidden")
            .style("opacity", 0)
            .style("display", "none");

        // update graphic based on step
        let vizes = [
            "summary", "summary",
            "aggregate",
            "tripCountTrends", "tripCountTrends", "tripCountTrends", "tripCountTrends",
            "tripDurationTrends", "tripDurationTrends",
            "wind",
            "forceNetwork",
            "line",
            "radial",
            "conclusion",
            "aboutus",
            "appendix"];

        d3.select("figure").select("#" + vizes[response.index])
            .transition()
            .duration(500)
            .style("visibility", "visible")
            .style("opacity", 1)
            .style("display", "block");
        
        vis.stepEnterCallbacks.forEach(f => f(response));
    }

    setupStickyfill() {
        d3.selectAll(".sticky").each(function() {
            Stickyfill.add(this);
        });
    }


    initVis() {
        let vis = this;

        // instantiate the scrollama
        vis.scroller = scrollama();

        vis.setupStickyfill();
        vis.handleResize();

        window.addEventListener("resize", vis.handleResize);

        // setup the instance, pass callback functions
        vis.scroller
            .setup({
                step: "." + vis.initClass,
                debug: false,
                offset: 0.3,
                progress: true
            })
            .onStepProgress(res =>  vis.handleStepEnter(res, vis.stepProgressCallbacks))
            .onStepEnter(res => vis.handleStepEnter(res, vis.stepEnterCallbacks))

    }

    registerStepEnterCallback(stepCallback) {
        let vis = this;
        vis.stepEnterCallbacks.push(stepCallback);
    }

    registerStepProgressCallback(stepCallback) {
        let vis = this;
        vis.stepEnterCallbacks.push(stepCallback);
    }

}