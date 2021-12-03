# intended to be submitted via pyspark but produce results on the command line.

from pyspark import SparkConf, SparkContext
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType, LongType
from pyspark.sql.functions import expr, col, column, lit

spark = SparkSession.builder.appName("Bike data").getOrCreate()
spark.sql("set spark.sql.legacy.timeParserPolicy=LEGACY")

bikedata_schema = schema = StructType([
  StructField("bikeid", StringType(), False),
  StructField("starttime", StringType(), False),
  StructField("stoptime", StringType(), False),
  StructField("start station id", StringType(), False),
  StructField("start station name", StringType(), False),
  StructField("start station latitude", StringType(), False),
  StructField("start station longitude", StringType(), False),
  StructField("end station id", StringType(), False),
  StructField("end station name", StringType(), False),
  StructField("end station latitude", StringType(), False),
  StructField("end station longitude",StringType(), False),
  ])

alternate_schema = StructType([
  StructField("ride_id", StringType(), False),
  StructField("rideable_type", StringType(), False),
  StructField("started_at", StringType(), False),
  StructField("ended_at", StringType(), False),
  StructField("start_station_name", StringType(), False),
  StructField("start_station_id", StringType(), False),
  StructField("end_station_name", StringType(), False),
  StructField("end_station_id", StringType(), False),
  StructField("start_lat", StringType(), False),
  StructField("start_lng", StringType(), False),
  StructField("end_lat", StringType(), False),
  StructField("end_lng", StringType(), False),
  StructField("member_casual", StringType(), False)
])

ammended_schema = StructType([
  StructField("bikeid", StringType(), False),
  StructField("starttime", StringType(), False),
  StructField("stoptime", StringType(), False),
  StructField("start_station_id", StringType(), False),
  StructField("start_station_name", StringType(), False),
  StructField("start_lat", StringType(), False),
  StructField("start_lng", StringType(), False),
  StructField("end_station_id", StringType(), False),
  StructField("end_station_name", StringType(), False),
  StructField("end_lat", StringType(), False),
  StructField("end_lng", StringType(), False),
  StructField("city", StringType(), False)
  ])

emptyRDD = spark.sparkContext.emptyRDD()
dfunion = spark.createDataFrame(emptyRDD, ammended_schema)

for city in ['boston', 'nyc', 'sf']:
  df = spark.read.option("header", True).csv("rawdata/" + city + "/*.csv", bikedata_schema)
  df = df.withColumn('city', lit(city))\
    .withColumnRenamed('start station id', 'start_station_id')\
    .withColumnRenamed('start station name', 'start_station_name')\
    .withColumnRenamed('start station latitude', 'start_lat')\
    .withColumnRenamed('start station longitude', 'start_lng')\
    .withColumnRenamed('end station id', 'end_station_id')\
    .withColumnRenamed('end station name', 'end_station_name')\
    .withColumnRenamed('end station latitude', 'end_lat')\
    .withColumnRenamed('end station longitude', 'end_lng') \
    .select(col("bikeid"), col("starttime"), col("stoptime"), col("start_station_id"),
            col("start_station_name"), col("start_lat"), col("start_lng"), col("end_station_id"),
            col("end_station_name"), col("end_lat"), col("end_lng"), col("city"))

  dfunion = dfunion.union(df)

for city in ['boston', 'nyc', 'sf']:
  df = spark.read.option("header", True).csv("rawdata/" + city + "/alternate/*.csv", alternate_schema)
  df = df.withColumn('city', lit(city))\
    .drop(col("rideable_type"))\
    .drop(col('member_casual'))\
    .withColumnRenamed("ride_id", "bikeid")\
    .withColumnRenamed("started_at", "starttime")\
    .withColumnRenamed("ended_at", "stoptime")\
    .select(col("bikeid"), col("starttime"), col("stoptime"), col("start_station_id"),
            col("start_station_name"), col("start_lat"), col("start_lng"), col("end_station_id"),
            col("end_station_name"), col("end_lat"), col("end_lng"), col("city"))
  dfunion = dfunion.union(df)

dfunion\
  .coalesce(1)\
  .write\
  .save("alldata.parquet")
