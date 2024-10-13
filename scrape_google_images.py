from google_images_search import GoogleImagesSearch
import logging
from google.colab import drive
import requests

# Mount Google Drive
drive.mount('/content/drive')

# Set up logging
logging.basicConfig(
    filename='/content/drive/My Drive/scraped_images.log',  # Log file path in Google Drive
    level=logging.INFO,  # Log level
    format='%(asctime)s - %(levelname)s - %(message)s'  # Log format
)
logger = logging.getLogger()

# You need to get these credentials from Google Cloud Console
gis = GoogleImagesSearch('your_dev_api_key', 'your_project_cx')

# Function to scrape Google Images
def scrape_google_images(query, num_images):
    search_url = "https://www.googleapis.com/customsearch/v1"
    params = {
        'q': query,
        'cx': SEARCH_ENGINE_ID,
        'searchType': 'image',
        'key': API_KEY,
        'num': num_images
    }

    response = requests.get(search_url, params=params)
    if response.status_code != 200:
        logger.error(f"Failed to retrieve images: {response.status_code}")
        logger.error(f"Response content: {response.text}")
        return []

    # Define search params
    _search_params = {
        'q': query,
        'num': num_images,
        'fileType': 'jpg|png',
        'rights': 'cc_publicdomain|cc_attribute|cc_sharealike|cc_noncommercial|cc_nonderived'
    }

    # Perform the search
    gis.search(search_params=_search_params)

    # Get the results
    image_urls = []
    for image in gis.results():
        url = image.url
        image_urls.append(url)
        logger.info(f"Added URL: {url}")
        print(f"Added URL: {url}")

    return image_urls

# Scrape scam SMS screenshots from Google Images
scam_sms_images = scrape_google_images("scam sms screenshots", 20)

# Print and log the collected image URLs
output_file_path = '/content/drive/My Drive/scam_sms_images.txt'  # Output file path in Google Drive

with open(output_file_path, 'w') as f:
    for i, img_url in enumerate(scam_sms_images):
        print(f"{i+1}: {img_url}")
        f.write(f"{i+1}: {img_url}\n")  # Save URL to text file
        logger.info(f"{i+1}: {img_url}")  # Log scraped image URLs

# Log a message indicating completion
logger.info("Scraping complete!")
print(f"Scraped image URLs saved to: {output_file_path}")
print("Scraping complete!")