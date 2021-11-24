# Riders per minute
# Take a file of rides for a single city and a single day and produce another
# file with each minute throughout the day and a count of riders.
# The rides table has start and end time and represents a single ride.
# If a ride extends beyond the day, then just count it for each minute remaining.
import datetime, csv, sys, os.path

class RidesPerMinute:
    def __init__(self, day_to_record):
        # Each day has 60 * 24 = 1440 minutes.  We will be storing an integer counter
        # for each minute.
        self.counter = [0] * 1440;
        self.day_to_record = day_to_record

    def count(self, start_time, end_time):
        if ((datetime.datetime.date(start_time) != self.day_to_record) or
                (datetime.datetime.date(end_time) != self.day_to_record)):
            return
        if datetime.datetime.date(start_time) < self.day_to_record:
            start_at = 0
        else:
            start_at = start_time.hour * 60 + start_time.minute

        if datetime.datetime.date(end_time) > self.day_to_record:
            end_at = 23 * 60 + 59
        else:
            end_at = end_time.hour * 60 + end_time.minute
        for min in range(start_at, end_at):
            self.counter[min] += 1

    def get_minute(self, hour, minute):
        return self.counter[hour * 60 + minute]



if __name__ == "__main__":
    input_filename = sys.argv[1]
    date_to_record = sys.argv[2]
    output_filename = sys.argv[3]
    if not os.path.exists(input_filename):
        print("File {} doesn't exist.".format(input_filename))
        exit(1)
    try:
        date_to_record = datetime.datetime.date(datetime.datetime.strptime(date_to_record, "%Y-%m-%d"))
    except:
        print("Date should be formatted like: YYYY-mm-dd")
        exit(1)
    rpm = RidesPerMinute(date_to_record)
    with open(input_filename) as csvfile:
        csvreader = csv.DictReader(csvfile)
        for row in csvreader:
            start_time = datetime.datetime.fromisoformat(row["trip_start"])
            end_time = datetime.datetime.fromisoformat(row["trip_end"])
            rpm.count(start_time, end_time)

    with open(output_filename, "w") as csvfile:
        csvwriter = csv.writer(csvfile)
        csvwriter.writerow(["date", "hour", "minute", "riders"])
        for hr in range(24):
            for min in range(60):
                csvwriter.writerow([date_to_record, hr, min, rpm.get_minute(hr, min)])
