# intended to be submitted via pyspark but produce results on the command line.

from pyspark import SparkConf, SparkContext
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType, LongType
from pyspark.sql.functions import expr, col, column, lit, to_date, coalesce, to_timestamp

def to_timestamp_(col, formats=("MM/dd/yyyy HH:mm:ss", "yyyy-MM-dd HH:mm:ss")):
    # Spark 2.2 or later syntax, for < 2.2 use unix_timestamp and cast
    return coalesce(*[to_timestamp(col, f) for f in formats])

spark = SparkSession.builder.appName("Sample bike data").getOrCreate()
spark.sql("set spark.sql.legacy.timeParserPolicy=LEGACY")

df = spark.read.load("alldata.parquet")

df2 = df.select(
    'starttime',
    to_timestamp_(col('starttime')).alias('trip_start'),
    'stoptime',
    to_timestamp_(col('stoptime')).alias('trip_end'),
    'start_station_id',
    'city'
)

df2.createOrReplaceTempView("bikedata")

df3 = spark.sql("select city, year(trip_start) as year, month(trip_start) as month, count(distinct start_station_id) as station_count from bikedata group by city, year(trip_start), month(trip_start)")

df3.show(20, False)

df3.coalesce(1).write.format('com.databricks.spark.csv').save('stations_by_city_by_month.csv', header='true')
