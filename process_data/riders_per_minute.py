# Riders per minute
# Take a file of rides for a single city and a single day and produce another
# file with each minute throughout the day and a count of riders.
# The rides table has start and end time and represents a single ride.
# If a ride extends beyond the day, then just count it for each minute remaining.
import datetime, csv, sys, os.path


def parse_date(date):
    import datetime
    return datetime.datetime.strptime(date, "%Y-%m-%d")


class RidersPerMinute:
    def __init__(self, day_to_record):
        # Each day has 60 * 24 = 1440 minutes.  We will be storing an integer counter
        # for each minute.
        self.counter = [0] * 1440;
        self.day_to_record = day_to_record

    def count(self, start_time, end_time):
        if ((datetime.datetime.date(start_time) != self.day_to_record) and
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

        for mn in range(start_at, end_at + 1):
            self.counter[mn] += 1

    def get_minute(self, hour, minute):
        return self.counter[hour * 60 + minute]


class RidersPerMinuteDay:
    def __init__(self):
        self.days = {}

    def count(self, start_time, end_time):
        day_start = datetime.datetime.date(start_time)
        day_end = datetime.datetime.date(end_time)
        if not (day_start in self.days):
            self.days[day_start] = RidersPerMinute(day_start)
        if not (day_end in self.days):
            self.days[day_end] = RidersPerMinute(day_end)
        if day_start != day_end:
            self.days[day_end].count(start_time, end_time)
        self.days[day_start].count(start_time, end_time)

    def days_counted(self):
        print("keys: ", self.days.keys)
        return list(self.days.keys())

    def get_minute(self, day, hour, minute):
        if day in self.days:
            return self.days[day].get_minute(hour, minute)
        else:
            return 0



if __name__ == "__main__":
    input_filename = sys.argv[1]
    if not os.path.exists(input_filename):
        print("File {} doesn't exist.".format(input_filename))
        exit(1)

    rpmd = RidersPerMinuteDay()
    with open(input_filename) as csvfile:
        csvreader = csv.DictReader(csvfile)
        for row in csvreader:
            start_time = datetime.datetime.fromisoformat(row["trip_start"])
            end_time = datetime.datetime.fromisoformat(row["trip_end"])
            rpmd.count(start_time, end_time)

    for dt in rpmd.days_counted():
        filename_prefix = os.path.splitext(input_filename)[0]
        output_filename = "{}_{}{}{}.csv".format(filename_prefix, dt.year, dt.month, dt.day)
        with open(output_filename, "w") as csvfile:
            csvwriter = csv.writer(csvfile)
            csvwriter.writerow(["date", "hour", "minute", "riders"])
            for hr in range(24):
                for mn in range(60):
                    csvwriter.writerow([dt, hr, mn, rpmd.get_minute(hr, mn)])
