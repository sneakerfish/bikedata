class Scroller {
    constructor(initClass) {
        this.initClass = initClass;

        this.initVis();
    }

    initVis() {
        let vis = this;

        // instantiate the scrollama
        vis.scroller = scrollama();

        // setup the instance, pass callback functions
        vis.scroller
            .setup({
                step: "." + vis.initClass,
                debug: true,
                offset: 0.7
            })
            .onStepEnter((response) => {
                console.log("Enter Step", response);
                // { element, index, direction }
                response.element.classList.add("is-active");
            })
            .onStepExit((response) => {
                console.log("Exit Step");
                // { element, index, direction }
                response.element.classList.remove("is-active");
            });
    }

}