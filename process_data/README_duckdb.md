# DuckDB Processing Pipeline

This folder contains updated scripts for processing bike share data using **DuckDB** instead of Spark. DuckDB is a modern analytical database that can efficiently process millions of rows directly from CSV files without needing cluster setup.

## Quick Start

### 1. Install Dependencies

```bash
pip install duckdb requests
```

### 2. Download Recent Data

```bash
# Download all cities, 2022-2025
python download_recent_data.py

# Or customize the date range/cities
python download_recent_data.py --start-year 2024 --end-year 2025 --city nyc
python download_recent_data.py --start-year 2022 --end-year 2025 --city boston
```

This creates the folder structure:
```
rawdata/
├── boston/
│   ├── 202201-bluebikes-tripdata.csv
│   └── ...
├── nyc/
│   ├── 202201-citibike-tripdata.csv
│   └── ...
└── sf/
    ├── 202201-baywheels-tripdata.csv
    └── ...
```

### 3. Process the Data

```bash
# Generate summary CSVs for visualization
python process_with_duckdb.py

# Or specify custom directories
python process_with_duckdb.py --input-dir rawdata --output-dir ../web/data
```

## Output Files

The processing script generates these files (compatible with the existing D3 visualizations):

| File | Description |
|------|-------------|
| `summary_by_city_by_month.csv` | Trip counts, station counts, avg duration by city/month |
| `round_trips_by_month.csv` | Round trip statistics by city/month |
| `all_trips_by_date.csv` | Daily trip counts by city |
| `2017_present_trip_data.csv` | Monthly summary with cumulative totals |
| `minute_summary.csv` | Per-minute ridership for the radial day view |

## Data Sources

| City | System | Data URL |
|------|--------|----------|
| NYC | CitiBike | https://s3.amazonaws.com/tripdata/index.html |
| Boston | BlueBikes | https://s3.amazonaws.com/hubway-data/index.html |
| SF | Bay Wheels | https://s3.amazonaws.com/baywheels-data/index.html |

## Schema Changes

Since your original project (ended Sept 2021), the data format has changed:

**Old format (pre-2021):**
- `tripduration`, `starttime`, `stoptime`, `start station id`, etc.

**New format (2021 onwards):**
- `ride_id`, `rideable_type`, `started_at`, `ended_at`, `start_station_id`, etc.
- Includes `rideable_type` (classic_bike, electric_bike, docked_bike)
- Includes `member_casual` instead of detailed user demographics

The processing script automatically detects and handles both formats.

## Extending the Analysis

To add new summary queries, edit `process_with_duckdb.py`. DuckDB uses standard SQL syntax. Example:

```python
# Add a new analysis
con.execute("""
COPY (
    SELECT city, rideable_type, COUNT(*) as count
    FROM all_trips
    GROUP BY city, rideable_type
) TO 'bike_type_counts.csv' (HEADER)
""")
```

## Combining with Original Data

To create a complete dataset from 2017-2025:

1. Keep your original `web/data/*.csv` files as backup
2. Download data from Oct 2021 onwards
3. Run the processing script
4. The new files will contain only the recent data

To merge with original data, you can either:
- Process everything from scratch (download 2017-2025)
- Concatenate the CSV files (they have the same columns)
