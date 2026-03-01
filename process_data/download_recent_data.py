#!/usr/bin/env python3
"""
Download recent bike share data from public S3 buckets.
Downloads data from Oct 2021 onwards (where the original project ended).

Usage:
    python download_recent_data.py [--start-year YYYY] [--end-year YYYY] [--city CITY]

Examples:
    python download_recent_data.py                    # Download all cities, 2022-2025
    python download_recent_data.py --city nyc         # Download just NYC
    python download_recent_data.py --start-year 2024  # Download 2024-2025 only
"""

import requests
import re
import os
import zipfile
import argparse
from datetime import datetime
from xml.etree import ElementTree

# S3 bucket configurations for each city
CITY_CONFIGS = {
    'nyc': {
        'name': 'CitiBike NYC',
        'bucket_url': 'https://s3.amazonaws.com/tripdata',
        'file_pattern': r'(\d{6})-citibike-tripdata.*\.zip',
    },
    'boston': {
        'name': 'BlueBikes Boston',
        'bucket_url': 'https://s3.amazonaws.com/hubway-data',
        'file_pattern': r'(\d{6})-bluebikes-tripdata\.zip',
    },
    'sf': {
        'name': 'Bay Wheels SF',
        'bucket_url': 'https://s3.amazonaws.com/baywheels-data',
        'file_pattern': r'(\d{6})-baywheels-tripdata\.csv\.zip',
    }
}

def list_s3_bucket_files(bucket_url):
    """List all files in a public S3 bucket."""
    files = []
    continuation_token = None

    while True:
        url = bucket_url
        if continuation_token:
            url += f'?continuation-token={continuation_token}'

        response = requests.get(url)
        if response.status_code != 200:
            print(f"Error fetching bucket listing: {response.status_code}")
            return files

        # Parse XML response
        root = ElementTree.fromstring(response.content)
        ns = {'s3': 'http://s3.amazonaws.com/doc/2006-03-01/'}

        for content in root.findall('.//s3:Contents', ns):
            key = content.find('s3:Key', ns)
            if key is not None:
                files.append(key.text)

        # Check for continuation
        is_truncated = root.find('.//s3:IsTruncated', ns)
        if is_truncated is not None and is_truncated.text == 'true':
            next_token = root.find('.//s3:NextContinuationToken', ns)
            if next_token is not None:
                continuation_token = next_token.text
            else:
                break
        else:
            break

    return files

def filter_files_by_date(files, pattern, start_year, end_year):
    """Filter files to only include those in the specified date range."""
    filtered = []
    for f in files:
        match = re.search(pattern, f)
        if match:
            date_str = match.group(1)
            try:
                year = int(date_str[:4])
                month = int(date_str[4:6])
                if start_year <= year <= end_year:
                    filtered.append((f, year, month))
            except ValueError:
                continue
    return sorted(filtered, key=lambda x: (x[1], x[2]))

def download_and_extract(bucket_url, filename, output_dir):
    """Download a zip file and extract it."""
    url = f"{bucket_url}/{filename}"
    local_zip = os.path.join(output_dir, filename)

    # Download
    print(f"  Downloading {filename}...", end=' ', flush=True)
    response = requests.get(url, stream=True)
    if response.status_code != 200:
        print(f"FAILED ({response.status_code})")
        return False

    with open(local_zip, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

    # Extract
    try:
        with zipfile.ZipFile(local_zip, 'r') as zip_ref:
            zip_ref.extractall(output_dir)
        os.remove(local_zip)  # Clean up zip file
        print("OK")
        return True
    except zipfile.BadZipFile:
        print("FAILED (bad zip)")
        os.remove(local_zip)
        return False

def download_city_data(city, start_year, end_year, base_dir='rawdata'):
    """Download data for a specific city."""
    config = CITY_CONFIGS[city]
    print(f"\n{'='*60}")
    print(f"Downloading {config['name']} data ({start_year}-{end_year})")
    print('='*60)

    # Create output directory
    output_dir = os.path.join(base_dir, city)
    os.makedirs(output_dir, exist_ok=True)

    # List bucket contents
    print("Fetching file list from S3...")
    files = list_s3_bucket_files(config['bucket_url'])

    # Filter by date range
    filtered = filter_files_by_date(files, config['file_pattern'], start_year, end_year)
    print(f"Found {len(filtered)} files in date range")

    # Download each file
    downloaded = 0
    skipped = 0
    for filename, year, month in filtered:
        # Check if we already have CSV files for this month
        csv_pattern = f"{year}{month:02d}"
        existing_csvs = [f for f in os.listdir(output_dir)
                        if f.endswith('.csv') and csv_pattern in f]

        if existing_csvs:
            print(f"  Skipping {filename} (already have CSVs)")
            skipped += 1
            continue

        if download_and_extract(config['bucket_url'], filename, output_dir):
            downloaded += 1

    print(f"\nCompleted: {downloaded} downloaded, {skipped} skipped")
    return downloaded

def main():
    parser = argparse.ArgumentParser(description='Download recent bike share data')
    parser.add_argument('--start-year', type=int, default=2022,
                        help='Start year (default: 2022)')
    parser.add_argument('--end-year', type=int, default=2025,
                        help='End year (default: 2025)')
    parser.add_argument('--city', choices=['nyc', 'boston', 'sf', 'all'], default='all',
                        help='City to download (default: all)')
    parser.add_argument('--output-dir', default='rawdata',
                        help='Base output directory (default: rawdata)')
    args = parser.parse_args()

    # Change to script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    cities = [args.city] if args.city != 'all' else ['nyc', 'boston', 'sf']

    print(f"Bike Share Data Downloader")
    print(f"Date range: {args.start_year} - {args.end_year}")
    print(f"Cities: {', '.join(cities)}")

    total_downloaded = 0
    for city in cities:
        total_downloaded += download_city_data(city, args.start_year, args.end_year, args.output_dir)

    print(f"\n{'='*60}")
    print(f"Total files downloaded: {total_downloaded}")
    print('='*60)

if __name__ == '__main__':
    main()
