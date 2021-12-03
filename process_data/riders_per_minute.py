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
        # Ignore if start is after end or equal to end
        if (start_time >= end_time):
            return

        # Ignore if end_time - start_time > 10 hours
        if (end_time - start_time).seconds > 10 * 60 * 60:
            return

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
        if (day_end - day_start).days > 1:
            day_end = day_start + datetime.timedelta(days=1)  # One day max
        if not (day_start in self.days):
            self.days[day_start] = RidersPerMinute(day_start)
        if not (day_end in self.days):
            self.days[day_end] = RidersPerMinute(day_end)
        if day_start != day_end:
            self.days[day_end].count(start_time, end_time)
        self.days[day_start].count(start_time, end_time)

    def days_counted(self):
        return list(self.days.keys())

    def get_minute(self, day, hour, minute):
        if day in self.days:
            return self.days[day].get_minute(hour, minute)
        else:
            return 0


class RidersPerMinuteDayCity:
    def __init__(self):
        self.cities = {}

    def count(self, city, start_time, end_time):
        if not (city in self.cities):
            self.cities[city] = RidersPerMinuteDay()
        self.cities[city].count(start_time, end_time)

    def cities_counted(self):
        return list(self.cities.keys())

    def days_counted(self, city):
        if city in self.cities_counted():
            return self.cities[city].days_counted()
        else:
            return 0

    def get_minute(self, city, day, hour, minute):
        if city in self.cities:
            return self.cities[city].get_minute(day, hour, minute)
        else:
            return 0


if __name__ == "__main__":
    input_filename = sys.argv[1]
    if not os.path.exists(input_filename):
        print("File {} doesn't exist.".format(input_filename))
        exit(1)

    rpmd = RidersPerMinuteDayCity()
    with open(input_filename) as csvfile:
        csvreader = csv.DictReader(csvfile)
        for row in csvreader:
            city = row["city"]
            start_time = datetime.datetime.fromisoformat(row["trip_start"])
            end_time = datetime.datetime.fromisoformat(row["trip_end"])
            rpmd.count(city, start_time, end_time)

    filename_prefix = os.path.splitext(input_filename)[0]
    output_filename = "{}_output.csv".format(filename_prefix)
    with open(output_filename, "w") as csvfile:
        csvwriter = csv.writer(csvfile)
        csvwriter.writerow(["city", "date", "hour", "minute", "riders"])
        for city in rpmd.cities_counted():
            for dt in rpmd.days_counted(city):
                for hr in range(24):
                    for mn in range(60):
                        csvwriter.writerow([city, dt, hr, mn, rpmd.get_minute(city, dt, hr, mn)])
