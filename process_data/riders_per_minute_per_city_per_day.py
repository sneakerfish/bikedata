# intended to be submitted via pyspark but produce results on the command line.

from pyspark import SparkConf, SparkContext
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType, LongType
from pyspark.sql.functions import expr, col, column, lit, to_date, coalesce, to_timestamp, month, from_utc_timestamp

spark = SparkSession.builder.appName("Sample bike data").getOrCreate()
spark.sql("set spark.sql.legacy.timeParserPolicy=LEGACY")


def to_timestamp_(col, formats=("MM/dd/yyyy HH:mm:ss", "yyyy-MM-dd HH:mm:ss")):
    # Spark 2.2 or later syntax, for < 2.2 use unix_timestamp and cast
    return coalesce(*[to_timestamp(col, f) for f in formats])


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

df2.withColumn("trip_start_et", from_utc_timestamp(col('trip_start'), 'America/New_York'))\
    .withColumn("trip_start_wt", from_utc_timestamp(col('trip_start'), 'America/Los_Angeles'))\
    .withColumn("trip_end_et", from_utc_timestamp(col('trip_end'), 'America/New_York'))\
    .withColumn("trip_end_wt", from_utc_timestamp(col('trip_end'), 'America/Los_Angeles'))\
    .createOrReplaceTempView("bikedata")

df3 = spark.sql("select city, end_station_id, trip_start_et as trip_start, trip_end_et as trip_end " +
                "from bikedata " +
                "where date(trip_start) >= '2021-07-01' and date(trip_start) <= '2021-08-01'")

df3.show(20, False)

df3.coalesce(1).write.partitionBy("city").format('com.databricks.spark.csv').save('all_trips_by_date.csv', header='true')
