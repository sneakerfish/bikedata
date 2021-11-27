import datetime
from riders_per_minute import RidersPerMinute, RidersPerMinuteDay


class TestRidersPerMinute:
    def test_count_1(self):
        # one rider from 9 to 10
        r = RidersPerMinute(datetime.date(2021, 1, 1))
        r.count(datetime.datetime(2021, 1, 1, 9, 0),
                datetime.datetime(2021, 1, 1, 10, 0))
        assert r.get_minute(9, 0) == 1
        assert r.get_minute(8, 0) == 0
        assert r.get_minute(9, 10) == 1
        assert r.get_minute(10, 0) == 1    # edge case

    def test_count_2(self):
        # two riders, a: 9-10, b: 9:10-10:10
        r = RidersPerMinute(datetime.date(2021, 2, 1))
        r.count(datetime.datetime(2021, 2, 1, 9, 0),
                datetime.datetime(2021, 2, 1, 10, 0))
        r.count(datetime.datetime(2021, 2, 1, 9, 10),
                datetime.datetime(2021, 2, 1, 10, 10))
        assert r.get_minute(9, 0) == 1
        assert r.get_minute(9, 10) == 2
        assert r.get_minute(10, 0) == 2
        assert r.get_minute(10, 5) == 1

    def test_count_3(self):
        # three riders: a: 9-10, b:9-11, c: 9:30-10
        r = RidersPerMinute(datetime.date(2021, 3, 1))
        r.count(datetime.datetime(2021, 3, 1, 9, 0),
                datetime.datetime(2021, 3, 1, 10, 0))
        r.count(datetime.datetime(2021, 3, 1, 9, 0),
                datetime.datetime(2021, 3, 1, 11, 0))
        r.count(datetime.datetime(2021, 3, 1, 9, 30),
                datetime.datetime(2021, 3, 1, 10, 0))
        assert r.get_minute(9, 0) == 2
        assert r.get_minute(9, 30) == 3
        assert r.get_minute(10, 1) == 1

    def test_count_past_midnight(self):
        # One rider from 11pm to 12:05am.
        r = RidersPerMinute(datetime.date(2021, 4, 1))
        r.count(datetime.datetime(2021, 4, 1, 23, 0),
                datetime.datetime(2021, 4, 2, 0, 5))
        assert r.get_minute(0, 1) == 0
        assert r.get_minute(23, 0) == 1
        assert r.get_minute(23, 5) == 1
        assert r.get_minute(23, 59) == 1


class TestRidersPerMinuteDay:
    def test_count_1(self):
        r = RidersPerMinuteDay()
        r.count(datetime.datetime(2021, 1, 1, 23, 0),
                datetime.datetime(2021, 1, 2, 0, 0))
        assert r.days_counted() == [datetime.date(2021, 1, 1), datetime.date(2021, 1, 2)]
        assert r.get_minute(datetime.date(2021, 1, 1), 23, 5) == 1
        assert r.get_minute(datetime.date(2021, 1, 2), 0, 0) == 1

    def test_count_2(self):
        # One rider from 2/1/2021 11-12, another rider from 2/1/2021 23:00-2/2/2021 0:00
        r = RidersPerMinuteDay()
        r.count(datetime.datetime(2021, 2, 1, 11, 0),
                datetime.datetime(2021, 2, 2, 0, 0))
        assert r.days_counted() == [datetime.date(2021, 2, 1), datetime.date(2021, 2, 2)]
        assert r.get_minute(datetime.date(2021, 2, 1), 11, 5) == 1
        assert r.get_minute(datetime.date(2021, 2, 2), 0, 0) == 1

