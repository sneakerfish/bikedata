import glob, csv
import pandas as pd
import numpy as np

files = ["stations_by_city_by_month",
         "trip_count_by_city_by_month",
         "average_duration_by_city_by_month"]

class BikeData:
    def __init__(self):
        self.keys = [(city, year, month) for city in ["boston", "sf", "nyc"]
            for year in range(2018, 2022) for month in range(1, 13)]
        self.data = {}
        self.columns = set()
    def add_data(self, df):
        save_col = df.columns[-1]
        self.columns.add(save_col)
        for row in range(len(df)):
            key = (df.at[row, 'city'], df.at[row, 'year'], df.at[row, 'month'])
            if key in self.keys:
                self.data[key, save_col] = df.at[row, save_col]
    def get(self, city, year, month, col):
        key = (city, year, month)
        if key not in self.keys:
            print("Key not found")
            return 0
        if (key, col) not in self.data:
            print("Column not found: ", col)
            return 0
        return self.data[key, col]
    def field_names(self):
        return ["city", "year", "month"] + list(self.columns)
    def as_dict_rows(self):
        rows = []
        for key in self.keys:
            city, year, month = key
            dict = {'city': city, 'year': year, 'month': month}
            for column in self.columns:
                val = self.get(city, year, month, column)
                dict[column] = val
            rows.append(dict)
        return rows


def cv_year_mth(val):
    if val == np.nan or val == '':
        return 0 # or whatever else you want to represent your NaN with
    return int(val)


data = BikeData()
for file in files:
    csvfile = glob.glob(file + ".csv/*.csv")[0]
    df = pd.read_csv(csvfile, converters={'year': cv_year_mth, 'month': cv_year_mth})
    data.add_data(df)

with open("summary_by_city_by_month.csv", 'w') as csvfile:
    csvwriter = csv.DictWriter(csvfile, data.field_names())
    csvwriter.writeheader()
    for row in data.as_dict_rows():
        csvwriter.writerow(row)

