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
    filename = "zipfiles/" + match.group(1)
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

if __name__ == "__main__":
    download_all("bostonhubway.html", 'boston')
    download_all("nyctripdata.html", 'nyc')
    download_all("baywheels.html", 'sf')