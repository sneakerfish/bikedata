# intended to be submitted via pyspark but produce results on the command line.

from pyspark import SparkConf, SparkContext
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType, LongType
from pyspark.sql.functions import expr, col, column, lit, to_date, coalesce, to_timestamp
from graphframes import GraphFrame

spark = SparkSession.builder.appName("Sample bike data").getOrCreate()
spark.sql("set spark.sql.legacy.timeParserPolicy=LEGACY")

df = spark.read.load("alldata.parquet")


df.createOrReplaceTempView("bikedata")

df2 = spark.sql("select distinct start_station_id, end_station_id,  count(*) as trip_count, city from bikedata group by city, start_station_id, end_station_id having trip_count > 10 order by trip_count desc")

df2.show(20, False)

df2.coalesce(1).write.format('com.databricks.spark.csv').save('trips_by_trip_count.csv', header='true')
