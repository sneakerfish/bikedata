#!/usr/bin/env python3
"""
Process bike share data using DuckDB.
This is a modern replacement for the original PySpark processing pipeline.

DuckDB can efficiently process millions of rows directly from CSV files
without needing to set up a Spark cluster.

Usage:
    python process_with_duckdb.py [--output-dir DIR]
"""

import duckdb
import os
import argparse
from pathlib import Path

def get_csv_files(base_dir, city):
    """Get all CSV files for a city."""
    city_dir = Path(base_dir) / city
    if not city_dir.exists():
        return []
    return list(city_dir.glob('*.csv'))

def detect_schema(csv_file):
    """Detect whether a CSV uses the old or new schema format."""
    with open(csv_file, 'r') as f:
        header = f.readline().strip().lower()
        if 'ride_id' in header:
            return 'new'
        elif 'tripduration' in header or 'start station id' in header:
            return 'old'
        else:
            return 'unknown'

def create_unified_view(con, base_dir):
    """
    Create a unified view of all bike data from all cities.
    Handles both old and new schema formats.
    """

    # SQL to normalize old schema (pre-2021)
    old_schema_sql = """
    SELECT
        bikeid,
        starttime,
        stoptime,
        "start station id" as start_station_id,
        "start station name" as start_station_name,
        "start station latitude" as start_lat,
        "start station longitude" as start_lng,
        "end station id" as end_station_id,
        "end station name" as end_station_name,
        "end station latitude" as end_lat,
        "end station longitude" as end_lng,
        '{city}' as city
    FROM read_csv('{pattern}',
         header=true,
         ignore_errors=true,
         columns={{
            'tripduration': 'VARCHAR',
            'starttime': 'VARCHAR',
            'stoptime': 'VARCHAR',
            'start station id': 'VARCHAR',
            'start station name': 'VARCHAR',
            'start station latitude': 'VARCHAR',
            'start station longitude': 'VARCHAR',
            'end station id': 'VARCHAR',
            'end station name': 'VARCHAR',
            'end station latitude': 'VARCHAR',
            'end station longitude': 'VARCHAR',
            'bikeid': 'VARCHAR',
            'usertype': 'VARCHAR',
            'birth year': 'VARCHAR',
            'gender': 'VARCHAR'
         }})
    WHERE starttime IS NOT NULL
    """

    # SQL to normalize new schema (2021 onwards)
    new_schema_sql = """
    SELECT
        ride_id as bikeid,
        started_at as starttime,
        ended_at as stoptime,
        start_station_id,
        start_station_name,
        start_lat,
        start_lng,
        end_station_id,
        end_station_name,
        end_lat,
        end_lng,
        '{city}' as city
    FROM read_csv('{pattern}',
         header=true,
         ignore_errors=true,
         columns={{
            'ride_id': 'VARCHAR',
            'rideable_type': 'VARCHAR',
            'started_at': 'VARCHAR',
            'ended_at': 'VARCHAR',
            'start_station_name': 'VARCHAR',
            'start_station_id': 'VARCHAR',
            'end_station_name': 'VARCHAR',
            'end_station_id': 'VARCHAR',
            'start_lat': 'VARCHAR',
            'start_lng': 'VARCHAR',
            'end_lat': 'VARCHAR',
            'end_lng': 'VARCHAR',
            'member_casual': 'VARCHAR'
         }})
    WHERE started_at IS NOT NULL
    """

    union_parts = []

    for city in ['nyc', 'boston', 'sf']:
        city_dir = Path(base_dir) / city
        if not city_dir.exists():
            print(f"  Warning: No data directory for {city}")
            continue

        csv_files = list(city_dir.glob('*.csv'))
        if not csv_files:
            print(f"  Warning: No CSV files for {city}")
            continue

        # Check first file to determine schema
        schema_type = detect_schema(csv_files[0])
        pattern = str(city_dir / '*.csv')

        print(f"  {city}: {len(csv_files)} files, {schema_type} schema")

        if schema_type == 'new':
            union_parts.append(new_schema_sql.format(city=city, pattern=pattern))
        elif schema_type == 'old':
            union_parts.append(old_schema_sql.format(city=city, pattern=pattern))
        else:
            print(f"  Warning: Unknown schema for {city}, skipping")

    if not union_parts:
        raise ValueError("No data found to process")

    # Create unified view
    union_sql = " UNION ALL ".join(union_parts)
    con.execute(f"""
    CREATE OR REPLACE VIEW all_trips AS
    SELECT
        bikeid,
        -- Parse various timestamp formats
        COALESCE(
            TRY_CAST(starttime AS TIMESTAMP),
            TRY_STRPTIME(starttime, '%m/%d/%Y %H:%M:%S'),
            TRY_STRPTIME(starttime, '%Y-%m-%d %H:%M:%S')
        ) as trip_start,
        COALESCE(
            TRY_CAST(stoptime AS TIMESTAMP),
            TRY_STRPTIME(stoptime, '%m/%d/%Y %H:%M:%S'),
            TRY_STRPTIME(stoptime, '%Y-%m-%d %H:%M:%S')
        ) as trip_end,
        start_station_id,
        start_station_name,
        TRY_CAST(start_lat AS DOUBLE) as start_lat,
        TRY_CAST(start_lng AS DOUBLE) as start_lng,
        end_station_id,
        end_station_name,
        TRY_CAST(end_lat AS DOUBLE) as end_lat,
        TRY_CAST(end_lng AS DOUBLE) as end_lng,
        city
    FROM ({union_sql})
    WHERE starttime IS NOT NULL
    """)

