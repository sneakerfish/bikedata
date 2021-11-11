from bs4 import BeautifulSoup
import wget, re, zipfile, os

# Use BeautifulSoup to fetch the URL links in the given file
# Note that AWS doesn't let you automatically read an S3 folder
# with urllib.request.  I had to save the HTML from a browser.
def getfiles(file):
    with open(file) as f:
        filedata = f.read()
    soup = BeautifulSoup(filedata, 'html.parser')
    files = []
    for link in soup.find_all('a'):
        files.append(link.get('href'))
    return files

def download_zipfile(url, dir):
    namepat = r"/([^/]*)$"
    zippat = r"\.zip$"
    match = re.search(namepat, url)
    if not match:
        return
    filename = "./zipfiles/" + match.group(1)
    wget.download(url, filename)
    if re.search(zippat, url):
        with zipfile.ZipFile(filename, 'r') as zip_ref:
            zip_ref.extractall('rawdata/' + dir)
    return filename

def download_all(file, dir):
    files = getfiles(file)
    for file in files:
        # Find the name of the unzipped file and see if we have it already.
        csvpat = r"/([^/]*).zip$"
        match = re.search(csvpat, file)
        if match:
            newfile = 'rawdata/' + dir + '/' + match.group(1)
            if os.path.exists(newfile) or os.path.exists(newfile + '.csv'):
                print("{} exists, skipping".format(match.group(1)))
            else:
                print("downloading {}".format(match.group(1)))
                download_zipfile(file, dir)


def check_and_move_alternate_data(city):
    # find CSV files
    city_path = os.path.join("./rawdata", city)
    csv_files = [f for f in os.listdir(city_path) if is_csv_file(city_path, f)]

    print(csv_files)

    # assemble list of files to move
    files_to_move = []
    for csv_file in csv_files:
        city_file_path = os.path.join(city_path, csv_file)
        with open(city_file_path) as f:
            header = f.readline()
            first_column = header.split(",")[0]
            if first_column == "ride_id":
                files_to_move.append(csv_file)

    # create alternate dir if it doesn't exist
    city_alternate_dir_path = os.path.join(city_path, "alternate")
    if not os.path.exists(city_alternate_dir_path):
        os.makedirs(city_alternate_dir_path)

    # move files to alternate dir
    for file_to_move in files_to_move:
        original_file_path = os.path.join(city_path, file_to_move)
        new_file_path = os.path.join(city_alternate_dir_path, file_to_move)
        print('moving', original_file_path, 'to', new_file_path)
        os.rename(original_file_path, new_file_path)


def is_csv_file(path, file):
    file_path = os.path.join(path, file)
    return os.path.isfile(file_path) and str(file_path).endswith(".csv");


if __name__ == "__main__":
    download_all("bostonhubway.html", 'boston')
    download_all("nyctripdata.html", 'nyc')
    download_all("baywheels.html", 'sf')

    cities = ['boston', 'nyc', 'sf']
    [check_and_move_alternate_data(city) for city in cities]
