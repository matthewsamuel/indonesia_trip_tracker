import os
import urllib.request

# Directory to save images
img_dir = '/Users/matthewsamuel1/Documents/indonesia/images'
os.makedirs(img_dir, exist_ok=True)

DEFAULT_PHOTOS = {
  "t1": [
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500&auto=format&fit=crop"
  ],
  "t2": [
    "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1506970189531-d55a77109263?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop"
  ],
  "t3": [
    "https://images.unsplash.com/photo-1483450388369-9ed95738483c?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1559863345-02eae058c2c2?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&auto=format&fit=crop"
  ],
  "t4": [
    "https://images.unsplash.com/photo-1546548970-71785318a17b?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1448375240586-882707db888b?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop"
  ],
  "t5": [
    "https://images.unsplash.com/photo-1616128417859-3a984dd35f02?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=500&auto=format&fit=crop"
  ],
  "t6": [
    "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555581398-23f46f481062?w=500&auto=format&fit=crop"
  ],
  "t7": [
    "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c27e?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500&auto=format&fit=crop"
  ],
  "t8: [": [
    "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1604999333679-b86d54738315?w=500&auto=format&fit=crop"
  ],
  "t9": [
    "https://images.unsplash.com/photo-1584810359583-96fc3448beaa?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1604999333736-6ec41e127398?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=500&auto=format&fit=crop"
  ],
  "t10": [
    "https://images.unsplash.com/photo-1599930113854-d6d7fd521f10?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&auto=format&fit=crop"
  ],
  "t11": [
    "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop"
  ],
  "t12": [
    "https://images.unsplash.com/photo-1420142515034-86cc8c508475?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1508873696983-2df519f0397e?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=500&auto=format&fit=crop"
  ],
  "t13": [
    "https://images.unsplash.com/photo-1555058170-94d5f5016a2c?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&auto=format&fit=crop"
  ],
  "t14": [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1498036882173-b41c28a8ba34?w=500&auto=format&fit=crop"
  ],
  "t15": [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1534080391025-472b9ec08b05?w=500&auto=format&fit=crop"
  ],
  "t16": [
    "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500&auto=format&fit=crop"
  ],
  "t17": [
    "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518235506717-e1ed3306a89b?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&auto=format&fit=crop"
  ],
  "t18": [
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=500&auto=format&fit=crop"
  ],
  "t19": [
    "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1473116763269-25541579ffb7?w=500&auto=format&fit=crop"
  ],
  "t20": [
    "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop"
  ],
  "t21": [
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop"
  ],
  "t22": [
    "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?w=500&auto=format&fit=crop"
  ],
  "t23": [
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&auto=format&fit=crop"
  ]
}

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for key, urls in DEFAULT_PHOTOS.items():
    for idx, url in enumerate(urls):
        filename = f"{key}_{idx}.jpg"
        filepath = os.path.join(img_dir, filename)
        print(f"Downloading {url} to {filepath}...")
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as response:
                with open(filepath, 'wb') as f:
                    f.write(response.read())
        except Exception as e:
            print(f"Error downloading {url}: {e}")

print("All downloads complete.")