def generate_summary_by_city_month(con, output_dir):
    """Generate trip counts, station counts, and avg duration by city/month."""
    print("\nGenerating summary_by_city_by_month.csv...")

    con.execute(f"""
    COPY (
        SELECT
            city,
            YEAR(trip_start) as year,
            MONTH(trip_start) as month,
            COUNT(*) as trip_count,
            COUNT(DISTINCT start_station_id) as station_count,
            AVG(EPOCH(trip_end - trip_start) / 60.0) as average_duration
        FROM all_trips
        WHERE trip_start IS NOT NULL
          AND trip_end IS NOT NULL
          AND trip_end > trip_start
          AND EPOCH(trip_end - trip_start) < 86400  -- less than 24 hours
        GROUP BY city, YEAR(trip_start), MONTH(trip_start)
        ORDER BY city, year, month
    ) TO '{output_dir}/summary_by_city_by_month.csv' (HEADER, DELIMITER ',')
    """)

def generate_round_trips_by_month(con, output_dir):
    """Generate round trip counts by city/month."""
    print("Generating round_trips_by_month.csv...")

    con.execute(f"""
    COPY (
        SELECT
            city,
            YEAR(trip_start) as year,
            MONTH(trip_start) as month,
            SUM(CASE WHEN start_station_id = end_station_id THEN 1 ELSE 0 END) as round_trips,
            COUNT(*) as total_trips,
            ROUND(100.0 * SUM(CASE WHEN start_station_id = end_station_id THEN 1 ELSE 0 END) / COUNT(*), 2) as round_trip_pct
        FROM all_trips
        WHERE trip_start IS NOT NULL
          AND start_station_id IS NOT NULL
          AND end_station_id IS NOT NULL
        GROUP BY city, YEAR(trip_start), MONTH(trip_start)
        ORDER BY city, year, month
    ) TO '{output_dir}/round_trips_by_month.csv' (HEADER, DELIMITER ',')
    """)

def generate_trips_by_date(con, output_dir):
    """Generate daily trip counts by city."""
    print("Generating all_trips_by_date.csv...")

    con.execute(f"""
    COPY (
        SELECT
            city,
            CAST(trip_start AS DATE) as trip_date,
            COUNT(*) as trip_count
        FROM all_trips
        WHERE trip_start IS NOT NULL
        GROUP BY city, CAST(trip_start AS DATE)
        ORDER BY city, trip_date
    ) TO '{output_dir}/all_trips_by_date.csv' (HEADER, DELIMITER ',')
    """)

