# intended to be submitted via pyspark but produce results on the command line.

from pyspark import SparkConf, SparkContext
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType, LongType
from pyspark.sql.functions import expr, col, column, lit, to_date, coalesce, to_timestamp, month
from my_timestamp import to_timestamp_

spark = SparkSession.builder.appName("Sample bike data").getOrCreate()
spark.sql("set spark.sql.legacy.timeParserPolicy=LEGACY")




df = spark.read.load("alldata.parquet")

df2 = df.select(
    'start_station_id',
    'end_station_id',
    'starttime',
    to_timestamp_(col('starttime')).alias('trip_start'),
    'stoptime',
    to_timestamp_(col('stoptime')).alias('trip_end'),
    'city'
)

df2.createOrReplaceTempView("bikedata")

df3 = spark.sql("select sum(case when (start_station_id = end_station_id) then 1 else 0 end) as round_trip_count, " +
                "count(*) as trip_count, year(trip_start) as start_year, month(trip_start) as start_month, city " +
                "from bikedata " +
                "group by city, year(trip_start), month(trip_start)")

df3.createOrReplaceTempView("bikesummary")
df3.show(20, False)

df3.coalesce(1).write.format('com.databricks.spark.csv').save('round_trips_by_month_by_city.csv', header='true')
