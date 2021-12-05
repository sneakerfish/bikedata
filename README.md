# bikedata

### CS171 Final Project
* No-No Groen
* Gordon Hew
* Richard Morello
* Patrick Watts

Bikedata is a tool for visualizing and comparing three public bike-share systems in the United States: 
BayWheels, covering San Francisco, BlueBikes, covering the Boston Metro area and CitiBike, covering the New 
York City metro area.   

The original publicly available data contains a row of text for every ride and the files are stored as CSV files 
with one file per month of data.  Our team focused on data from January 2017 through September 2021.  The data were 
downloaded and loaded in to a large Apache Parquet data source which can be queried using Spark. 

### Public Datasets
* San Francisco Bay Wheels System Data, https://www.lyft.com/bikes/bay-wheels/system-data
* Boston Blue Bikes System Data, https://www.bluebikes.com/system-data
* New York City bike share data, https://ride.citibikenyc.com/system-data

The data for the website contain extracts and summaries of the larger data source and are checked into this 
repository as CSV files.   

### Project layout

The project consists of the Spark data processing component which is in the `process_data` folder.

The web visualization component, including the summary data, is in the `web` folder.

### Technologies Used

* Apache Spark, https://spark.apache.org/
* Data Driven Documents (D3 version 7), https://d3js.org/
* Apache Parquet, https://parquet.apache.org/
* Leaflet JS, for the map, https://leafletjs.com/

