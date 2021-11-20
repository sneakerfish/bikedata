import glob
import pandas as pd
import numpy as np

files = ["stations_by_city_by_month",
         "trip_count_by_city_by_month",
         "average_duration_by_city_by_month"]

def cv_year_mth(val):
    if val == np.nan or val == '':
        return 0 # or whatever else you want to represent your NaN with
    return int(val)


joined  = False
for file in files:
    csvfile = glob.glob(file + ".csv/*.csv")[0]
    df = pd.read_csv(csvfile, converters={'year': cv_year_mth, 'month': cv_year_mth})
    if not joined:
        joined_df = df
        joined = True
    else:
        joined_df = pd.merge(joined_df, df, how='left', left_on=['city', 'month', 'year'], right_on=['city', 'month', 'year'])

joined_df.to_csv('summary_by_city_by_month.csv', index=False)
