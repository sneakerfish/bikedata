# intended to be submitted via pyspark but produce results on the command line.

from pyspark import SparkConf, SparkContext
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType, LongType
from pyspark.sql.functions import expr, col, column, lit, to_date, coalesce, to_timestamp
from graphframes import GraphFrame

from my_timestamp import to_timestamp_

spark = SparkSession.builder.appName("Sample bike data").getOrCreate()
spark.sql("set spark.sql.legacy.timeParserPolicy=LEGACY")

df = spark.read.load("alldata.parquet")


df.createOrReplaceTempView("bikedata")

df2 = spark.sql("select distinct(start_station_id), start_station_name, start_lat, start_lng, count(*) as trip_count, city from bikedata group by city, start_station_id, start_station_name")

df2.show(20, False)

df2.coalesce(1).write.format('com.databricks.spark.csv').save('stations.csv', header='true')