def generate_trip_data_summary(con, output_dir):
    """Generate monthly summary with cumulative totals."""
    print("Generating 2017_present_trip_data.csv...")

    con.execute(f"""
    COPY (
        WITH monthly AS (
            SELECT
                city,
                DATE_TRUNC('month', trip_start) as month,
                COUNT(*) as trip_count,
                COUNT(DISTINCT start_station_id) as active_stations
            FROM all_trips
            WHERE trip_start IS NOT NULL
            GROUP BY city, DATE_TRUNC('month', trip_start)
        )
        SELECT
            city,
            month,
            trip_count,
            active_stations,
            SUM(trip_count) OVER (PARTITION BY city ORDER BY month) as cumulative_trips
        FROM monthly
        ORDER BY city, month
    ) TO '{output_dir}/2017_present_trip_data.csv' (HEADER, DELIMITER ',')
    """)

def generate_minute_summary(con, output_dir, sample_dates=None):
    """
    Generate per-minute ridership data for specific dates.
    This is used for the radial day view visualization.
    """
    print("Generating minute_summary.csv...")

    # If no specific dates provided, use a sample of interesting dates
    if sample_dates is None:
        # Get some sample dates from the data
        result = con.execute("""
            SELECT DISTINCT CAST(trip_start AS DATE) as d
            FROM all_trips
            WHERE trip_start IS NOT NULL
            ORDER BY d DESC
            LIMIT 30
        """).fetchall()
        sample_dates = [str(r[0]) for r in result]

    if not sample_dates:
        print("  No dates available for minute summary")
        return

    date_filter = "'" + "','".join(sample_dates[:30]) + "'"

    con.execute(f"""
    COPY (
        SELECT
            city,
            CAST(trip_start AS DATE) as trip_date,
            EXTRACT(hour FROM trip_start) * 60 + EXTRACT(minute FROM trip_start) as minute_of_day,
            COUNT(*) as active_riders
        FROM all_trips
        WHERE trip_start IS NOT NULL
          AND CAST(trip_start AS DATE) IN ({date_filter})
        GROUP BY city, CAST(trip_start AS DATE),
                 EXTRACT(hour FROM trip_start) * 60 + EXTRACT(minute FROM trip_start)
        ORDER BY city, trip_date, minute_of_day
    ) TO '{output_dir}/minute_summary.csv' (HEADER, DELIMITER ',')
    """)

def print_data_summary(con):
    """Print a summary of the loaded data."""
    print("\n" + "="*60)
    print("DATA SUMMARY")
    print("="*60)

    result = con.execute("""
        SELECT
            city,
            MIN(trip_start) as earliest,
            MAX(trip_start) as latest,
            COUNT(*) as total_trips
        FROM all_trips
        WHERE trip_start IS NOT NULL
        GROUP BY city
        ORDER BY city
    """).fetchall()

    for city, earliest, latest, count in result:
        print(f"\n{city.upper()}:")
        print(f"  Date range: {earliest} to {latest}")
        print(f"  Total trips: {count:,}")

def main():
    parser = argparse.ArgumentParser(description='Process bike data with DuckDB')
    parser.add_argument('--input-dir', default='rawdata',
                        help='Directory containing city subdirectories with CSVs')
    parser.add_argument('--output-dir', default='../web/data',
                        help='Output directory for summary CSVs')
    args = parser.parse_args()

    # Change to script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    input_dir = args.input_dir
    output_dir = args.output_dir

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    print("="*60)
    print("Bike Share Data Processor (DuckDB)")
    print("="*60)
    print(f"Input: {input_dir}")
    print(f"Output: {output_dir}")

    # Create DuckDB connection (in-memory)
    con = duckdb.connect(':memory:')

    # Set up for better performance with large datasets
    con.execute("SET threads TO 4")
    con.execute("SET memory_limit = '2GB'")

    print("\nLoading data...")
    create_unified_view(con, input_dir)

    print_data_summary(con)

    print("\nGenerating summary files...")
    generate_summary_by_city_month(con, output_dir)
    generate_round_trips_by_month(con, output_dir)
    generate_trips_by_date(con, output_dir)
    generate_trip_data_summary(con, output_dir)
    generate_minute_summary(con, output_dir)

    print("\n" + "="*60)
    print("Processing complete!")
    print("="*60)

    # List generated files
    print("\nGenerated files:")
    for f in sorted(Path(output_dir).glob('*.csv')):
        size = f.stat().st_size
        print(f"  {f.name}: {size:,} bytes")

if __name__ == '__main__':
    main()
