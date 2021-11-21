class Scroller {
    constructor(initClass) {
        this.initClass = initClass;

        this.initVis();
    }

    // generic window resize listener event
    handleResize() {
        let vis = this;
        // 1. update height of step elements
        let stepH = Math.floor(window.innerHeight * 0.95);
        d3.select("article").selectAll(".step")
            .style("height", stepH + "px");

        let figureHeight = window.innerHeight * 0.75;
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
        let vizes = ["summary", "aggregate", "trends", "sf", "boston", "nyc", "wind", "radial"];
        d3.select("figure").select("#" + vizes[response.index])
            .transition()
            .duration(500)
            .style("visibility", "visible")
            .style("opacity", 1)
            .style("display", "block");
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
                debug: true,
                offset: 0.3
            })
            .onStepEnter(vis.handleStepEnter);
    }

}